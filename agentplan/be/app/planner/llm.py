from __future__ import annotations

from dataclasses import dataclass, field
import json
from typing import Any, Dict, List, Optional

from langchain.agents import create_agent
from langchain.agents.middleware import wrap_tool_call
from langchain_core.messages import ToolMessage
from langchain_core.tools import StructuredTool
from pydantic import BaseModel, Field

from ..contracts.plan import Plan, Step
from ..graph.exporter import plan_to_snapshot
from ..runtime.llm import LLMClient
from ..planner.catalog import PlannerTool, build_tool_catalog


class PlannerUnavailableError(RuntimeError):
    """Raised when the planner cannot be used (e.g., LLM missing)."""


@dataclass
class PlannerSession:
    tenant: str
    plan_id: str
    goal: str
    kv_store: Any
    steps: List[Step] = field(default_factory=list)
    memory_records: List[Dict[str, Any]] = field(default_factory=list)
    plan: Optional[Plan] = None

    def add_step(
        self,
        *,
        action: str,
        objective: str,
        args: Dict[str, Any],
        depends_on: List[str],
        step_id: Optional[str] = None,
    ) -> str:
        if not objective:
            raise ValueError("objective is required to register a step.")
        step_id = step_id or str(len(self.steps) + 1)
        step = Step(
            id=step_id,
            action=action,
            objective=objective,
            depends_on=depends_on,
            args=args,
        )
        # Ensure unique IDs by replacing any existing step with same id.
        self.steps = [existing for existing in self.steps if existing.id != step_id]
        self.steps.append(step)
        return step_id

    def store_memory(self, path: str, payload: Dict[str, Any], note: Optional[str] = None) -> None:
        self.kv_store.vfs_put(self.tenant, path, payload)
        self.memory_records.append({"path": path, "payload": payload, "note": note})

    def finalize_plan(self, description: str, notes: Optional[str] = None, extra_meta: Optional[Dict[str, Any]] = None) -> Plan:
        if not self.steps:
            raise ValueError("No steps have been registered. Use the agent tools to add steps before saving.")
        meta = {"generated_by": "llm-planner", "goal": self.goal}
        if notes:
            meta["notes"] = notes
        if extra_meta:
            meta.update(extra_meta)
        ordered_steps = sorted(self.steps, key=lambda step: step.id)
        self.steps = ordered_steps
        plan = Plan(description=description, steps=ordered_steps, meta=meta)
        self.kv_store.plan_set(self.tenant, self.plan_id, plan.dict())

        summary_payload = {
            "goal": self.goal,
            "description": description,
            "step_count": len(self.steps),
            "steps": [
                {"id": step.id, "action": step.action, "objective": step.objective, "depends_on": step.depends_on}
                for step in self.steps
            ],
            "notes": notes,
        }
        summary_path = f"plans/{self.tenant}/{self.plan_id}/summary.json"
        self.store_memory(summary_path, summary_payload, note="Plan summary")
        for step in self.steps:
            step_path = f"plans/{self.tenant}/{self.plan_id}/steps/{step.id}.json"
            step_payload = {
                "objective": step.objective,
                "action": step.action,
                "depends_on": step.depends_on,
                "args": step.args,
            }
            self.store_memory(step_path, step_payload, note=f"Step {step.id} detail")
        self.plan = plan
        return plan


class StepRegistrationArgs(BaseModel):
    objective: Optional[str] = Field(
        default=None, description="Specific goal for this step. Provide if you want to override defaults."
    )
    depends_on: List[str] = Field(default_factory=list, description="A list of step IDs this step depends on.")
    args: Dict[str, Any] = Field(default_factory=dict, description="Arguments that map to the agent input schema.")
    step_id: Optional[str] = Field(default=None, description="Optional explicit step ID.")


class UpsertPlanArgs(BaseModel):
    description: str = Field(..., description="One-sentence overview of the full plan.")
    notes: Optional[str] = Field(default=None, description="Any additional remarks, constraints, or TODOs.")
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Extra metadata to persist with the plan.")


class ReadPlanArgs(BaseModel):
    plan_id: str = Field(..., description="The plan identifier to retrieve.")


class PutVFSArgs(BaseModel):
    path: str = Field(..., description="VFS path to persist the payload against.")
    payload: Dict[str, Any] = Field(..., description="Serializable content to store.")
    note: Optional[str] = Field(default=None, description="Optional annotation describing the payload.")


class GetVFSArgs(BaseModel):
    path: str = Field(..., description="VFS path to read from.")


@wrap_tool_call
def handle_tool_errors(request, handler):
    """
    Relay tool execution errors back to the model as friendly messages.
    """

    try:
        return handler(request)
    except Exception as exc:  # pragma: no cover - defensive
        return ToolMessage(
            content=f"Tool error: Please revise your inputs and try again. ({exc})",
            tool_call_id=request.tool_call["id"],
        )


class LLMPlanner:
    """
    Turns natural language goals into executable plans using a LangChain agent.
    """

    def __init__(self, llm: Optional[LLMClient], kv_store: Any) -> None:
        self._llm = llm
        self._kv = kv_store

    def available(self) -> bool:
        return self._llm is not None

    def generate_plan(
        self,
        tenant: str,
        plan_id: str,
        goal: str,
        *,
        tools: Optional[List[PlannerTool]] = None,
        metadata: Optional[Dict[str, str]] = None,
    ) -> Dict[str, Any]:
        if not self._llm:
            raise PlannerUnavailableError("LLM planner is not configured.")

        catalog = build_tool_catalog(tools)
        session = PlannerSession(tenant=tenant, plan_id=plan_id, goal=goal, kv_store=self._kv)

        planning_tools: List[StructuredTool] = []

        def make_agent_tool(tool: PlannerTool) -> StructuredTool:
            description = (
                f"{tool.description} Inputs: {', '.join(tool.inputs)}. Outputs: {', '.join(tool.outputs)}. "
                "Use this tool to register a plan step that will invoke the agent during execution."
            )

            def _run(
                objective: Optional[str] = None,
                depends_on: Optional[List[str]] = None,
                args: Optional[Dict[str, Any]] = None,
                step_id: Optional[str] = None,
            ) -> str:
                final_objective = objective or tool.default_objective
                if not final_objective:
                    raise ValueError("objective is required for each step.")
                assigned_id = session.add_step(
                    action=tool.name,
                    objective=final_objective,
                    args=args or {},
                    depends_on=depends_on or [],
                    step_id=step_id,
                )
                return f"Registered step {assigned_id} for {tool.name}."

            return StructuredTool.from_function(
                func=_run,
                name=tool.name,
                description=description,
                args_schema=StepRegistrationArgs,
            )

        def upsert_plan_tool(description: str, notes: Optional[str] = None, metadata: Optional[Dict[str, Any]] = None) -> str:
            session.finalize_plan(description=description, notes=notes, extra_meta=metadata)
            return "Plan persisted successfully."

        def read_plan_tool(plan_id: str) -> str:
            plan_payload = self._kv.plan_get(tenant, plan_id)
            if not plan_payload:
                return "No existing plan found."
            return json.dumps(plan_payload, ensure_ascii=False)

        def put_vfs_tool(path: str, payload: Dict[str, Any], note: Optional[str] = None) -> str:
            session.store_memory(path, payload, note)
            return f"Stored payload at {path}."

        def get_vfs_tool(path: str) -> str:
            payload = self._kv.vfs_get(tenant, path)
            if payload is None:
                return "No payload stored under that path."
            return json.dumps(payload, ensure_ascii=False)

        # Build tool list: memory tools first to mirror catalog order.
        for tool in catalog:
            if tool.category == "memory":
                if tool.name == "upsert_plan":
                    planning_tools.append(
                        StructuredTool.from_function(
                            func=upsert_plan_tool,
                            name="upsert_plan",
                            description=tool.description,
                            args_schema=UpsertPlanArgs,
                        )
                    )
                elif tool.name == "read_plan":
                    planning_tools.append(
                        StructuredTool.from_function(
                            func=read_plan_tool,
                            name="read_plan",
                            description=tool.description,
                            args_schema=ReadPlanArgs,
                        )
                    )
                elif tool.name == "put_vfs":
                    planning_tools.append(
                        StructuredTool.from_function(
                            func=put_vfs_tool,
                            name="put_vfs",
                            description=tool.description,
                            args_schema=PutVFSArgs,
                        )
                    )
                elif tool.name == "get_vfs":
                    planning_tools.append(
                        StructuredTool.from_function(
                            func=get_vfs_tool,
                            name="get_vfs",
                            description=tool.description,
                            args_schema=GetVFSArgs,
                        )
                    )
            else:
                planning_tools.append(make_agent_tool(tool))

        chat_model = self._llm.chat_model()
        system_prompt = (
            "You are a senior orchestrator responsible for converting goals into executable LangGraph plans. "
            "Use the available tools to register each step, persist contextual memories, and finally save the plan. "
            "Every step must include an explicit objective and reference dependencies when relevant. "
            "Store key assumptions or artefacts to the VFS using put_vfs. "
            "Finish by calling upsert_plan once the plan is ready."
        )
        tool_summary_lines = [
            f"- {tool.name} ({tool.category}) :: {tool.description}"
            for tool in catalog
        ]
        tool_summary_text = "\n".join(tool_summary_lines)
        tool_summary_text = "".join(tool_summary_lines)

        existing_plan_payload = self._kv.plan_get(tenant, plan_id)
        existing_plan_str = json.dumps(existing_plan_payload, ensure_ascii=False, indent=2) if existing_plan_payload else "None"

        agent = create_agent(
            model=chat_model,
            tools=planning_tools,
            middleware=[handle_tool_errors],
            system_prompt=system_prompt,
        )

        user_message = (
            f"Goal: {goal}\n"
            f"Tenant: {tenant}\n"
            f"Plan ID: {plan_id}\n"
            f"Available tools:\n{tool_summary_text}\n"
            f"Existing plan snapshot:\n{existing_plan_str}\n\n"
            "Plan requirements:\n"
            "1. Break the task into 2-6 ordered steps using the specific agent tools.\n"
            "2. Provide a concise objective for each step and ensure dependencies are accurate.\n"
            "3. Persist key notes or intermediate data via put_vfs so downstream agents can reuse them.\n"
            "4. Summarise the plan and call upsert_plan when ready. Include notes about open questions or assumptions.\n"
            "5. Avoid executing business logic—only plan and document."
        )

        try:
            agent.invoke({"messages": [{"role": "user", "content": user_message}]})
        except Exception as exc:
            raise ValueError(f"Planner execution failed: {exc}") from exc

        if not session.plan:
            raise RuntimeError("Planner did not persist a plan. Ensure upsert_plan tool is invoked.")

        snapshot = plan_to_snapshot(session.plan)
        response: Dict[str, Any] = {
            "plan": session.plan,
            "graph_json": snapshot.dict(),
            "tenant": tenant,
            "plan_id": plan_id,
            "memory_records": session.memory_records,
        }
        if metadata:
            response["metadata"] = metadata
        return response
