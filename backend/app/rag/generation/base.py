from abc import ABC, abstractmethod
from typing import Generator, Tuple

class BaseLLMProvider(ABC):
    """
    Abstract Base Class for LLM Providers (Gemini, Groq, Anthropic, etc.).
    """

    @property
    @abstractmethod
    def provider_name(self) -> str:
        """Returns human-readable name of provider and model."""
        pass

    @abstractmethod
    def generate(self, prompt: str) -> str:
        """Generates full text completion."""
        pass

    @abstractmethod
    def generate_stream(self, prompt: str) -> Generator[str, None, None]:
        """Yields text tokens progressively for streaming."""
        pass
