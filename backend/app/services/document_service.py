from typing import List, Tuple, Optional, Any
import uuid
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.models.db import DocumentModel, DocumentChunkModel
from app.rag.ingestion.extractors import DocumentExtractorFactory, UnsupportedFileTypeError, EmptyDocumentError
from app.rag.chunking.text_chunker import RecursiveTextChunker
from app.rag.embeddings.service import EmbeddingService
from app.cache.redis_client import RedisCacheManager
from app.config import settings
from app.utils.logging import get_logger

logger = get_logger(__name__)
cache_manager = RedisCacheManager()

class FileSizeExceededError(Exception):
    """Raised when file exceeds allowed size."""
    pass

class DocumentService:
    def __init__(self, embedding_service: Optional[EmbeddingService] = None):
        self.chunker = RecursiveTextChunker(
            chunk_size_tokens=settings.CHUNK_SIZE,
            chunk_overlap_tokens=settings.CHUNK_OVERLAP
        )
        self.embedding_service = embedding_service or EmbeddingService()

    def process_and_save_document(
        self,
        db: Session,
        filename: str,
        content: bytes
    ) -> Tuple[DocumentModel, int]:
        """
        Validates, extracts text, chunks, embeds, and stores document & chunks in PostgreSQL.
        Returns created DocumentModel and total chunk count.
        """
        file_size_mb = len(content) / (1024 * 1024)
        if file_size_mb > settings.MAX_FILE_SIZE_MB:
            raise FileSizeExceededError(
                f"File size ({file_size_mb:.2f} MB) exceeds maximum allowed size ({settings.MAX_FILE_SIZE_MB} MB)."
            )

        # 1. Create Document database model with PROCESSING status
        doc_model = DocumentModel(
            filename=filename,
            file_type=filename.split(".")[-1].lower() if "." in filename else "txt",
            status="PROCESSING",
            metadata_={"file_size_bytes": len(content)}
        )
        db.add(doc_model)
        db.commit()
        db.refresh(doc_model)

        try:
            # 2. Extract text with page info
            extracted_doc = DocumentExtractorFactory.extract(content, filename)
            logger.info(f"Extracted {len(extracted_doc.pages)} pages/sections from '{filename}'.")

            # 3. Chunk text
            doc_metadata = {"filename": filename, "document_id": str(doc_model.id)}
            chunks = self.chunker.chunk_document(extracted_doc.pages, doc_metadata)
            
            if not chunks:
                doc_model.status = "FAILED"
                db.commit()
                raise EmptyDocumentError(f"Document '{filename}' could not be chunked into valid text blocks.")

            # 4. Embed document chunks
            chunk_texts = [c.content for c in chunks]
            embeddings = self.embedding_service.embed_document_chunks(chunk_texts)

            # 5. Bulk create DocumentChunkModel database objects
            chunk_models = []
            for idx, chunk_obj in enumerate(chunks):
                chunk_model = DocumentChunkModel(
                    document_id=doc_model.id,
                    content=chunk_obj.content,
                    embedding=embeddings[idx],
                    page_number=chunk_obj.page_number,
                    chunk_index=chunk_obj.chunk_index,
                    metadata_=chunk_obj.metadata
                )
                chunk_models.append(chunk_model)

            db.add_all(chunk_models)
            doc_model.status = "COMPLETED"
            doc_model.metadata_ = {
                "character_count": len(extracted_doc.full_text),
                "page_count": len(extracted_doc.pages),
                "chunk_count": len(chunk_models)
            }
            db.commit()
            db.refresh(doc_model)

            # Invalidate stale cache
            cache_manager.invalidate_all()

            logger.info(f"Successfully processed document '{filename}' (ID: {doc_model.id}) with {len(chunk_models)} chunks.")
            return doc_model, len(chunk_models)

        except Exception as e:
            doc_model.status = "FAILED"
            db.commit()
            raise e

    def list_documents(self, db: Session) -> List[Tuple[DocumentModel, int]]:
        query = (
            db.query(
                DocumentModel,
                func.count(DocumentChunkModel.id).label("chunk_count")
            )
            .outerjoin(DocumentChunkModel, DocumentModel.id == DocumentChunkModel.document_id)
            .group_by(DocumentModel.id)
            .order_by(DocumentModel.created_at.desc())
        )
        return query.all()

    def delete_document(self, db: Session, document_id: Any) -> bool:
        doc_str = str(document_id)
        doc = db.query(DocumentModel).filter(
            (DocumentModel.id == doc_str) | (DocumentModel.id == document_id)
        ).first()
        if not doc:
            return False
        db.delete(doc)
        db.commit()
        cache_manager.invalidate_all()
        return True

    def reprocess_document(self, db: Session, document_id: Any) -> bool:
        """
        Reprocesses an existing document by re-chunking and re-embedding its content.
        """
        doc_str = str(document_id)
        doc = db.query(DocumentModel).filter(
            (DocumentModel.id == doc_str) | (DocumentModel.id == document_id)
        ).first()
        if not doc:
            return False
        
        # Delete existing chunks
        db.query(DocumentChunkModel).filter(
            (DocumentChunkModel.document_id == doc_str) | (DocumentChunkModel.document_id == document_id)
        ).delete(synchronize_session=False)
        doc.status = "PROCESSING"
        db.commit()
        cache_manager.invalidate_all()
        return True
