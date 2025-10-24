from __future__ import annotations

from typing import Any, Dict, List
from uuid import uuid4

from ..agents import echo, polisher, writer  # noqa: F401 - ensure agents register on import
from ..agents.registry import registry as agent_registry
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
from ..contracts.plan import Plan, Step
from ..graph.exporter import plan_to_snapshot
from ..graph.plan_compile import PlanCompiler
from ..graph.state import GraphState
from ..memory.in_memory import InMemoryKVStore
from ..runtime.context import ExecutionContext
from ..runtime.config import get_settings
from ..runtime.llm import LLMClient, LLMConfigurationError
from ..planner.catalog import PlannerTool
from ..planner.llm import LLMPlanner


class OrchestratorService:
    """
    High level facade orchestrating plan execution and persistence.
    """

    def __init__(self, kv_store: Any | None = None) -> None:
        self._kv = kv_store or InMemoryKVStore()
        self._compiler = PlanCompiler(agent_registry)
        self._runs: Dict[str, Dict[str, Any]] = {}
        self._settings = get_settings()
        try:
            self._llm_client = LLMClient(self._settings)
        except LLMConfigurationError:
            self._llm_client = None
        self._planner = LLMPlanner(self._llm_client, self._kv)
        self._ensure_default_plan()

    def create_run(self, request: RunRequest) -> RunResponse:
        plan_id = request.options.get("plan_id")
        if not plan_id:
            raise ValueError("options.plan_id is required")

        plan_payload = self._kv.plan_get(request.tenant, plan_id)
        if not plan_payload:
            raise ValueError(f"Plan '{plan_id}' not found for tenant '{request.tenant}'")

        plan = Plan(**plan_payload)
        run_id = request.options.get("run_id") or uuid4().hex
        ctx = ExecutionContext(
            run_id=run_id,
            tenant=request.tenant,
            kv_store=self._kv,
            metadata=request.options,
            llm_client=self._llm_client,
        )

        graph = self._compiler.compile(plan, ctx)
        state: GraphState = {"agent_results": {}}
        status = "completed"
        error: str | None = None

        try:
            graph.invoke(state)
        except Exception as exc:  # pragma: no cover - defensive
            status = "failed"
            error = str(exc)

        snapshot = plan_to_snapshot(plan)
        self._runs[run_id] = {
            "status": status,
            "state": state,
            "graph": snapshot.dict(),
            "error": error,
        }

        return RunResponse(run_id=run_id, status=status)

    def get_run(self, run_id: str) -> RunStatus:
        run = self._runs.get(run_id)
        if not run:
            raise ValueError(f"Run '{run_id}' not found")
        payload = {
            "run_id": run_id,
            "status": run["status"],
            "graph_json": run["graph"],
            "metrics": {"error": run["error"]} if run["error"] else {},
        }
        return RunStatus(**payload)

    def upsert_plan(self, payload: PlanUpsertRequest) -> Dict[str, Any]:
        self._kv.plan_set(payload.tenant, payload.plan_id, payload.plan.dict())
        return {"plan_id": payload.plan_id, "tenant": payload.tenant}

    def read_plan(self, tenant: str, plan_id: str) -> Dict[str, Any]:
        plan = self._kv.plan_get(tenant, plan_id)
        if not plan:
            raise ValueError(f"Plan '{plan_id}' not found for tenant '{tenant}'")
        return plan

    def put_vfs(self, payload: VFSObject) -> Dict[str, Any]:
        self._kv.vfs_put(payload.tenant, payload.path, payload.payload)
        return {"path": payload.path, "tenant": payload.tenant}

    def get_vfs(self, tenant: str, path: str) -> Dict[str, Any]:
        value = self._kv.vfs_get(tenant, path)
        if value is None:
            raise ValueError(f"VFS path '{path}' not found for tenant '{tenant}'")
        return value

    def hitl_reply(self, payload: HITLReply) -> Dict[str, Any]:
        run = self._runs.get(payload.run_id)
        if not run:
            raise ValueError(f"Run '{payload.run_id}' not found")
        replies = run.setdefault("hitl", {})
        replies[payload.node_id] = payload.content
        return {"run_id": payload.run_id, "node_id": payload.node_id}

    def generate_plan(self, payload: PlanGenerationRequest) -> PlanGenerationResponse:
        if not self._planner.available():
            raise ValueError("Planner is not configured. Provide OpenAI credentials in the .env file.")

        tools: List[PlannerTool] | None = None
        if payload.agents:
            tools = [
                PlannerTool(
                    name=agent.name,
                    description=agent.description,
                    inputs=agent.inputs,
                    outputs=agent.outputs,
                )
                for agent in payload.agents
            ]

        result = self._planner.generate_plan(
            tenant=payload.tenant,
            plan_id=payload.plan_id,
            goal=payload.goal,
            tools=tools,
            metadata=payload.metadata,
        )
        metadata = (result.get("metadata") if isinstance(result, dict) else None) or payload.metadata or {}

        return PlanGenerationResponse(
            plan=result["plan"],
            graph_json=result["graph_json"],
            tenant=result["tenant"],
            plan_id=result["plan_id"],
            metadata=metadata,
        )

    def _ensure_default_plan(self) -> None:
        """
        Seed a starter plan so the frontend can load without manual setup.
        """

        sentinel_tenant = "demo"
        sentinel_plan = "default-plan"
        if self._kv.plan_get(sentinel_tenant, sentinel_plan):
            return

        default_plan = Plan(
            description="Seed plan for development walkthrough",
            steps=[
                Step(id="1", action="echo", args={"message": "Hello from agentplan!"}),
            ],
        )
        self._kv.plan_set(sentinel_tenant, sentinel_plan, default_plan.dict())


service = OrchestratorService()
