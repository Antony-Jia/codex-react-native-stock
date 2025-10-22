from __future__ import annotations

import threading
from typing import Any, Dict, Optional


class InMemoryKVStore:
    """
    Lightweight KV store used for local development without Redis.
    """

    def __init__(self) -> None:
        self._data: Dict[str, Dict[str, Any]] = {"plan": {}, "vfs": {}, "cache": {}}
        self._lock = threading.Lock()

    def plan_set(self, tenant: str, plan_id: str, payload: Dict[str, Any]) -> None:
        with self._lock:
            self._data["plan"][f"{tenant}:{plan_id}"] = payload

    def plan_get(self, tenant: str, plan_id: str) -> Optional[Dict[str, Any]]:
        with self._lock:
            return self._data["plan"].get(f"{tenant}:{plan_id}")

    def vfs_put(self, tenant: str, path: str, payload: Dict[str, Any]) -> None:
        with self._lock:
            self._data["vfs"][f"{tenant}:{path}"] = payload

    def vfs_get(self, tenant: str, path: str) -> Optional[Dict[str, Any]]:
        with self._lock:
            return self._data["vfs"].get(f"{tenant}:{path}")

    def cache_get(self, agent: str, cache_key: str) -> Optional[Dict[str, Any]]:
        with self._lock:
            return self._data["cache"].get(f"{agent}:{cache_key}")

    def cache_set(self, agent: str, cache_key: str, payload: Dict[str, Any], ttl: int = 3600) -> None:  # noqa: ARG002
        with self._lock:
            self._data["cache"][f"{agent}:{cache_key}"] = payload

