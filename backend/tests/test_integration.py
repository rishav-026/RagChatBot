import pytest
import io
from unittest.mock import patch, MagicMock
from app.rag.ingestion.extractors import DocumentExtractorFactory
from app.rag.chunking.text_chunker import RecursiveTextChunker
from app.rag.embeddings.service import EmbeddingService
from app.rag.generation.prompt import build_rag_prompt
from app.rag.retrieval.service import RetrievedChunk

def test_full_rag_pipeline_flow():
    # 1. Simulate Document Ingestion (TXT)
    raw_content = b"Company Policy Document:\n\nEmployees receive 25 vacation days per year. Remote work is permitted on Mondays and Fridays."
    filename = "policy.txt"

    extracted = DocumentExtractorFactory.extract(raw_content, filename)
    assert extracted.full_text != ""

    # 2. Chunking
    chunker = RecursiveTextChunker(chunk_size_tokens=50, chunk_overlap_tokens=10)
    chunks = chunker.chunk_document(extracted.pages, {"filename": filename})
    assert len(chunks) >= 1

    # 3. Embedding
    embedding_service = EmbeddingService()
    embeddings = embedding_service.embed_document_chunks([c.content for c in chunks])
    assert len(embeddings) == len(chunks)
    assert len(embeddings[0]) == 384

    # 4. Query Embedding
    query = "How many vacation days do employees receive?"
    query_vec = embedding_service.embed_query(query)
    assert len(query_vec) == 384

    # 5. Simulate Retrieval output
    retrieved = [
        RetrievedChunk(
            chunk_id="chunk-123",
            document_id="doc-456",
            filename=filename,
            content=chunks[0].content,
            page_number=chunks[0].page_number,
            chunk_index=0,
            score=0.91
        )
    ]

    # 6. Prompt Construction
    prompt = build_rag_prompt(query, retrieved)
    assert "25 vacation days" in prompt
    assert "policy.txt" in prompt
