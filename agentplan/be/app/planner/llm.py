from __future__ import annotations

import json
from typing import Any, Dict, List, Optional

from ..contracts.plan import Plan
from ..graph.exporter import plan_to_snapshot
from ..runtime.llm import LLMClient
from .catalog import DEFAULT_TOOLS, PlannerTool


class PlannerUnavailableError(RuntimeError):
    """Raised when the planner cannot be used (e.g., LLM missing)."""


class LLMPlanner:
    """
    Turns natural language goals into executable plans using an LLM.
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
    ) -> Dict[str, object]:
        if not self._llm:
            raise PlannerUnavailableError("LLM planner is not configured.")

        toolset = tools or DEFAULT_TOOLS
        tool_descriptions = "\n".join(
            f"- {tool.name}: {tool.description}\n  Inputs: {', '.join(tool.inputs)}\n  Outputs: {', '.join(tool.outputs)}"
            for tool in toolset
        )
        tool_names = ", ".join(tool.name for tool in toolset)

        system_prompt = (
            "You are a planning assistant that composes multi-step execution plans for a LangGraph "
            "orchestration engine. Use only the provided tools. Steps must have unique string IDs, "
            "define dependencies via `depends_on`, and specify arguments under `args`. "
            "Return JSON that conforms exactly to the Plan schema."
        )

        schema_hint = json.dumps(
            {
                "description": "string",
                "steps": [
                    {
                        "id": "string e.g. '1'",
                        "action": "tool name",
                        "depends_on": ["ids"],
                        "args": {"key": "value"},
                    }
                ],
                "meta": {"generated_by": "planner", "goal": "original user goal"},
            },
            indent=2,
        )

        user_prompt = f"""Goal:
{goal}

Available tools:
{tool_descriptions}

Rules:
- Only use tools from this list: {tool_names}.
- Keep plans concise (<= 6 steps) and respect tool input/output semantics.
- Ensure dependencies reference earlier step IDs.
- Populate meta.generated_by with "llm-planner" and meta.goal with the user's goal.

Return JSON matching this template:
{schema_hint}
"""

        structured = self._llm.generate_structured(system_prompt, user_prompt)
        plan = Plan(**structured)
        plan.meta.setdefault("generated_by", "llm-planner")
        plan.meta.setdefault("goal", goal)
        if not plan.description:
            plan.description = f"Plan for {goal}"

        # Persist plan for subsequent executions.
        self._kv.plan_set(tenant, plan_id, plan.dict())

        snapshot = plan_to_snapshot(plan)
        result: Dict[str, object] = {
            "plan": plan,
            "graph_json": snapshot.dict(),
            "tenant": tenant,
            "plan_id": plan_id,
        }
        if metadata:
            result["metadata"] = metadata
        return result
