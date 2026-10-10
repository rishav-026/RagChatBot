from abc import ABC, abstractmethod
from typing import List, Optional, Dict, Any
from pydantic import BaseModel

from app.rag.ingestion.extractors import PageContent

class DocumentChunk(BaseModel):
    content: str
    page_number: Optional[int] = None
    chunk_index: int
    metadata: Dict[str, Any] = {}

class BaseChunker(ABC):
    """
    Abstract interface for text chunking strategies.
    Enables future extensions such as semantic chunking or parent-child chunking.
    """
    
    @abstractmethod
    def chunk_document(
        self,
        pages: List[PageContent],
        document_metadata: Dict[str, Any]
    ) -> List[DocumentChunk]:
        """
        Takes list of extracted page content and returns chunk objects with metadata.
        """
        pass
