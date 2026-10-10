import pytest
from app.utils.rate_limiter import RateLimiter

def test_rate_limiter_sliding_window():
    limiter = RateLimiter(max_requests=2, window_seconds=60)
    client_ip = "192.168.1.100"

    assert limiter.is_rate_limited(client_ip) is False
    assert limiter.is_rate_limited(client_ip) is False
    assert limiter.is_rate_limited(client_ip) is True
