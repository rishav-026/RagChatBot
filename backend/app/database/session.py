import os
import logging
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, declarative_base
from app.config import settings

logger = logging.getLogger("app.database")

Base = declarative_base()

def get_engine():
    # Attempt Postgres first with short timeout
    if "postgresql" in settings.DATABASE_URL:
        try:
            pg_engine = create_engine(
                settings.DATABASE_URL,
                pool_pre_ping=True,
                pool_size=5,
                max_overflow=10,
                connect_args={"connect_timeout": 2}
            )
            with pg_engine.connect() as conn:
                conn.execute(text("SELECT 1"))
            logger.info("Successfully connected to PostgreSQL database.")
            return pg_engine
        except Exception as e:
            logger.warning(f"PostgreSQL connection failed ({e}). Falling back to SQLite database.")

    # SQLite Fallback engine for local environments without running PostgreSQL containers
    db_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "ragdb.db"))
    sqlite_url = f"sqlite:///{db_path}"
    sqlite_engine = create_engine(
        sqlite_url,
        connect_args={"check_same_thread": False}
    )
    return sqlite_engine

engine = get_engine()
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

