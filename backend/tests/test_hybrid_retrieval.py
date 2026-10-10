import pytest
from unittest.mock import MagicMock
from app.rag.retrieval.service import RetrievalService, RetrievedChunk

def test_hybrid_retrieval_fusion():
    mock_embedding = MagicMock()
    mock_embedding.embed_query.return_value = [0.1] * 384
    mock_reranker = MagicMock()
    
    # Reranker returns inputs with updated reranker scores
    def mock_rerank(query, chunks, top_k):
        for idx, c in enumerate(chunks):
            c.reranker_score = 0.85 - (idx * 0.1)
            c.score = c.reranker_score
        return chunks[:top_k]

    mock_reranker.rerank.side_effect = mock_rerank

    service = RetrievalService(embedding_service=mock_embedding, reranker_service=mock_reranker)
    
    mock_db = MagicMock()
    mock_chunk = MagicMock()
    mock_chunk.id = "c1"
    mock_chunk.document_id = "d1"
    mock_chunk.content = "Hybrid search test content."
    mock_chunk.page_number = 1
    mock_chunk.chunk_index = 0
    mock_chunk.metadata_ = {}

    mock_db.execute.return_value.all.return_value = [
        (mock_chunk, "policy.pdf", 0.90)
    ]

    results = service.retrieve(mock_db, "policy", initial_k=5, top_k=2)
    assert len(results) > 0
    assert hasattr(results[0], "vector_score")
    assert hasattr(results[0], "keyword_score")
    assert hasattr(results[0], "reranker_score")
