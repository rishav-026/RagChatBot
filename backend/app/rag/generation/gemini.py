from typing import Optional, Tuple
from app.rag.generation.base import BaseLLMService
from app.rag.generation.llm_service import LLMService
from app.rag.generation.providers.gemini_provider import GeminiProviderError

# Alias for backward compatibility with Phase 1
MissingAPIKeyError = GeminiProviderError
GeminiGenerationError = GeminiProviderError

class GeminiLLMService(BaseLLMService):
    """
    Phase 2 LLM Service wrapping Multi-Provider Fallback engine.
    """
    def __init__(self, api_key: Optional[str] = None, model_name: Optional[str] = None):
        self.llm_service = LLMService()

    def generate(self, prompt: str) -> str:
        answer, _ = self.llm_service.generate(prompt)
        return answer

    def generate_with_provider(self, prompt: str) -> Tuple[str, str]:
        return self.llm_service.generate(prompt)
