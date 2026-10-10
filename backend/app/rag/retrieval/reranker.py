from typing import List, Tuple, Optional, Any
from sentence_transformers import CrossEncoder
from app.config import settings
from app.utils.logging import get_logger

logger = get_logger(__name__)

class RerankerService:
    _instance = None
    _model = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(RerankerService, cls).__new__(cls)
        return cls._instance

    def __init__(self):
        if self._model is None:
            logger.info(f"Loading local reranker model: {settings.RERANKER_MODEL}")
            try:
                self._model = CrossEncoder(settings.RERANKER_MODEL)
                logger.info("Local reranker model loaded successfully.")
            except Exception as e:
                logger.warning(f"Failed to load cross-encoder reranker '{settings.RERANKER_MODEL}': {e}. Falling back to linear score ordering.")
                self._model = None

    def rerank(self, query: str, chunks: List[Any], top_k: int = settings.RERANK_TOP_K) -> List[Any]:
        """
        Reranks a list of candidate RetrievedChunks using CrossEncoder.
        Updates each chunk's score to the cross-encoder score.
        """
        if not chunks or not query:
            return chunks[:top_k]

        if self._model is None:
            return chunks[:top_k]

        try:
            pairs = [(query, chunk.content) for chunk in chunks]
            scores = self._model.predict(pairs)

            import math
            for idx, chunk in enumerate(chunks):
                raw_score = float(scores[idx])
                # Sigmoidal normalization for cross-encoder logits
                norm_score = 1.0 / (1.0 + math.exp(-raw_score)) if raw_score < 100 else 1.0
                chunk.reranker_score = round(norm_score, 4)
                # Set primary score to reranker_score
                chunk.score = chunk.reranker_score

            # Sort descending by reranker_score
            reranked_chunks = sorted(chunks, key=lambda c: getattr(c, 'reranker_score', c.score), reverse=True)
            return reranked_chunks[:top_k]

        except Exception as e:
            logger.error(f"Error during reranking: {e}")
            return chunks[:top_k]
