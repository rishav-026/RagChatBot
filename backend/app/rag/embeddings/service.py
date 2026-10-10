from typing import List
from sentence_transformers import SentenceTransformer
from app.config import settings
from app.utils.logging import get_logger

logger = get_logger(__name__)

class EmbeddingService:
    _instance = None
    _model = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(EmbeddingService, cls).__new__(cls)
        return cls._instance

    def __init__(self):
        if self._model is None:
            logger.info(f"Loading embedding model: {settings.EMBEDDING_MODEL}")
            try:
                self._model = SentenceTransformer(settings.EMBEDDING_MODEL)
                logger.info("Embedding model loaded successfully.")
            except Exception as e:
                logger.error(f"Failed to load embedding model {settings.EMBEDDING_MODEL}: {e}")
                raise RuntimeError(f"Embedding model initialization failed: {e}")

    def embed_document_chunks(self, texts: List[str]) -> List[List[float]]:
        """
        Embed a list of document chunk texts.
        """
        if not texts:
            return []
        try:
            # BGE models work best with normalize_embeddings=True
            embeddings = self._model.encode(texts, normalize_embeddings=True, show_progress_bar=False)
            return embeddings.tolist()
        except Exception as e:
            logger.error(f"Error generating chunk embeddings: {e}")
            raise RuntimeError(f"Failed to generate chunk embeddings: {e}")

    def embed_query(self, query: str) -> List[float]:
        """
        Embed a single search query. For BGE models, query instruction can optionally be prepended.
        """
        if not query or not query.strip():
            raise ValueError("Query text cannot be empty.")
        try:
            # BGE prompt template for queries (recommended for BGE models)
            prompted_query = f"Represent this sentence for searching relevant passages: {query.strip()}"
            embedding = self._model.encode(prompted_query, normalize_embeddings=True, show_progress_bar=False)
            return embedding.tolist()
        except Exception as e:
            logger.error(f"Error generating query embedding: {e}")
            raise RuntimeError(f"Failed to generate query embedding: {e}")
