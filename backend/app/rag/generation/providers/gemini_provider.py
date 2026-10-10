from typing import Generator, Optional
from app.rag.generation.base import BaseLLMProvider
from app.config import settings
from app.utils.logging import get_logger

logger = get_logger(__name__)

class GeminiProviderError(Exception):
    """Raised when Gemini generation or streaming fails."""
    pass

class GeminiProvider(BaseLLMProvider):
    def __init__(self, api_key: Optional[str] = None, model_name: Optional[str] = None):
        self.api_key = api_key or settings.GEMINI_API_KEY
        self.model_name = model_name or settings.GEMINI_MODEL
        self._client = None

    @property
    def provider_name(self) -> str:
        return f"Gemini ({self.model_name})"

    def _get_client(self):
        if self._client is not None:
            return self._client

        if not self.api_key or self.api_key == "your_gemini_api_key_here":
            raise GeminiProviderError("GEMINI_API_KEY is not configured.")

        try:
            from google import genai
            self._client = genai.Client(api_key=self.api_key)
            self._sdk_type = "google-genai"
            return self._client
        except ImportError:
            try:
                import google.generativeai as genai
                genai.configure(api_key=self.api_key)
                self._client = genai.GenerativeModel(self.model_name)
                self._sdk_type = "google-generativeai"
                return self._client
            except Exception as e:
                raise GeminiProviderError(f"Failed to initialize Gemini client: {e}")

    def generate(self, prompt: str) -> str:
        client = self._get_client()
        try:
            if hasattr(self, "_sdk_type") and self._sdk_type == "google-genai":
                response = client.models.generate_content(
                    model=self.model_name,
                    contents=prompt
                )
                return response.text if response and response.text else "No response generated."
            else:
                response = client.generate_content(prompt)
                return response.text if response and response.text else "No response generated."
        except Exception as e:
            logger.error(f"Gemini generation error: {e}")
            raise GeminiProviderError(f"Gemini request failed: {e}")

    def generate_stream(self, prompt: str) -> Generator[str, None, None]:
        client = self._get_client()
        try:
            if hasattr(self, "_sdk_type") and self._sdk_type == "google-genai":
                response = client.models.generate_content_stream(
                    model=self.model_name,
                    contents=prompt
                )
                for chunk in response:
                    if chunk.text:
                        yield chunk.text
            else:
                response = client.generate_content(prompt, stream=True)
                for chunk in response:
                    if chunk.text:
                        yield chunk.text
        except Exception as e:
            logger.error(f"Gemini streaming error: {e}")
            raise GeminiProviderError(f"Gemini streaming request failed: {e}")
