import uuid
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, status, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List

from app.database.session import get_db
from app.schemas.document import DocumentUploadResponse, DocumentListResponse, DocumentItem
from app.services.document_service import DocumentService, FileSizeExceededError
from app.rag.ingestion.extractors import UnsupportedFileTypeError, EmptyDocumentError, DocumentExtractionError
from app.utils.logging import get_logger

logger = get_logger(__name__)
router = APIRouter(prefix="/documents", tags=["Documents"])

document_service = DocumentService()

@router.post("/upload", response_model=DocumentUploadResponse, status_code=status.HTTP_201_CREATED)
async def upload_document(
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """
    Upload and process a document (PDF, TXT, or DOCX).
    Extracts text, chunks, embeds, and stores vector embeddings in PostgreSQL pgvector.
    Invalidates stale cache automatically.
    """
    if not file.filename:
        raise HTTPException(status_code=400, detail="Uploaded file must have a valid filename.")

    logger.info(f"Received document upload request for '{file.filename}'.")

    try:
        content = await file.read()
        doc_model, chunk_count = document_service.process_and_save_document(
            db=db,
            filename=file.filename,
            content=content
        )

        return DocumentUploadResponse(
            id=doc_model.id,
            filename=doc_model.filename,
            file_type=doc_model.file_type,
            status=doc_model.status,
            chunk_count=chunk_count,
            message=f"Successfully processed and indexed {chunk_count} chunks from '{file.filename}'."
        )

    except UnsupportedFileTypeError as e:
        logger.warning(f"Unsupported file type for '{file.filename}': {e}")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

    except FileSizeExceededError as e:
        logger.warning(f"File size limit exceeded for '{file.filename}': {e}")
        raise HTTPException(status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, detail=str(e))

    except EmptyDocumentError as e:
        logger.warning(f"Empty document '{file.filename}': {e}")
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(e))

    except DocumentExtractionError as e:
        logger.error(f"Document extraction error for '{file.filename}': {e}")
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(e))

    except Exception as e:
        logger.error(f"Unexpected error processing document '{file.filename}': {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred while processing the document. Please try again."
        )

@router.get("", response_model=DocumentListResponse)
def list_documents(db: Session = Depends(get_db)):
    """
    List all uploaded documents and their processing status.
    """
    try:
        doc_rows = document_service.list_documents(db)
        items = [
            DocumentItem(
                id=doc.id,
                filename=doc.filename,
                file_type=doc.file_type,
                status=doc.status or "COMPLETED",
                created_at=doc.created_at,
                chunk_count=count,
                metadata=doc.metadata_ or {}
            )
            for doc, count in doc_rows
        ]
        return DocumentListResponse(documents=items)
    except Exception as e:
        logger.error(f"Failed to fetch document list: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve documents.")

@router.post("/{document_id}/reprocess")
def reprocess_document(document_id: str, db: Session = Depends(get_db)):
    """
    Reprocess an existing document, re-chunking and re-embedding its text.
    """
    success = document_service.reprocess_document(db, document_id)
    if not success:
        raise HTTPException(status_code=404, detail="Document not found.")
    return {"message": "Document marked for reprocessing and cache invalidated."}

@router.delete("/{document_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_document(document_id: str, db: Session = Depends(get_db)):
    """
    Delete a document and all associated chunks, invalidating cache.
    """
    success = document_service.delete_document(db, document_id)
    if not success:
        raise HTTPException(status_code=404, detail="Document not found.")
    return None
