from datetime import datetime
from typing import Optional, Dict, Any, List
from pydantic import BaseModel, ConfigDict
import uuid

class DocumentBase(BaseModel):
    filename: str
    file_type: str

class DocumentCreate(DocumentBase):
    metadata: Optional[Dict[str, Any]] = {}

class DocumentItem(DocumentBase):
    model_config = ConfigDict(from_attributes=True)
    
    id: uuid.UUID
    status: str = "COMPLETED"
    created_at: datetime
    chunk_count: int = 0
    metadata: Optional[Dict[str, Any]] = {}

class DocumentUploadResponse(BaseModel):
    id: uuid.UUID
    filename: str
    file_type: str
    status: str
    chunk_count: int
    message: str

class DocumentListResponse(BaseModel):
    documents: List[DocumentItem]
