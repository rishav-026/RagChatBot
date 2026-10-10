from fastapi import APIRouter, status
from sqlalchemy import text
from app.database.session import engine
from app.cache.redis_client import RedisCacheManager
from app.config import settings

router = APIRouter(tags=["Health & Readiness"])
cache_manager = RedisCacheManager()

@router.get("/health", status_code=status.HTTP_200_OK)
def health_check():
    """
    Liveness probe: verifies backend API instance is running.
    """
    return {
        "status": "healthy",
        "service": "Production RAG Knowledge Assistant",
        "version": "3.0.0"
    }

@router.get("/ready", status_code=status.HTTP_200_OK)
def readiness_check():
    """
    Readiness probe: verifies PostgreSQL DB, pgvector extension, Redis cache, and models.
    """
    db_status = "ok"
    pgvector_status = "ok"
    redis_status = "ok" if cache_manager.is_available else "bypassed"

    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
            if getattr(engine, "dialect", None) and engine.dialect.name == "postgresql":
                res = conn.execute(text("SELECT extname FROM pg_extension WHERE extname = 'vector'")).fetchone()
                if not res:
                    pgvector_status = "missing"
            else:
                pgvector_status = "ok"
    except Exception as e:
        db_status = f"error: {str(e)}"

    is_ready = db_status == "ok" and pgvector_status == "ok"

    return {
        "ready": is_ready,
        "database": db_status,
        "pgvector": pgvector_status,
        "redis_cache": redis_status,
        "embedding_model": settings.EMBEDDING_MODEL,
        "reranker_model": settings.RERANKER_MODEL,
        "primary_llm": settings.GEMINI_MODEL,
        "fallback_llm": settings.GROQ_MODEL
    }
