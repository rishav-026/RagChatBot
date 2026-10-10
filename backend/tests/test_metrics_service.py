import pytest
from app.services.metrics_service import MetricsService

def test_metrics_service_token_counting():
    service = MetricsService()
    text = "What is the company's annual leave entitlement?"
    count = service.count_tokens(text)
    assert isinstance(count, int)
    assert count > 0

def test_metrics_service_cost_calculation():
    service = MetricsService()
    # 1,000,000 input tokens for gemini = $0.075
    cost = service.calculate_cost("Gemini (gemini-2.5-flash)", 1_000_000, 1_000_000)
    assert cost == round(0.075 + 0.30, 6)
