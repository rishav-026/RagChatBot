import pytest

def test_chat_api_empty_message(test_client):
    response = test_client.post("/api/v1/chat", json={"message": "   "})
    assert response.status_code == 422 or response.status_code == 400

def test_chat_api_missing_message(test_client):
    response = test_client.post("/api/v1/chat", json={})
    assert response.status_code == 422

def test_upload_invalid_extension(test_client):
    files = {"file": ("script.exe", b"binary data", "application/octet-stream")}
    response = test_client.post("/api/v1/documents/upload", files=files)
    assert response.status_code == 400
    assert "Unsupported file format" in response.json()["detail"]
