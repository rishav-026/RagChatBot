import pytest
from app.rag.generation.prompt import build_rag_prompt
from app.rag.retrieval.service import RetrievedChunk

def test_prompt_construction_with_chunks():
    chunks = [
        RetrievedChunk(
            chunk_id="c1",
            document_id="d1",
            filename="policy.pdf",
            content="Employees get 20 days of paid leave.",
            page_number=5,
            chunk_index=0,
            score=0.92
        )
    ]
    query = "How many leave days do employees get?"
    prompt = build_rag_prompt(query, chunks)

    assert "STRICT OPERATIONAL RULES" in prompt
    assert "policy.pdf" in prompt
    assert "Page 5" in prompt
    assert "Employees get 20 days of paid leave." in prompt
    assert "USER QUESTION: How many leave days do employees get?" in prompt

def test_prompt_construction_empty_chunks():
    prompt = build_rag_prompt("What is quantum computing?", [])

    assert "No relevant context fragments were found in the document index." in prompt
    assert "USER QUESTION: What is quantum computing?" in prompt
