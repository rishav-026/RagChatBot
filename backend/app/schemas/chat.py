from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field

class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, description="User question or query")
    conversation_id: Optional[str] = Field(default=None, description="Optional conversation identifier")
    debug: Optional[bool] = Field(default=False, description="Enable developer debug details in response")

class SourceCitation(BaseModel):
    document: str = Field(..., description="Filename of source document")
    page: Optional[int] = Field(default=None, description="Page number if applicable")
    chunk_id: str = Field(..., description="ID of chunk used")
    score: float = Field(..., description="Final relevance score")
    vector_score: Optional[float] = Field(default=0.0, description="Vector similarity score")
    keyword_score: Optional[float] = Field(default=0.0, description="BM25 keyword match score")
    reranker_score: Optional[float] = Field(default=0.0, description="CrossEncoder reranker score")
    snippet: Optional[str] = Field(default=None, description="Excerpt of chunk content")

class RetrievalMetadata(BaseModel):
    top_k: int
    chunks_retrieved: int
    selected_chunks_count: Optional[int] = 0
    retrieval_latency_ms: float

class CandidateTraceItem(BaseModel):
    chunk_id: str
    document: str
    page: Optional[int] = None
    text_preview: str
    vector_score: float = 0.0
    keyword_score: float = 0.0
    hybrid_score: float = 0.0
    reranker_score: float = 0.0
    selected: bool
    reason: str

class DebugInfo(BaseModel):
    raw_query: Optional[str] = None
    rewritten_query: Optional[str] = None
    query_processed: str
    embedding_model: Optional[str] = None
    reranker_model: Optional[str] = None
    relevance_threshold: Optional[float] = 0.20
    provider_used: str
    prompt_version: str
    input_guardrail: Dict[str, Any]
    retrieval_guardrail: Dict[str, Any]
    output_guardrail: Dict[str, Any]
    raw_candidate_count: int
    selected_context_count: Optional[int] = 0
    candidate_trace: Optional[List[CandidateTraceItem]] = Field(default_factory=list)

class ChatResponse(BaseModel):
    answer: str = Field(..., description="Generated answer grounded in retrieved documents")
    sources: List[SourceCitation] = Field(default_factory=list, description="Selected context sources used for generation")
    retrieved_candidates: Optional[List[SourceCitation]] = Field(default_factory=list, description="All candidate chunks retrieved before relevance filtering")
    conversation_id: str = Field(..., description="Conversation identifier")
    retrieval_metadata: RetrievalMetadata
    latency_ms: float = Field(..., description="Total pipeline latency in milliseconds")
    provider_used: str = Field(..., description="LLM provider and model used")
    debug_info: Optional[DebugInfo] = Field(default=None, description="Developer debug information")
