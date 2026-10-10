from typing import Optional, Any
from pydantic import BaseModel

class ErrorResponse(BaseModel):
    error: str
    code: str
    details: Optional[Any] = None
