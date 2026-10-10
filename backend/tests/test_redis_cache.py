import pytest
from app.cache.redis_client import RedisCacheManager

def test_redis_key_generation():
    manager = RedisCacheManager()
    key1 = manager.generate_key("chat", {"q": "test query"})
    key2 = manager.generate_key("chat", {"q": "test query"})
    key3 = manager.generate_key("chat", {"q": "different query"})

    assert key1.startswith("rag:chat:")
    assert key1 == key2
    assert key1 != key3

def test_redis_graceful_fallback():
    manager = RedisCacheManager()
    # Test that get returns None gracefully if Redis is not running locally
    result = manager.get("non_existent_key")
    assert result is None
