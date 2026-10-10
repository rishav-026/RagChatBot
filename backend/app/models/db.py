import uuid
from datetime import datetime
from sqlalchemy import Column, String, Integer, Text, DateTime, ForeignKey, Numeric, JSON
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from sqlalchemy.types import TypeDecorator
from pgvector.sqlalchemy import Vector

from app.database.session import Base
from app.config import settings

class CompatibleVector(TypeDecorator):
    """
    SQLAlchemy type decorator that uses Vector(dim) on PostgreSQL
    and JSON array on SQLite.
    """
    impl = JSON
    cache_ok = True

    def __init__(self, dim=384, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.dim = dim

    def load_dialect_impl(self, dialect):
        if dialect.name == "postgresql":
            return dialect.type_descriptor(Vector(self.dim))
        return dialect.type_descriptor(JSON())

    def process_bind_param(self, value, dialect):
        if value is None:
            return None
        if hasattr(value, "tolist"):
            return value.tolist()
        return value

    def process_result_value(self, value, dialect):
        if value is None:
            return None
        if isinstance(value, str):
            import json
            try:
                return json.loads(value)
            except Exception:
                return value
        return value

class DocumentModel(Base):
    __tablename__ = "documents"

    id = Column(String(36).with_variant(UUID(as_uuid=True), "postgresql"), primary_key=True, default=lambda: str(uuid.uuid4()))
    filename = Column(String(255), nullable=False)
    file_type = Column(String(50), nullable=False)
    status = Column(String(30), default="COMPLETED")  # 'QUEUED', 'PROCESSING', 'COMPLETED', 'FAILED'
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    metadata_ = Column("metadata", JSON().with_variant(JSONB, "postgresql"), default=dict)

    chunks = relationship("DocumentChunkModel", back_populates="document", cascade="all, delete-orphan")

class DocumentChunkModel(Base):
    __tablename__ = "document_chunks"

    id = Column(String(36).with_variant(UUID(as_uuid=True), "postgresql"), primary_key=True, default=lambda: str(uuid.uuid4()))
    document_id = Column(String(36).with_variant(UUID(as_uuid=True), "postgresql"), ForeignKey("documents.id", ondelete="CASCADE"), nullable=False)
    content = Column(Text, nullable=False)
    embedding = Column(CompatibleVector(settings.EMBEDDING_DIMENSION), nullable=False)
    page_number = Column(Integer, nullable=True)
    chunk_index = Column(Integer, nullable=False)
    metadata_ = Column("metadata", JSON().with_variant(JSONB, "postgresql"), default=dict)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)

    document = relationship("DocumentModel", back_populates="chunks")

class ConversationModel(Base):
    __tablename__ = "conversations"

    id = Column(String(36).with_variant(UUID(as_uuid=True), "postgresql"), primary_key=True, default=lambda: str(uuid.uuid4()))
    title = Column(String(255), default="New Conversation")
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)

    messages = relationship("MessageModel", back_populates="conversation", cascade="all, delete-orphan")

class MessageModel(Base):
    __tablename__ = "messages"

    id = Column(String(36).with_variant(UUID(as_uuid=True), "postgresql"), primary_key=True, default=lambda: str(uuid.uuid4()))
    conversation_id = Column(String(36).with_variant(UUID(as_uuid=True), "postgresql"), ForeignKey("conversations.id", ondelete="CASCADE"), nullable=False)
    role = Column(String(20), nullable=False)  # 'user' or 'assistant'
    content = Column(Text, nullable=False)
    sources = Column(JSON().with_variant(JSONB, "postgresql"), default=list)
    metadata_ = Column("metadata", JSON().with_variant(JSONB, "postgresql"), default=dict)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)

    conversation = relationship("ConversationModel", back_populates="messages")

class LLMUsageLogModel(Base):
    __tablename__ = "llm_usage_logs"

    id = Column(String(36).with_variant(UUID(as_uuid=True), "postgresql"), primary_key=True, default=lambda: str(uuid.uuid4()))
    request_id = Column(String(100), nullable=False)
    provider = Column(String(50), nullable=False)
    model = Column(String(100), nullable=False)
    input_tokens = Column(Integer, default=0)
    output_tokens = Column(Integer, default=0)
    total_tokens = Column(Integer, default=0)
    estimated_cost = Column(Numeric(10, 6), default=0.0)
    latency_ms = Column(Numeric(10, 2), default=0.0)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)

