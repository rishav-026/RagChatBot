import time
from collections import defaultdict
from fastapi import Request, HTTPException, status
from app.config import settings
from app.utils.logging import get_logger

logger = get_logger(__name__)

class RateLimiter:
    """
    Sliding window in-memory rate limiter per client IP address.
    """

    def __init__(self, max_requests: int = settings.RATE_LIMIT_REQUESTS_PER_MINUTE, window_seconds: int = 60):
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self.client_records = defaultdict(list)

    def is_rate_limited(self, client_ip: str) -> bool:
        now = time.time()
        window_start = now - self.window_seconds

        # Prune timestamps older than sliding window
        timestamps = [ts for ts in self.client_records[client_ip] if ts > window_start]
        self.client_records[client_ip] = timestamps

        if len(timestamps) >= self.max_requests:
            return True

        self.client_records[client_ip].append(now)
        return False

rate_limiter = RateLimiter()

def check_rate_limit(request: Request):
    client_ip = request.client.host if request.client else "unknown"
    if rate_limiter.is_rate_limited(client_ip):
        logger.warning(f"Rate limit exceeded for IP: {client_ip}")
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Rate limit exceeded ({settings.RATE_LIMIT_REQUESTS_PER_MINUTE} requests/min). Please try again shortly."
        )
