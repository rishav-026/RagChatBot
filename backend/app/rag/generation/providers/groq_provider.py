from typing import Generator, Optional
from app.rag.generation.base import BaseLLMProvider
from app.config import settings
from app.utils.logging import get_logger

logger = get_logger(__name__)

class GroqProviderError(Exception):
    """Raised when Groq fallback generation fails."""
    pass

class GroqProvider(BaseLLMProvider):
    def __init__(self, api_key: Optional[str] = None, model_name: Optional[str] = None):
        self.api_key = api_key or settings.GROQ_API_KEY
        self.model_name = model_name or settings.GROQ_MODEL
        self._client = None

    @property
    def provider_name(self) -> str:
        return f"Groq ({self.model_name})"

    def _get_client(self):
        if self._client is not None:
            return self._client

        if not self.api_key or self.api_key == "your_groq_api_key_here":
            raise GroqProviderError("GROQ_API_KEY is not configured on the server.")

        try:
            from groq import Groq
            self._client = Groq(api_key=self.api_key)
            return self._client
        except Exception as e:
            raise GroqProviderError(f"Failed to initialize Groq client: {e}")

    def generate(self, prompt: str) -> str:
        client = self._get_client()
        try:
            response = client.chat.completions.create(
                model=self.model_name,
                messages=[{"role": "user", "content": prompt}],
                temperature=0.2,
            )
            return response.choices[0].message.content or "No response generated."
        except Exception as e:
            logger.error(f"Groq generation error: {e}")
            raise GroqProviderError(f"Groq request failed: {e}")

    def generate_stream(self, prompt: str) -> Generator[str, None, None]:
        client = self._get_client()
        try:
            stream = client.chat.completions.create(
                model=self.model_name,
                messages=[{"role": "user", "content": prompt}],
                temperature=0.2,
                stream=True
            )
            for chunk in stream:
                content = chunk.choices[0].delta.content
                if content:
                    yield content
        except Exception as e:
            logger.error(f"Groq streaming error: {e}")
            raise GroqProviderError(f"Groq streaming request failed: {e}")
