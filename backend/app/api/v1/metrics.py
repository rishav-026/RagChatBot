from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.services.metrics_service import MetricsService

router = APIRouter(prefix="/metrics", tags=["Observability & Metrics"])
metrics_service = MetricsService()

@router.get("")
def get_observability_metrics(db: Session = Depends(get_db)):
    """
    Returns dashboard observability metrics:
    Questions, Latency (Avg, P95), Token Usage, Estimated Cost, Fallback Count, and Guardrail Blocks.
    """
    return metrics_service.get_dashboard_metrics(db)
