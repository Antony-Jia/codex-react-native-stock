from __future__ import annotations

from typing import Dict

from ..contracts.agent import AgentSpec, AgentExecutionError


class AgentRegistry:
    """
    Stores agent specs and resolves them during plan execution.
    """

    def __init__(self) -> None:
        self._agents: Dict[str, AgentSpec] = {}

    def register(self, spec: AgentSpec) -> AgentSpec:
        if spec.name in self._agents:
            raise ValueError(f"Agent '{spec.name}' already registered")
        self._agents[spec.name] = spec
        return spec

    def get(self, name: str) -> AgentSpec:
        try:
            return self._agents[name]
        except KeyError as exc:
            raise AgentExecutionError(f"Unknown agent '{name}'") from exc

    def list(self) -> Dict[str, AgentSpec]:
        return dict(self._agents)


registry = AgentRegistry()

