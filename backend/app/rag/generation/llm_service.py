from typing import Generator, Tuple, Optional
from app.rag.generation.providers.gemini_provider import GeminiProvider, GeminiProviderError
from app.rag.generation.providers.groq_provider import GroqProvider, GroqProviderError
from app.utils.logging import get_logger

logger = get_logger(__name__)

class LLMService:
    """
    Orchestrates primary (Gemini 2.5 Flash) and fallback (Groq llama-3.3-70b) LLM providers.
    Automatically handles rate limits, quota issues, or transient 5xx API failures.
    """

    def __init__(
        self,
        primary_provider: Optional[GeminiProvider] = None,
        fallback_provider: Optional[GroqProvider] = None
    ):
        self.primary = primary_provider or GeminiProvider()
        self.fallback = fallback_provider or GroqProvider()

    def generate(self, prompt: str) -> Tuple[str, str]:
        """
        Attempts generation with Gemini first. On provider error/quota limit,
        falls back to Groq provider. Returns tuple of (response_text, provider_name).
        """
        try:
            logger.info(f"Attempting response generation with primary provider: {self.primary.provider_name}")
            result = self.primary.generate(prompt)
            return result, self.primary.provider_name
        except Exception as primary_err:
            logger.warning(
                f"Primary provider '{self.primary.provider_name}' failed ({primary_err}). "
                f"Triggering fallback to '{self.fallback.provider_name}'..."
            )
            try:
                result = self.fallback.generate(prompt)
                return result, self.fallback.provider_name
            except Exception as fallback_err:
                logger.error(f"Fallback provider '{self.fallback.provider_name}' also failed: {fallback_err}")
                raise RuntimeError(
                    f"All LLM providers failed. Primary error: {primary_err}. Fallback error: {fallback_err}"
                )

    def generate_stream(self, prompt: str) -> Tuple[Generator[str, None, None], str]:
        """
        Attempts streaming with Gemini first. On provider failure (initial or mid-stream),
        transparently falls back to Groq provider. Returns tuple of (token_generator, provider_name).
        """
        logger.info(f"Attempting response streaming with primary provider: {self.primary.provider_name}")

        def resilient_stream_generator():
            try:
                for token in self.primary.generate_stream(prompt):
                    yield token
            except Exception as primary_err:
                logger.warning(
                    f"Primary streaming provider '{self.primary.provider_name}' failed ({primary_err}). "
                    f"Triggering streaming fallback to '{self.fallback.provider_name}'..."
                )
                try:
                    for token in self.fallback.generate_stream(prompt):
                        yield token
                except Exception as fallback_err:
                    logger.error(f"Fallback streaming provider '{self.fallback.provider_name}' also failed: {fallback_err}")
                    raise RuntimeError(
                        f"All streaming LLM providers failed. Primary error: {primary_err}. Fallback error: {fallback_err}"
                    )

        return resilient_stream_generator(), self.primary.provider_name
