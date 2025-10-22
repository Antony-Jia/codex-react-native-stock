from __future__ import annotations

from typing import Any, Dict

from langgraph.graph import END, START, StateGraph

from ..agents.registry import AgentRegistry
from ..contracts.agent import AgentInvocation, AgentSpec
from ..contracts.plan import Plan, Step
from ..runtime.context import ExecutionContext
from .state import GraphState


def _substitute_payload(value: Any, results: Dict[str, AgentInvocation]) -> Any:
    """
    Recursively substitutes placeholders like "$step.result.field".
    """

    if isinstance(value, str) and value.startswith("$"):
        segments = value[1:].split(".", maxsplit=2)
        if not segments:
            return value
        step_id = segments[0]
        remainder = segments[1] if len(segments) > 1 else "output_payload"
        try:
            invocation = results[step_id]
        except KeyError as exc:
            raise KeyError(f"Missing dependency '{step_id}'") from exc
        current: Any = invocation.output_payload
        if remainder:
            for part in remainder.split("."):
                if current is None:
                    break
                current = current.get(part) if isinstance(current, dict) else None
        return current

    if isinstance(value, dict):
        return {k: _substitute_payload(v, results) for k, v in value.items()}

    if isinstance(value, list):
        return [_substitute_payload(item, results) for item in value]

    return value


class PlanCompiler:
    """
    Converts planner output into an executable LangGraph StateGraph.
    """

    def __init__(self, registry: AgentRegistry) -> None:
        self._registry = registry

    def compile(self, plan: Plan, ctx: ExecutionContext):
        state_graph = StateGraph(GraphState)

        def _build_node(step: Step, spec: AgentSpec):
            def _run(state: GraphState) -> GraphState:
                args = _substitute_payload(step.args, state["agent_results"])
                agent_input = spec.input_model(**args)
                result = spec.run(agent_input, ctx)
                invocation = AgentInvocation(
                    step_id=step.id,
                    agent=spec.name,
                    input_payload=agent_input.dict(),
                    output_payload=result.dict(),
                )
                state["agent_results"][step.id] = invocation
                return state

            return _run

        for step in plan.steps:
            spec = self._registry.get(step.action)
            state_graph.add_node(step.id, _build_node(step, spec))

        for step in plan.steps:
            targets = step.depends_on
            if not targets:
                state_graph.add_edge(START, step.id)
            else:
                for dep in targets:
                    state_graph.add_edge(dep, step.id)

        terminal_steps = {step.id for step in plan.steps}
        for step in plan.steps:
            for dep in step.depends_on:
                terminal_steps.discard(dep)

        for node_id in terminal_steps:
            state_graph.add_edge(node_id, END)

        return state_graph.compile()

