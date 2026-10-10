import pytest
from unittest.mock import MagicMock
from fastapi.testclient import TestClient
from app.main import app
from app.database.session import get_db

@pytest.fixture
def mock_db_session():
    db = MagicMock()
    return db

@pytest.fixture
def test_client(mock_db_session):
    app.dependency_overrides[get_db] = lambda: mock_db_session
    client = TestClient(app)
    yield client
    app.dependency_overrides.clear()
