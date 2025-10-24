from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Dict, Optional

from ..memory.redis_store import KVStore
from .llm import LLMClient


@dataclass
class ExecutionContext:
    """
    Shared runtime information passed to agents during execution.
    """

    run_id: str
    tenant: str
    kv_store: KVStore
    metadata: Optional[Dict[str, Any]] = None
    llm_client: Optional[LLMClient] = None
