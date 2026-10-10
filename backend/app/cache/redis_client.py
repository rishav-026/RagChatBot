import hashlib
import json
from typing import Optional, Any
from app.config import settings
from app.utils.logging import get_logger

logger = get_logger(__name__)

class RedisCacheManager:
    _instance = None
    _redis_client = None
    _is_available = False

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(RedisCacheManager, cls).__new__(cls)
        return cls._instance

    def __init__(self):
        if self._redis_client is None and settings.ENABLE_CACHE:
            try:
                import redis
                self._redis_client = redis.Redis.from_url(
                    settings.REDIS_URL,
                    socket_timeout=0.2,
                    decode_responses=True
                )
                # Test connection ping
                self._redis_client.ping()
                self._is_available = True
                logger.info(f"Successfully connected to Redis cache at {settings.REDIS_URL}")
            except Exception as e:
                self._is_available = False
                logger.warning(f"Redis unavailable ({e}). Operating in cache-bypass mode.")

    @property
    def is_available(self) -> bool:
        return self._is_available

    def generate_key(self, prefix: str, payload: Any) -> str:
        """
        Generates deterministic SHA-256 hash cache key.
        """
        raw_str = json.dumps(payload, sort_keys=True) if not isinstance(payload, str) else payload
        hashed = hashlib.sha256(raw_str.encode('utf-8')).hexdigest()
        return f"rag:{prefix}:{hashed[:16]}"

    def get(self, key: str) -> Optional[Any]:
        if not self._is_available or not settings.ENABLE_CACHE:
            return None
        try:
            val = self._redis_client.get(key)
            if val:
                logger.info(f"Cache HIT for key: {key}")
                return json.loads(val)
            return None
        except Exception as e:
            logger.warning(f"Redis get failure for key {key}: {e}")
            return None

    def set(self, key: str, value: Any, ttl: int = settings.CACHE_TTL_SECONDS) -> bool:
        if not self._is_available or not settings.ENABLE_CACHE:
            return False
        try:
            serialized = json.dumps(value)
            self._redis_client.setex(key, ttl, serialized)
            logger.info(f"Cache SET for key: {key} (TTL: {ttl}s)")
            return True
        except Exception as e:
            logger.warning(f"Redis set failure for key {key}: {e}")
            return False

    def invalidate_all(self) -> bool:
        """
        Invalidates all RAG cache entries when documents are uploaded, deleted, or reprocessed.
        """
        if not self._is_available:
            return False
        try:
            keys = self._redis_client.keys("rag:*")
            if keys:
                self._redis_client.delete(*keys)
                logger.info(f"Invalidated {len(keys)} RAG cache entries.")
            return True
        except Exception as e:
            logger.warning(f"Failed to invalidate RAG cache: {e}")
            return False
