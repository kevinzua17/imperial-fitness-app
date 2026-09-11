import json
import time
from typing import Any

from app.core.config import get_settings


class CacheStore:
    def __init__(self):
        self.settings = get_settings()
        self.memory: dict[str, tuple[float, str]] = {}
        self.redis = None
        if self.settings.redis_url:
            try:
                from redis import Redis

                self.redis = Redis.from_url(self.settings.redis_url, decode_responses=True)
            except Exception:
                self.redis = None

    def get(self, key: str) -> Any | None:
        if self.redis:
            raw = self.redis.get(key)
            return json.loads(raw) if raw else None
        item = self.memory.get(key)
        if not item:
            return None
        expires_at, raw = item
        if expires_at < time.time():
            self.memory.pop(key, None)
            return None
        return json.loads(raw)

    def set(self, key: str, value: Any, ttl: int | None = None) -> None:
        ttl = ttl or self.settings.cache_ttl_seconds
        raw = json.dumps(value, default=str, ensure_ascii=False)
        if self.redis:
            self.redis.setex(key, ttl, raw)
            return
        self.memory[key] = (time.time() + ttl, raw)

    def delete_prefix(self, prefix: str) -> None:
        if self.redis:
            for key in self.redis.scan_iter(f"{prefix}*"):
                self.redis.delete(key)
            return
        for key in list(self.memory.keys()):
            if key.startswith(prefix):
                self.memory.pop(key, None)


cache = CacheStore()