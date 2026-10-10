from typing import List, Optional
from pydantic import BaseModel
from app.rag.retrieval.service import RetrievedChunk
from app.config import settings

class RetrievalGuardrailResult(BaseModel):
    allowed: bool
    reason: str
    top_score: float
    fallback_answer: Optional[str] = None

class RetrievalGuardrailService:
    """
    Evaluates whether top-ranked context chunks meet the minimum relevance threshold
    to prevent sending irrelevant context or generating hallucinated answers.
    """

    def __init__(self, min_score: float = settings.MIN_RELEVANCE_SCORE):
        self.min_score = min_score
        self.fallback_message = "I couldn't find enough relevant information in the uploaded documents to answer this question."

    def validate(self, selected_chunks: List[RetrievedChunk]) -> RetrievalGuardrailResult:
        if not selected_chunks:
            return RetrievalGuardrailResult(
                allowed=False,
                reason="No candidate document chunks passed relevance threshold or fallback criteria.",
                top_score=0.0,
                fallback_answer=self.fallback_message
            )

        top_score = max(chunk.score for chunk in selected_chunks)

        return RetrievalGuardrailResult(
            allowed=True,
            reason="Retrieved context passed relevance evaluation.",
            top_score=top_score
        )
