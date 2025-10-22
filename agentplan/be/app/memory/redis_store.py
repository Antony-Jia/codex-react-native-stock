from __future__ import annotations

import json
from typing import Any, Dict, Optional

import redis


class KVStore:
    """
    Thin wrapper over Redis for plan and VFS persistence.
    """

    def __init__(self, redis_client: redis.Redis, prefix: str = "orchestrator") -> None:
        self._redis = redis_client
        self._prefix = prefix

    def _key(self, namespace: str, key: str) -> str:
        return f"{self._prefix}:{namespace}:{key}"

    def plan_set(self, tenant: str, plan_id: str, payload: Dict[str, Any]) -> None:
        self._redis.set(
            self._key("plan", f"{tenant}:{plan_id}"), json.dumps(payload, ensure_ascii=False)
        )

    def plan_get(self, tenant: str, plan_id: str) -> Optional[Dict[str, Any]]:
        value = self._redis.get(self._key("plan", f"{tenant}:{plan_id}"))
        return json.loads(value) if value else None

    def vfs_put(self, tenant: str, path: str, payload: Dict[str, Any]) -> None:
        self._redis.set(
            self._key("vfs", f"{tenant}:{path}"), json.dumps(payload, ensure_ascii=False)
        )

    def vfs_get(self, tenant: str, path: str) -> Optional[Dict[str, Any]]:
        value = self._redis.get(self._key("vfs", f"{tenant}:{path}"))
        return json.loads(value) if value else None

    def cache_get(self, agent: str, cache_key: str) -> Optional[Dict[str, Any]]:
        value = self._redis.get(self._key("cache", f"{agent}:{cache_key}"))
        return json.loads(value) if value else None

    def cache_set(self, agent: str, cache_key: str, payload: Dict[str, Any], ttl: int = 3600) -> None:
        self._redis.set(
            self._key("cache", f"{agent}:{cache_key}"),
            json.dumps(payload, ensure_ascii=False),
            ex=ttl,
        )

