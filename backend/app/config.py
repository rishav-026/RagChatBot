import os
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field

root_env = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".env"))
backend_env = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".env"))

class Settings(BaseSettings):
    # LLM Provider Keys
    GEMINI_API_KEY: str = Field(default="")
    GEMINI_MODEL: str = Field(default="gemini-3.5-flash-lite")
    
    GROQ_API_KEY: str = Field(default="")
    GROQ_MODEL: str = Field(default="qwen/qwen3.8-27b")
    
    # Database Configuration
    DATABASE_URL: str = Field(
        default="postgresql+psycopg://raguser:ragpassword@localhost:5432/ragdb"
    )
    
    # Redis Caching Configuration
    REDIS_URL: str = Field(default="redis://localhost:6379/0")
    CACHE_TTL_SECONDS: int = Field(default=3600)
    ENABLE_CACHE: bool = Field(default=True)
    
    # Rate Limiting
    RATE_LIMIT_REQUESTS_PER_MINUTE: int = Field(default=60)
    
    # Embedding Configuration
    EMBEDDING_MODEL: str = Field(default="BAAI/bge-small-en-v1.5")
    EMBEDDING_DIMENSION: int = Field(default=384)
    
    # Hybrid Retrieval & Reranking Configuration
    VECTOR_WEIGHT: float = Field(default=0.6)
    KEYWORD_WEIGHT: float = Field(default=0.4)
    INITIAL_RETRIEVAL_K: int = Field(default=20)
    RERANK_TOP_K: int = Field(default=5)
    RERANKER_MODEL: str = Field(default="cross-encoder/ms-marco-MiniLM-L-6-v2")
    MIN_RELEVANCE_SCORE: float = Field(default=0.20)
    
    # Chunking Defaults
    TOP_K: int = Field(default=5)
    CHUNK_SIZE: int = Field(default=500)
    CHUNK_OVERLAP: int = Field(default=50)
    
    # Memory & Conversation
    MAX_CONVERSATION_HISTORY: int = Field(default=6)
    
    # App Settings
    LOG_LEVEL: str = Field(default="INFO")
    MAX_FILE_SIZE_MB: int = Field(default=15)
    ENABLE_DEBUG_MODE: bool = Field(default=True)
    RAG_PROMPT_VERSION: str = Field(default="v3")

    model_config = SettingsConfigDict(
        env_file=(root_env, backend_env, ".env"),
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()
