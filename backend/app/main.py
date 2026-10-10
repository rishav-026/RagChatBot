import uuid
import time
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import text

from app.config import settings
from app.utils.logging import setup_logging, get_logger, request_id_ctx
from app.database.session import engine, Base
from app.api.router import api_router

# Setup structured logging
setup_logging(settings.LOG_LEVEL)
logger = get_logger("app.main")

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting Production RAG Knowledge Assistant backend...")
    try:
        with engine.connect() as conn:
            if engine.dialect.name == "postgresql":
                conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector;"))
                conn.commit()
                logger.info("Successfully connected to PostgreSQL and verified pgvector extension.")
            else:
                logger.info("Running on local SQLite database engine (ragdb.db).")
        Base.metadata.create_all(bind=engine)
    except Exception as e:
        logger.warning(f"Database initialization warning: {e}")
    yield
    logger.info("Shutting down RAG backend service.")

app = FastAPI(
    title="Production RAG Knowledge Assistant API",
    description="Production-oriented Retrieval-Augmented Generation (RAG) backend API with pgvector and Gemini 2.5 Flash",
    version="1.0.0",
    lifespan=lifespan
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # For dev convenience, restrict in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Request ID Context Middleware
@app.middleware("http")
async def request_id_middleware(request: Request, call_next):
    req_id = request.headers.get("X-Request-ID") or str(uuid.uuid4())
    token = request_id_ctx.set(req_id)
    
    start_time = time.time()
    response = await call_next(request)
    duration_ms = (time.time() - start_time) * 1000
    
    response.headers["X-Request-ID"] = req_id
    response.headers["X-Response-Time"] = f"{duration_ms:.2f}ms"
    
    logger.info(f"{request.method} {request.url.path} -> {response.status_code} ({duration_ms:.2f}ms)")
    request_id_ctx.reset(token)
    return response

# Global Exception Handlers (prevent stack trace leak)
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled exception during {request.method} {request.url.path}: {exc}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "error": "Internal Server Error",
            "code": "INTERNAL_SERVER_ERROR",
            "details": "An unexpected internal error occurred. Please contact support or retry."
        }
    )

app.include_router(api_router)

@app.get("/health", tags=["Health"])
def health_check():
    db_status = "unknown"
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
            db_status = "connected"
    except Exception:
        db_status = "disconnected"

    return {
        "status": "healthy",
        "database": db_status,
        "embedding_model": settings.EMBEDDING_MODEL,
        "llm_model": settings.GEMINI_MODEL
    }
