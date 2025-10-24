from __future__ import annotations

from typing import Any, Dict, List, Optional

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


class PlannerAgentConfig(BaseModel):
    name: str
    description: str
    inputs: List[str] = Field(default_factory=list)
    outputs: List[str] = Field(default_factory=list)


class PlanGenerationRequest(BaseModel):
    tenant: str
    plan_id: str
    goal: str
    agents: Optional[List[PlannerAgentConfig]] = None
    metadata: Dict[str, Any] = Field(default_factory=dict)


class MemoryRecord(BaseModel):
    path: str
    payload: Dict[str, Any]
    note: Optional[str] = None


class PlanGenerationResponse(BaseModel):
    plan: Plan
    graph_json: Dict[str, Any]
    tenant: str
    plan_id: str
    metadata: Dict[str, Any] = Field(default_factory=dict)
    memory_records: List[MemoryRecord] = Field(default_factory=list)
