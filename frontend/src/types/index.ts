export interface DocumentItem {
  id: string;
  filename: string;
  file_type: string;
  status?: string;
  created_at: string;
  chunk_count: number;
  metadata?: Record<string, any>;
}

export interface DocumentUploadResponse {
  id: string;
  filename: string;
  file_type: string;
  status: string;
  chunk_count: number;
  message: string;
}

export interface SourceCitation {
  document: string;
  page?: number | null;
  chunk_id: string;
  score: number;
  vector_score?: number;
  keyword_score?: number;
  reranker_score?: number;
  snippet?: string;
}

export interface RetrievalMetadata {
  top_k: number;
  chunks_retrieved: number;
  selected_chunks_count?: number;
  retrieval_latency_ms: number;
}

export interface CandidateTraceItem {
  chunk_id: string;
  document: string;
  page?: number | null;
  text_preview: string;
  vector_score: number;
  keyword_score: number;
  hybrid_score: number;
  reranker_score: number;
  selected: boolean;
  reason: string;
}

export interface DebugInfo {
  raw_query?: string;
  rewritten_query?: string;
  query_processed: string;
  embedding_model?: string;
  reranker_model?: string;
  relevance_threshold?: number;
  provider_used: string;
  prompt_version: string;
  input_guardrail: Record<string, any>;
  retrieval_guardrail: Record<string, any>;
  output_guardrail: Record<string, any>;
  raw_candidate_count: number;
  selected_context_count?: number;
  candidate_trace?: CandidateTraceItem[];
  request_id?: string;
  latency_ms?: number;
}

export interface ChatResponse {
  answer: string;
  sources: SourceCitation[];
  retrieved_candidates?: SourceCitation[];
  conversation_id: string;
  retrieval_metadata: RetrievalMetadata;
  latency_ms: number;
  provider_used: string;
  debug_info?: DebugInfo;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  conversation_id?: string;
  sources?: SourceCitation[];
  retrieved_candidates?: SourceCitation[];
  latency_ms?: number;
  provider_used?: string;
  debug_info?: DebugInfo;
  error?: boolean;
  isStreaming?: boolean;
}

export interface SystemReadiness {
  ready: boolean;
  database: string;
  pgvector: string;
  redis_cache: string;
  embedding_model: string;
  reranker_model: string;
  primary_llm: string;
  fallback_llm: string;
}

export interface ObservabilityMetrics {
  total_questions: number;
  avg_latency_ms: number;
  p95_latency_ms: number;
  total_tokens: number;
  avg_tokens: number;
  total_cost_usd: number;
  provider_breakdown: Record<string, number>;
  fallback_count: number;
  guardrail_block_count: number;
  retrieval_success_rate: number;
  error_rate: number;
}
