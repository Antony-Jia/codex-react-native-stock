from __future__ import annotations

from typing import Any, Dict, Optional

from pydantic import BaseModel, Field

from .plan import Plan


class RunRequest(BaseModel):
    user_input: str
    tenant: str
    options: Dict[str, Any] = Field(default_factory=dict)


class RunResponse(BaseModel):
    run_id: str
    status: str


class RunStatus(BaseModel):
    run_id: str
    status: str
    graph_json: Optional[Dict[str, Any]] = None
    metrics: Dict[str, Any] = Field(default_factory=dict)


class PlanUpsertRequest(BaseModel):
    tenant: str
    plan_id: str
    plan: Plan


class VFSObject(BaseModel):
    tenant: str
    path: str
    payload: Dict[str, Any]


class HITLReply(BaseModel):
    run_id: str
    node_id: str
    content: Dict[str, Any]

