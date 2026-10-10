import pytest
from unittest.mock import MagicMock
from app.rag.generation.llm_service import LLMService

def test_multi_provider_fallback():
    mock_primary = MagicMock()
    mock_primary.provider_name = "Gemini (gemini-2.5-flash)"
    mock_primary.generate.side_effect = Exception("503 Service Unavailable / Quota Exceeded")

    mock_fallback = MagicMock()
    mock_fallback.provider_name = "Groq (llama-3.3-70b-versatile)"
    mock_fallback.generate.return_value = "Answer generated via Groq fallback."

    service = LLMService(primary_provider=mock_primary, fallback_provider=mock_fallback)

    answer, provider_used = service.generate("What is RAG?")
    assert answer == "Answer generated via Groq fallback."
    assert provider_used == "Groq (llama-3.3-70b-versatile)"
    mock_primary.generate.assert_called_once()
    mock_fallback.generate.assert_called_once()
