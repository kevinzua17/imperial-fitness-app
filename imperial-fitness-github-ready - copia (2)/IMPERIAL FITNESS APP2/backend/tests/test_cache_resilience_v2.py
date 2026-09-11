from app.core.cache import CacheStore


class BrokenRedis:
    def get(self, _key):
        raise ConnectionError("redis unavailable")

    def setex(self, *_args):
        raise ConnectionError("redis unavailable")

    def scan_iter(self, *_args):
        raise ConnectionError("redis unavailable")


def test_cache_falls_back_to_memory_when_redis_fails():
    store = CacheStore()
    store.redis = BrokenRedis()
    store.set("exercise:test", {"ok": True}, ttl=30)
    assert store.redis is None
    assert store.get("exercise:test") == {"ok": True}


def test_delete_prefix_clears_memory_after_redis_failure():
    store = CacheStore()
    store.redis = BrokenRedis()
    store.memory["exercises:a"] = (9999999999, '{"id": 1}')
    store.memory["foods:a"] = (9999999999, '{"id": 2}')
    store.delete_prefix("exercises:")
    assert store.redis is None
    assert "exercises:a" not in store.memory
    assert "foods:a" in store.memory
