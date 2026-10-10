import re
from typing import Optional
from pydantic import BaseModel

class InputGuardrailResult(BaseModel):
    allowed: bool
    reason: str
    category: str  # 'valid', 'empty', 'length_exceeded', 'prompt_injection', 'malicious'
    confidence: float = 1.0

class InputGuardrailService:
    """
    Deterministic input guardrail to protect RAG pipeline against empty inputs,
    length overflow, and prompt injection/jailbreak attempts.
    """

    # Common prompt injection & system prompt extraction regex patterns
    INJECTION_PATTERNS = [
        r"(?i)ignore\s+(all\s+)?(previous|prior|above)\s+(instructions|prompts|rules)",
        r"(?i)disregard\s+(all\s+)?(previous|prior|system)\s+(directives|rules|instructions)",
        r"(?i)reveal\s+(the\s+)?(system\s+prompt|developer\s+mode|instructions)",
        r"(?i)print\s+(the\s+)?(system\s+prompt|above\s+text|initial\s+prompt)",
        r"(?i)you\s+are\s+now\s+in\s+dan\s+mode",
        r"(?i)jailbreak",
        r"(?i)bypass\s+all\s+(filters|rules|safety)",
        r"(?i)show\s+me\s+your\s+(system|hidden)\s+instructions",
    ]

    def __init__(self, max_length: int = 2000):
        self.max_length = max_length

    def validate(self, text: str) -> InputGuardrailResult:
        if not text or not text.strip():
            return InputGuardrailResult(
                allowed=False,
                reason="Input query cannot be empty.",
                category="empty",
                confidence=1.0
            )

        trimmed = text.strip()

        if len(trimmed) > self.max_length:
            return InputGuardrailResult(
                allowed=False,
                reason=f"Query exceeds maximum character limit of {self.max_length} characters.",
                category="length_exceeded",
                confidence=1.0
            )

        # Check prompt injection patterns
        for pattern in self.INJECTION_PATTERNS:
            if re.search(pattern, trimmed):
                return InputGuardrailResult(
                    allowed=False,
                    reason="Security Violation: Input contains prohibited prompt injection or system extraction attempt.",
                    category="prompt_injection",
                    confidence=0.95
                )

        return InputGuardrailResult(
            allowed=True,
            reason="Input passed all security guardrail checks.",
            category="valid",
            confidence=1.0
        )
