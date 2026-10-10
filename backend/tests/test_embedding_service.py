import pytest
from app.rag.embeddings.service import EmbeddingService
from app.config import settings

def test_embedding_service_dimensions():
    service = EmbeddingService()
    
    # Test query embedding
    query_vec = service.embed_query("What is machine learning?")
    assert isinstance(query_vec, list)
    assert len(query_vec) == settings.EMBEDDING_DIMENSION

    # Test chunk embedding
    chunks = ["Machine learning is a subset of AI.", "Deep learning uses neural networks."]
    embeddings = service.embed_document_chunks(chunks)
    assert isinstance(embeddings, list)
    assert len(embeddings) == 2
    assert len(embeddings[0]) == settings.EMBEDDING_DIMENSION
    assert len(embeddings[1]) == settings.EMBEDDING_DIMENSION

def test_embedding_service_empty_query():
    service = EmbeddingService()
    with pytest.raises(ValueError):
        service.embed_query("")
