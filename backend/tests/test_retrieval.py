import pytest
import uuid
from unittest.mock import MagicMock
from app.rag.retrieval.service import RetrievalService

def test_retrieval_service_mock():
    mock_embedding_service = MagicMock()
    mock_embedding_service.embed_query.return_value = [0.1] * 384

    mock_reranker_service = MagicMock()
    mock_reranker_service.rerank.side_effect = lambda query, chunks, top_k: chunks[:top_k]

    service = RetrievalService(
        embedding_service=mock_embedding_service,
        reranker_service=mock_reranker_service
    )

    mock_db = MagicMock()
    chunk_id = uuid.uuid4()
    doc_id = uuid.uuid4()

    mock_chunk = MagicMock()
    mock_chunk.id = chunk_id
    mock_chunk.document_id = doc_id
    mock_chunk.content = "Sample retrieved context content."
    mock_chunk.page_number = 1
    mock_chunk.chunk_index = 0
    mock_chunk.metadata_ = {"key": "val"}

    # Mock execute returns: (DocumentChunkModel, filename, v_score)
    mock_db.execute.return_value.all.return_value = [
        (mock_chunk, "guide.pdf", 0.895)
    ]

    retrieved = service.retrieve(mock_db, "Tell me about guide", top_k=1)

    assert len(retrieved) == 1
    assert retrieved[0].filename == "guide.pdf"
    assert retrieved[0].vector_score == 0.895
    assert retrieved[0].content == "Sample retrieved context content."
    assert retrieved[0].page_number == 1
