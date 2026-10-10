import pytest
from unittest.mock import patch, MagicMock

def test_health_endpoint(test_client):
    response = test_client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"

@patch("app.api.v1.health.engine.connect")
def test_readiness_endpoint(mock_connect, test_client):
    mock_conn = MagicMock()
    mock_conn.execute.return_value.fetchone.return_value = ("vector",)
    mock_connect.return_value.__enter__.return_value = mock_conn

    response = test_client.get("/ready")
    assert response.status_code == 200
    assert response.json()["ready"] is True
    assert response.json()["database"] == "ok"
    assert response.json()["pgvector"] == "ok"
