from fastapi import APIRouter, HTTPException

from ..contracts.api import (
    HITLReply,
    PlanGenerationRequest,
    PlanGenerationResponse,
    PlanUpsertRequest,
    RunRequest,
    RunResponse,
    RunStatus,
    VFSObject,
)
from ..runtime.service import service


api_router = APIRouter(prefix="/api")


@api_router.post("/runs", response_model=RunResponse)
def create_run(payload: RunRequest) -> RunResponse:
    try:
        return service.create_run(payload)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@api_router.post("/planner/generate", response_model=PlanGenerationResponse)
def generate_plan(payload: PlanGenerationRequest) -> PlanGenerationResponse:
    try:
        return service.generate_plan(payload)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@api_router.get("/runs/{run_id}", response_model=RunStatus)
def get_run(run_id: str) -> RunStatus:
    try:
        return service.get_run(run_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@api_router.post("/plans")
def upsert_plan(payload: PlanUpsertRequest) -> dict:
    return service.upsert_plan(payload)


@api_router.get("/plans/{tenant}/{plan_id}")
def read_plan(tenant: str, plan_id: str) -> dict:
    try:
        return service.read_plan(tenant, plan_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@api_router.put("/vfs")
def put_vfs(payload: VFSObject) -> dict:
    return service.put_vfs(payload)


@api_router.get("/vfs/{tenant}/{path:path}")
def get_vfs(tenant: str, path: str) -> dict:
    try:
        return service.get_vfs(tenant, path)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@api_router.post("/hitl")
def hitl_reply(payload: HITLReply) -> dict:
    try:
        return service.hitl_reply(payload)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
