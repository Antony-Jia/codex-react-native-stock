from __future__ import annotations

from typing import Dict, TypedDict

from ..contracts.agent import AgentInvocation


class GraphState(TypedDict):
    """
    Runtime state passed between LangGraph nodes.
    """

    agent_results: Dict[str, AgentInvocation]

