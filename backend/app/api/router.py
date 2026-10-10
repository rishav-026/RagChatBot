from fastapi import APIRouter
from app.api.v1.health import router as health_router
from app.api.v1.documents import router as documents_router
from app.api.v1.chat import router as chat_router
from app.api.v1.metrics import router as metrics_router

api_router = APIRouter()

# Include health routes at root level (/health, /ready)
api_router.include_router(health_router)

# Include v1 API routes (/api/v1/...)
v1_router = APIRouter(prefix="/api/v1")
v1_router.include_router(health_router)
v1_router.include_router(documents_router)
v1_router.include_router(chat_router)
v1_router.include_router(metrics_router)

api_router.include_router(v1_router)
