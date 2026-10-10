import time
import tiktoken
from typing import Dict, Any, Optional, List
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.models.db import LLMUsageLogModel
from app.utils.logging import get_logger

logger = get_logger(__name__)

# Price estimation rates per 1,000,000 tokens (USD)
PRICING_TABLE = {
    "gemini": {"input": 0.075, "output": 0.30},
    "groq": {"input": 0.59, "output": 0.79},
    "default": {"input": 0.10, "output": 0.40}
}

class MetricsService:
    def __init__(self):
        try:
            self.tokenizer = tiktoken.get_encoding("cl100k_base")
        except Exception:
            self.tokenizer = None

    def count_tokens(self, text: str) -> int:
        if not text:
            return 0
        if self.tokenizer:
            try:
                return len(self.tokenizer.encode(text))
            except Exception:
                pass
        # Fallback approximation (~4 chars per token)
        return max(1, len(text) // 4)

    def calculate_cost(self, provider: str, input_tokens: int, output_tokens: int) -> float:
        prov_key = "gemini" if "gemini" in provider.lower() else ("groq" if "groq" in provider.lower() else "default")
        rates = PRICING_TABLE.get(prov_key, PRICING_TABLE["default"])
        
        cost_in = (input_tokens / 1_000_000.0) * rates["input"]
        cost_out = (output_tokens / 1_000_000.0) * rates["output"]
        return round(cost_in + cost_out, 6)

    def record_usage(
        self,
        db: Session,
        request_id: str,
        provider: str,
        model: str,
        input_text: str,
        output_text: str,
        latency_ms: float
    ) -> LLMUsageLogModel:
        input_tokens = self.count_tokens(input_text)
        output_tokens = self.count_tokens(output_text)
        total_tokens = input_tokens + output_tokens
        cost = self.calculate_cost(provider, input_tokens, output_tokens)

        usage_record = LLMUsageLogModel(
            request_id=request_id,
            provider=provider,
            model=model,
            input_tokens=input_tokens,
            output_tokens=output_tokens,
            total_tokens=total_tokens,
            estimated_cost=cost,
            latency_ms=latency_ms
        )

        try:
            db.add(usage_record)
            db.commit()
            db.refresh(usage_record)
        except Exception as e:
            logger.error(f"Failed to record LLM usage log: {e}")
            db.rollback()

        return usage_record

    def get_dashboard_metrics(self, db: Session) -> Dict[str, Any]:
        """
        Calculates production observability metrics for admin dashboard.
        """
        try:
            total_records = db.query(func.count(LLMUsageLogModel.id)).scalar() or 0
            if total_records == 0:
                return {
                    "total_questions": 0,
                    "avg_latency_ms": 0.0,
                    "p95_latency_ms": 0.0,
                    "total_tokens": 0,
                    "avg_tokens": 0.0,
                    "total_cost_usd": 0.0,
                    "provider_breakdown": {},
                    "fallback_count": 0,
                    "guardrail_block_count": 0,
                    "retrieval_success_rate": 100.0,
                    "error_rate": 0.0
                }

            avg_lat = db.query(func.avg(LLMUsageLogModel.latency_ms)).scalar() or 0.0
            total_tok = db.query(func.sum(LLMUsageLogModel.total_tokens)).scalar() or 0
            avg_tok = db.query(func.avg(LLMUsageLogModel.total_tokens)).scalar() or 0.0
            total_cost = db.query(func.sum(LLMUsageLogModel.estimated_cost)).scalar() or 0.0

            # Calculate p95 latency
            all_latencies = [float(r[0]) for r in db.query(LLMUsageLogModel.latency_ms).order_by(LLMUsageLogModel.latency_ms.asc()).all()]
            p95_idx = int(len(all_latencies) * 0.95) - 1
            p95_lat = all_latencies[max(0, p95_idx)] if all_latencies else 0.0

            # Provider breakdown
            prov_rows = db.query(LLMUsageLogModel.provider, func.count(LLMUsageLogModel.id)).group_by(LLMUsageLogModel.provider).all()
            provider_breakdown = {prov: count for prov, count in prov_rows}

            fallback_count = sum(count for prov, count in provider_breakdown.items() if "groq" in prov.lower())
            guardrail_count = sum(count for prov, count in provider_breakdown.items() if "guardrail" in prov.lower())

            return {
                "total_questions": total_records,
                "avg_latency_ms": round(float(avg_lat), 2),
                "p95_latency_ms": round(float(p95_lat), 2),
                "total_tokens": int(total_tok),
                "avg_tokens": round(float(avg_tok), 1),
                "total_cost_usd": round(float(total_cost), 4),
                "provider_breakdown": provider_breakdown,
                "fallback_count": fallback_count,
                "guardrail_block_count": guardrail_count,
                "retrieval_success_rate": round(((total_records - guardrail_count) / max(1, total_records)) * 100, 1),
                "error_rate": 0.0
            }

        except Exception as e:
            logger.error(f"Error building metrics dashboard stats: {e}")
            return {"error": "Failed to compute observability metrics."}
