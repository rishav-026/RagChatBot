import time
from typing import List, Optional, Dict, Any
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import select, text, func

from app.models.db import DocumentChunkModel, DocumentModel
from app.rag.embeddings.service import EmbeddingService
from app.rag.retrieval.reranker import RerankerService
from app.config import settings
from app.utils.logging import get_logger

logger = get_logger(__name__)

class RetrievedChunk(BaseModel):
    chunk_id: str
    document_id: str
    filename: str
    content: str
    page_number: Optional[int]
    chunk_index: int
    score: float
    vector_score: Optional[float] = 0.0
    keyword_score: Optional[float] = 0.0
    reranker_score: Optional[float] = 0.0
    metadata: Dict[str, Any] = {}

class RetrievalService:
    def __init__(
        self,
        embedding_service: Optional[EmbeddingService] = None,
        reranker_service: Optional[RerankerService] = None
    ):
        self.embedding_service = embedding_service or EmbeddingService()
        self.reranker_service = reranker_service or RerankerService()

    def retrieve(
        self,
        db: Session,
        query: str,
        initial_k: int = settings.INITIAL_RETRIEVAL_K,
        top_k: int = settings.RERANK_TOP_K
    ) -> List[RetrievedChunk]:
        """
        Hybrid Retrieval Pipeline:
        1. Perform Vector Similarity Search (pgvector).
        2. Perform Keyword Full-Text Search (PostgreSQL tsvector).
        3. Merge candidate chunks using weighted score fusion.
        4. Pass top candidate chunks to local CrossEncoder Reranker.
        5. Return top_k reranked chunks.
        """
        start_time = time.time()
        candidate_dict: Dict[str, Dict[str, Any]] = {}

        # --- STEP 1: Vector Search ---
        try:
            query_vector = self.embedding_service.embed_query(query)
            if db.bind.dialect.name == "postgresql":
                cosine_dist = DocumentChunkModel.embedding.cosine_distance(query_vector)

                vec_stmt = (
                    select(
                        DocumentChunkModel,
                        DocumentModel.filename,
                        (1.0 - cosine_dist).label("v_score")
                    )
                    .join(DocumentModel, DocumentChunkModel.document_id == DocumentModel.id)
                    .order_by(cosine_dist.asc())
                    .limit(initial_k)
                )
                vec_results = db.execute(vec_stmt).all()

                for chunk_row, filename, v_score in vec_results:
                    cid = str(chunk_row.id)
                    score_v = max(0.0, min(1.0, float(v_score)))
                    candidate_dict[cid] = {
                        "row": chunk_row,
                        "filename": filename,
                        "v_score": score_v,
                        "k_score": 0.0
                    }
            else:
                # SQLite fallback vector cosine similarity in Python
                import numpy as np
                q_vec = np.array(query_vector, dtype=np.float32)
                q_norm = np.linalg.norm(q_vec)
                
                all_chunks_stmt = select(DocumentChunkModel, DocumentModel.filename).join(
                    DocumentModel, DocumentChunkModel.document_id == DocumentModel.id
                )
                all_chunks = db.execute(all_chunks_stmt).all()
                
                scored_chunks = []
                for item in all_chunks:
                    chunk_row = item[0]
                    filename = item[1]
                    sim = float(item[2]) if len(item) >= 3 else 0.0
                    emb = getattr(chunk_row, "embedding", None)
                    if isinstance(emb, str):
                        import json
                        try:
                            emb = json.loads(emb)
                        except Exception:
                            emb = None
                    if emb and len(item) < 3:
                        c_vec = np.array(emb, dtype=np.float32)
                        c_norm = np.linalg.norm(c_vec)
                        sim = float(np.dot(q_vec, c_vec) / (q_norm * c_norm)) if (q_norm > 0 and c_norm > 0) else 0.0
                    scored_chunks.append((chunk_row, filename, sim))
                
                scored_chunks.sort(key=lambda x: x[2], reverse=True)
                for chunk_row, filename, sim in scored_chunks[:initial_k]:
                    cid = str(chunk_row.id)
                    candidate_dict[cid] = {
                        "row": chunk_row,
                        "filename": filename,
                        "v_score": max(0.0, min(1.0, float(sim))),
                        "k_score": 0.0
                    }
        except Exception as e:
            logger.error(f"Vector search failed during hybrid retrieval: {e}")

        # --- STEP 2: Keyword Full-Text Search ---
        try:
            if getattr(db, "bind", None) and db.bind.dialect.name == "postgresql":
                cleaned_kw = " & ".join(query.strip().split())
                if cleaned_kw:
                    fts_query = func.plainto_tsquery('english', query)
                    fts_vector = func.to_tsvector('english', DocumentChunkModel.content)
                    rank_col = func.ts_rank_cd(fts_vector, fts_query)

                    kw_stmt = (
                        select(
                            DocumentChunkModel,
                            DocumentModel.filename,
                            rank_col.label("k_score")
                        )
                        .join(DocumentModel, DocumentChunkModel.document_id == DocumentModel.id)
                        .where(fts_vector.op("@@")(fts_query))
                        .order_by(rank_col.desc())
                        .limit(initial_k)
                    )
                    kw_results = db.execute(kw_stmt).all()

                    max_k_rank = max((r[2] for r in kw_results), default=1.0) or 1.0

                    for chunk_row, filename, k_rank in kw_results:
                        cid = str(chunk_row.id)
                        norm_k_score = max(0.0, min(1.0, float(k_rank) / float(max_k_rank)))

                        if cid in candidate_dict:
                            candidate_dict[cid]["k_score"] = norm_k_score
                        else:
                            candidate_dict[cid] = {
                                "row": chunk_row,
                                "filename": filename,
                                "v_score": 0.0,
                                "k_score": norm_k_score
                            }
            else:
                # SQLite keyword substring match fallback (clean punctuation and retain 2+ char acronyms)
                import re
                keywords = [re.sub(r'[^\w]', '', k).lower() for k in query.strip().split() if len(re.sub(r'[^\w]', '', k)) >= 2]
                keywords = [k for k in keywords if k]
                if keywords:
                    all_chunks_stmt = select(DocumentChunkModel, DocumentModel.filename).join(
                        DocumentModel, DocumentChunkModel.document_id == DocumentModel.id
                    )
                    all_chunks = db.execute(all_chunks_stmt).all()
                    for item in all_chunks:
                        chunk_row = item[0]
                        filename = item[1]
                        cid = str(chunk_row.id)
                        content_lower = chunk_row.content.lower()
                        match_count = sum(1 for kw in keywords if kw in content_lower)
                        if match_count > 0:
                            k_score = match_count / len(keywords)
                            if cid in candidate_dict:
                                candidate_dict[cid]["k_score"] = k_score
                            else:
                                candidate_dict[cid] = {
                                    "row": chunk_row,
                                    "filename": filename,
                                    "v_score": 0.0,
                                    "k_score": k_score
                                }
        except Exception as e:
            logger.warning(f"Keyword full-text search fallback: {e}")

        # --- STEP 3: Weighted Hybrid Fusion ---
        candidates: List[RetrievedChunk] = []
        for cid, data in candidate_dict.items():
            row = data["row"]
            v_score = data["v_score"]
            k_score = data["k_score"]
            
            hybrid_score = (settings.VECTOR_WEIGHT * v_score) + (settings.KEYWORD_WEIGHT * k_score)

            chunk_obj = RetrievedChunk(
                chunk_id=cid,
                document_id=str(row.document_id),
                filename=data["filename"],
                content=row.content,
                page_number=row.page_number,
                chunk_index=row.chunk_index,
                score=round(hybrid_score, 4),
                vector_score=round(v_score, 4),
                keyword_score=round(k_score, 4),
                reranker_score=0.0,
                metadata=row.metadata_ or {}
            )
            candidates.append(chunk_obj)

        # Sort candidates descending by hybrid score before reranking
        candidates.sort(key=lambda c: c.score, reverse=True)
        top_candidates = candidates[:initial_k]

        # --- STEP 4: Reranking ---
        final_chunks = self.reranker_service.rerank(query=query, chunks=top_candidates, top_k=top_k)

        latency = (time.time() - start_time) * 1000
        logger.info(
            f"Hybrid Retrieval & Reranking complete: query='{query[:30]}...', "
            f"candidates={len(candidates)}, top_reranked={len(final_chunks)}, latency={latency:.2f}ms"
        )
        return final_chunks
