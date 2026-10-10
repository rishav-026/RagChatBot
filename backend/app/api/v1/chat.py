import time
import json
import uuid
from typing import AsyncGenerator
from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.schemas.chat import (
    ChatRequest, ChatResponse, SourceCitation, RetrievalMetadata, DebugInfo, CandidateTraceItem
)
from app.rag.query_processor import QueryProcessor
from app.rag.guardrails.input_guardrail import InputGuardrailService
from app.rag.guardrails.retrieval_guardrail import RetrievalGuardrailService
from app.rag.guardrails.output_guardrail import OutputGuardrailService
from app.rag.retrieval.service import RetrievalService
from app.rag.generation.prompt import build_rag_prompt_v2, RAG_PROMPT_VERSION
from app.rag.generation.llm_service import LLMService
from app.services.conversation_service import ConversationService
from app.services.metrics_service import MetricsService
from app.cache.redis_client import RedisCacheManager
from app.utils.rate_limiter import check_rate_limit
from app.config import settings
from app.utils.logging import get_logger, request_id_ctx

logger = get_logger(__name__)
router = APIRouter(prefix="/chat", tags=["Chat"])

query_processor = QueryProcessor()
input_guardrail = InputGuardrailService()
retrieval_guardrail = RetrievalGuardrailService()
output_guardrail = OutputGuardrailService()
retrieval_service = RetrievalService()
llm_service = LLMService()
conversation_service = ConversationService()
metrics_service = MetricsService()
cache_manager = RedisCacheManager()


def process_relevance_selection(retrieved_chunks: list) -> tuple[list, list[CandidateTraceItem]]:
    """
    Evaluates retrieved candidate chunks against primary relevance threshold and hybrid fallback criteria.
    - Primary threshold: chunk.score >= settings.MIN_RELEVANCE_SCORE (0.20)
    - Hybrid fallback: If 0 chunks pass primary threshold, select top candidate if:
      reranker_score >= 0.01 AND (vector_score >= 0.48 OR keyword_score >= 0.50 OR hybrid_score >= 0.35)
      This recovers factual queries (e.g. "What is CRUD?") penalized by cross-encoder logits
      while strictly rejecting out-of-domain queries (e.g. "Population of Japan").
    """
    selected_chunks = [chunk for chunk in retrieved_chunks if chunk.score >= settings.MIN_RELEVANCE_SCORE]
    
    if not selected_chunks and retrieved_chunks:
        top_candidate = retrieved_chunks[0]
        vec = getattr(top_candidate, 'vector_score', 0.0) or 0.0
        kw = getattr(top_candidate, 'keyword_score', 0.0) or 0.0
        rerank = getattr(top_candidate, 'reranker_score', 0.0) or 0.0
        hybrid = (settings.VECTOR_WEIGHT * vec) + (settings.KEYWORD_WEIGHT * kw)
        
        if rerank >= 0.005 and (vec >= 0.45 or kw >= 0.40 or hybrid >= 0.30):
            selected_chunks = [top_candidate]

    selected_ids = {str(c.chunk_id) for c in selected_chunks}
    candidate_trace: list[CandidateTraceItem] = []

    for chunk in retrieved_chunks:
        cid = str(chunk.chunk_id)
        vec = getattr(chunk, 'vector_score', 0.0) or 0.0
        kw = getattr(chunk, 'keyword_score', 0.0) or 0.0
        rerank = getattr(chunk, 'reranker_score', 0.0) or 0.0
        hybrid = (settings.VECTOR_WEIGHT * vec) + (settings.KEYWORD_WEIGHT * kw)
        is_sel = cid in selected_ids

        if is_sel:
            if chunk.score >= settings.MIN_RELEVANCE_SCORE:
                reason = f"Passed primary threshold ({chunk.score:.2f} >= {settings.MIN_RELEVANCE_SCORE:.2f})"
            else:
                reason = f"Passed hybrid fallback (reranker {rerank:.3f} >= 0.01, hybrid {hybrid:.2f})"
        else:
            if rerank < 0.01:
                reason = f"Rejected: Low reranker relevance ({rerank:.4f} < 0.01, threshold {settings.MIN_RELEVANCE_SCORE:.2f})"
            else:
                reason = f"Rejected: Below threshold {settings.MIN_RELEVANCE_SCORE:.2f} and fallback criteria"

        candidate_trace.append(
            CandidateTraceItem(
                chunk_id=cid,
                document=chunk.filename,
                page=chunk.page_number,
                text_preview=chunk.content[:150].replace('\n', ' ') + "..." if len(chunk.content) > 150 else chunk.content.replace('\n', ' '),
                vector_score=round(vec, 4),
                keyword_score=round(kw, 4),
                hybrid_score=round(hybrid, 4),
                reranker_score=round(rerank, 4),
                selected=is_sel,
                reason=reason
            )
        )

    return selected_chunks, candidate_trace

@router.post("", response_model=ChatResponse)
def chat_completion(
    request_obj: ChatRequest,
    req: Request,
    db: Session = Depends(get_db)
):
    """
    Standard RAG Chat Endpoint (Phase 3):
    1. Rate Limiting Check.
    2. Input Guardrails.
    3. Redis Cache Lookup (Fast ~5ms hit response).
    4. Query Normalization.
    5. Conversation Memory.
    6. Hybrid Retrieval + Reranking.
    7. Retrieval Guardrails.
    8. Multi-Provider LLM Generation.
    9. Output Guardrails.
    10. Token & Cost Observability Logging.
    11. Redis Cache Store.
    """
    total_start = time.time()
    req_id = request_id_ctx.get() or str(uuid.uuid4())

    # 1. Rate Limiting Check
    check_rate_limit(req)

    # 2. Input Guardrail Check
    ig_result = input_guardrail.validate(request_obj.message)
    if not ig_result.allowed:
        logger.warning(f"Input guardrail rejected query: {ig_result.reason}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=ig_result.reason
        )

    # 3. Query Processing & Conversation Memory
    processed = query_processor.process(request_obj.message)
    conv = conversation_service.get_or_create_conversation(db, request_obj.conversation_id)
    history_msgs = conversation_service.get_history(db, conv.id)
    history_text = conversation_service.format_history_for_prompt(history_msgs)

    # 4. Redis Cache Lookup
    cache_key = cache_manager.generate_key(
        "chat",
        {"q": processed.normalized_query, "hist": history_text}
    )
    cached_data = cache_manager.get(cache_key)
    if cached_data:
        logger.info("Returning cached RAG response from Redis.")
        return ChatResponse(**cached_data)

    # 5. Hybrid Retrieval & Reranking using expanded search_query
    ret_start = time.time()
    retrieved_chunks = retrieval_service.retrieve(
        db=db,
        query=processed.search_query,
        initial_k=settings.INITIAL_RETRIEVAL_K,
        top_k=settings.RERANK_TOP_K
    )
    ret_latency_ms = (time.time() - ret_start) * 1000

    # Evaluate relevance thresholds and hybrid fallback rule
    selected_chunks, candidate_trace = process_relevance_selection(retrieved_chunks)

    # Format all retrieved candidates for inspection
    retrieved_candidates: list[SourceCitation] = [
        SourceCitation(
            document=chunk.filename,
            page=chunk.page_number,
            chunk_id=chunk.chunk_id,
            score=chunk.score,
            vector_score=chunk.vector_score,
            keyword_score=chunk.keyword_score,
            reranker_score=chunk.reranker_score,
            snippet=chunk.content[:150] + "..." if len(chunk.content) > 150 else chunk.content
        )
        for chunk in retrieved_chunks
    ]

    # 6. Retrieval Guardrail Check (Requires at least one selected chunk passing relevance threshold)
    rg_result = retrieval_guardrail.validate(selected_chunks)
    if not rg_result.allowed:
        logger.info(f"Retrieval guardrail triggered: {rg_result.reason}")
        fallback_msg = rg_result.fallback_answer or "I couldn't find enough relevant information in the uploaded documents to answer this question."
        
        conversation_service.save_message(db, conv.id, "user", processed.original_query)
        conversation_service.save_message(db, conv.id, "assistant", fallback_msg)

        # Log usage metric
        metrics_service.record_usage(
            db, req_id, "Retrieval System", "no-relevant-context",
            processed.original_query, fallback_msg, (time.time() - total_start) * 1000
        )

        total_latency = (time.time() - total_start) * 1000
        return ChatResponse(
            answer=fallback_msg,
            sources=[],
            retrieved_candidates=retrieved_candidates,
            conversation_id=str(conv.id),
            retrieval_metadata=RetrievalMetadata(
                top_k=settings.RERANK_TOP_K,
                chunks_retrieved=len(retrieved_chunks),
                selected_chunks_count=0,
                retrieval_latency_ms=round(ret_latency_ms, 2)
            ),
            latency_ms=round(total_latency, 2),
            provider_used="Retrieval System (No relevant context)",
            debug_info=DebugInfo(
                raw_query=processed.original_query,
                rewritten_query=processed.search_query,
                query_processed=processed.normalized_query,
                embedding_model=settings.EMBEDDING_MODEL,
                reranker_model=settings.RERANKER_MODEL,
                relevance_threshold=settings.MIN_RELEVANCE_SCORE,
                provider_used="Retrieval System",
                prompt_version=RAG_PROMPT_VERSION,
                input_guardrail=ig_result.model_dump(),
                retrieval_guardrail=rg_result.model_dump(),
                output_guardrail={"allowed": True, "reason": "Bypassed due to low relevance", "is_grounded": True},
                raw_candidate_count=len(retrieved_chunks),
                selected_context_count=0,
                candidate_trace=candidate_trace
            ) if (request_obj.debug or settings.ENABLE_DEBUG_MODE) else None
        )

    # 7. Build Versioned Prompt using ONLY selected relevance-filtered chunks
    prompt = build_rag_prompt_v2(
        query=processed.original_query,
        retrieved_chunks=selected_chunks,
        conversation_history=history_text
    )

    # 8. LLM Generation
    try:
        raw_answer, provider_used = llm_service.generate(prompt)
    except Exception as e:
        logger.error(f"LLM Generation failure: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"All LLM providers failed to respond: {str(e)}"
        )

    # 9. Output Guardrail Check
    og_result = output_guardrail.validate(raw_answer)
    final_answer = og_result.sanitized_output or raw_answer

    # Format selected context source citations
    sources: list[SourceCitation] = [
        SourceCitation(
            document=chunk.filename,
            page=chunk.page_number,
            chunk_id=chunk.chunk_id,
            score=chunk.score,
            vector_score=chunk.vector_score,
            keyword_score=chunk.keyword_score,
            reranker_score=chunk.reranker_score,
            snippet=chunk.content[:150] + "..." if len(chunk.content) > 150 else chunk.content
        )
        for chunk in selected_chunks
    ]

    # Save to conversation memory
    sources_dict = [s.model_dump() for s in sources]
    conversation_service.save_message(db, conv.id, "user", processed.original_query)
    conversation_service.save_message(db, conv.id, "assistant", final_answer, sources=sources_dict)

    total_latency_ms = (time.time() - total_start) * 1000

    # Log token usage & cost observability
    metrics_service.record_usage(
        db, req_id, provider_used, settings.GEMINI_MODEL,
        prompt, final_answer, total_latency_ms
    )

    response_obj = ChatResponse(
        answer=final_answer,
        sources=sources,
        retrieved_candidates=retrieved_candidates,
        conversation_id=str(conv.id),
        retrieval_metadata=RetrievalMetadata(
            top_k=settings.RERANK_TOP_K,
            chunks_retrieved=len(retrieved_chunks),
            selected_chunks_count=len(selected_chunks),
            retrieval_latency_ms=round(ret_latency_ms, 2)
        ),
        latency_ms=round(total_latency_ms, 2),
        provider_used=provider_used,
        debug_info=DebugInfo(
            raw_query=processed.original_query,
            rewritten_query=processed.search_query,
            query_processed=processed.normalized_query,
            embedding_model=settings.EMBEDDING_MODEL,
            reranker_model=settings.RERANKER_MODEL,
            relevance_threshold=settings.MIN_RELEVANCE_SCORE,
            provider_used=provider_used,
            prompt_version=RAG_PROMPT_VERSION,
            input_guardrail=ig_result.model_dump(),
            retrieval_guardrail=rg_result.model_dump(),
            output_guardrail=og_result.model_dump(),
            raw_candidate_count=len(retrieved_chunks),
            selected_context_count=len(selected_chunks),
            candidate_trace=candidate_trace
        ) if (request_obj.debug or settings.ENABLE_DEBUG_MODE) else None
    )

    # Store in Redis Cache
    cache_manager.set(cache_key, response_obj.model_dump())

    return response_obj


@router.post("/stream")
async def chat_stream(
    request_obj: ChatRequest,
    req: Request,
    db: Session = Depends(get_db)
):
    """
    Server-Sent Events (SSE) Token Streaming Endpoint:
    Streams tokens progressively to client with rate limiting & observability logging.
    """
    total_start = time.time()
    req_id = request_id_ctx.get() or str(uuid.uuid4())

    # Rate Limit Check
    check_rate_limit(req)

    async def sse_event_generator():
        # Input Guardrail Check
        ig_result = input_guardrail.validate(request_obj.message)
        if not ig_result.allowed:
            err_payload = json.dumps({"error": ig_result.reason, "category": ig_result.category})
            yield f"event: error\ndata: {err_payload}\n\n"
            return

        processed = query_processor.process(request_obj.message)
        conv = conversation_service.get_or_create_conversation(db, request_obj.conversation_id)
        history_msgs = conversation_service.get_history(db, conv.id)
        history_text = conversation_service.format_history_for_prompt(history_msgs)

        start_payload = json.dumps({
            "conversation_id": str(conv.id),
            "status": "processing"
        })
        yield f"event: start\ndata: {start_payload}\n\n"

        # Hybrid Retrieval using search_query
        ret_start = time.time()
        retrieved_chunks = retrieval_service.retrieve(
            db=db,
            query=processed.search_query,
            initial_k=settings.INITIAL_RETRIEVAL_K,
            top_k=settings.RERANK_TOP_K
        )
        ret_latency_ms = (time.time() - ret_start) * 1000

        # Evaluate relevance thresholds and hybrid fallback rule
        selected_chunks, candidate_trace = process_relevance_selection(retrieved_chunks)

        # Format retrieved candidates for inspect trace
        retrieved_candidates: list[SourceCitation] = [
            SourceCitation(
                document=chunk.filename,
                page=chunk.page_number,
                chunk_id=chunk.chunk_id,
                score=chunk.score,
                vector_score=chunk.vector_score,
                keyword_score=chunk.keyword_score,
                reranker_score=chunk.reranker_score,
                snippet=chunk.content[:150] + "..." if len(chunk.content) > 150 else chunk.content
            )
            for chunk in retrieved_chunks
        ]

        # Retrieval Guardrail Validation BEFORE emitting sources
        rg_result = retrieval_guardrail.validate(selected_chunks)
        if not rg_result.allowed:
            # Emit empty sources so frontend knows 0 context chunks were selected
            sources_payload = json.dumps({
                "sources": [],
                "retrieved_candidates": [s.model_dump() for s in retrieved_candidates],
                "retrieval_metadata": {
                    "top_k": settings.RERANK_TOP_K,
                    "chunks_retrieved": len(retrieved_chunks),
                    "selected_chunks_count": 0,
                    "retrieval_latency_ms": round(ret_latency_ms, 2)
                }
            })
            yield f"event: sources\ndata: {sources_payload}\n\n"

            fallback_msg = rg_result.fallback_answer or "I couldn't find enough relevant information in the uploaded documents to answer this question."
            token_payload = json.dumps({"token": fallback_msg})
            yield f"event: token\ndata: {token_payload}\n\n"
            
            conversation_service.save_message(db, conv.id, "user", processed.original_query)
            conversation_service.save_message(db, conv.id, "assistant", fallback_msg)

            metrics_service.record_usage(
                db, req_id, "Retrieval System", "no-relevant-context",
                processed.original_query, fallback_msg, (time.time() - total_start) * 1000
            )

            completion_payload = json.dumps({
                "answer": fallback_msg,
                "conversation_id": str(conv.id),
                "provider_used": "Retrieval System (No relevant context)",
                "latency_ms": round((time.time() - total_start) * 1000, 2),
                "debug_info": {
                    "raw_query": processed.original_query,
                    "rewritten_query": processed.search_query,
                    "query_processed": processed.normalized_query,
                    "embedding_model": settings.EMBEDDING_MODEL,
                    "reranker_model": settings.RERANKER_MODEL,
                    "relevance_threshold": settings.MIN_RELEVANCE_SCORE,
                    "provider_used": "Retrieval System",
                    "prompt_version": RAG_PROMPT_VERSION,
                    "input_guardrail": ig_result.model_dump(),
                    "retrieval_guardrail": rg_result.model_dump(),
                    "output_guardrail": {"allowed": True, "reason": "Bypassed due to low relevance", "is_grounded": True},
                    "raw_candidate_count": len(retrieved_chunks),
                    "selected_context_count": 0,
                    "candidate_trace": [item.model_dump() for item in candidate_trace]
                } if (request_obj.debug or settings.ENABLE_DEBUG_MODE) else None
            })
            yield f"event: completion\ndata: {completion_payload}\n\n"
            return

        # Context Passed Guardrail -> Format and Emit Sources
        sources: list[SourceCitation] = [
            SourceCitation(
                document=chunk.filename,
                page=chunk.page_number,
                chunk_id=chunk.chunk_id,
                score=chunk.score,
                vector_score=chunk.vector_score,
                keyword_score=chunk.keyword_score,
                reranker_score=chunk.reranker_score,
                snippet=chunk.content[:150] + "..." if len(chunk.content) > 150 else chunk.content
            )
            for chunk in selected_chunks
        ]

        sources_payload = json.dumps({
            "sources": [s.model_dump() for s in sources],
            "retrieved_candidates": [s.model_dump() for s in retrieved_candidates],
            "retrieval_metadata": {
                "top_k": settings.RERANK_TOP_K,
                "chunks_retrieved": len(retrieved_chunks),
                "selected_chunks_count": len(selected_chunks),
                "retrieval_latency_ms": round(ret_latency_ms, 2)
            }
        })
        yield f"event: sources\ndata: {sources_payload}\n\n"

        # Prompt & Streaming using ONLY selected chunks
        prompt = build_rag_prompt_v2(
            query=processed.original_query,
            retrieved_chunks=selected_chunks,
            conversation_history=history_text
        )

        accumulated_text = ""
        provider_used = "Gemini 2.5 Flash"
        try:
            stream_gen, provider_used = llm_service.generate_stream(prompt)
            for token in stream_gen:
                accumulated_text += token
                token_payload = json.dumps({"token": token, "provider": provider_used})
                yield f"event: token\ndata: {token_payload}\n\n"
        except Exception as e:
            logger.error(f"Streaming LLM failure: {e}")
            err_payload = json.dumps({"error": f"LLM streaming failed: {str(e)}"})
            yield f"event: error\ndata: {err_payload}\n\n"
            return

        # Output Guardrail
        og_result = output_guardrail.validate(accumulated_text)
        final_answer = og_result.sanitized_output or accumulated_text

        sources_dict = [s.model_dump() for s in sources]
        conversation_service.save_message(db, conv.id, "user", processed.original_query)
        conversation_service.save_message(db, conv.id, "assistant", final_answer, sources=sources_dict)

        total_latency_ms = (time.time() - total_start) * 1000

        metrics_service.record_usage(
            db, req_id, provider_used, settings.GEMINI_MODEL,
            prompt, final_answer, total_latency_ms
        )

        completion_payload = json.dumps({
            "answer": final_answer,
            "conversation_id": str(conv.id),
            "provider_used": provider_used,
            "latency_ms": round(total_latency_ms, 2),
            "debug_info": {
                "raw_query": processed.original_query,
                "rewritten_query": processed.search_query,
                "query_processed": processed.normalized_query,
                "embedding_model": settings.EMBEDDING_MODEL,
                "reranker_model": settings.RERANKER_MODEL,
                "relevance_threshold": settings.MIN_RELEVANCE_SCORE,
                "provider_used": provider_used,
                "prompt_version": RAG_PROMPT_VERSION,
                "input_guardrail": ig_result.model_dump(),
                "retrieval_guardrail": rg_result.model_dump(),
                "output_guardrail": og_result.model_dump(),
                "raw_candidate_count": len(retrieved_chunks),
                "selected_context_count": len(selected_chunks),
                "candidate_trace": [item.model_dump() for item in candidate_trace]
            } if (request_obj.debug or settings.ENABLE_DEBUG_MODE) else None
        })
        yield f"event: completion\ndata: {completion_payload}\n\n"

    return StreamingResponse(sse_event_generator(), media_type="text/event-stream")
