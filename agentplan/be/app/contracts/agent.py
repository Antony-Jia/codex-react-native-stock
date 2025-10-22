from __future__ import annotations

from typing import Any, Callable, Dict, Optional, Type, TYPE_CHECKING

from pydantic import BaseModel, Field


if TYPE_CHECKING:
    from ..runtime.context import ExecutionContext


class AgentIO(BaseModel):
    """Base class for agent inputs and outputs."""


class AgentSpec(BaseModel):
    """
    Declarative specification for an agent used by the registry.
    """

    name: str
    input_model: Type[AgentIO]
    output_model: Type[AgentIO]
    run: Callable[[AgentIO, "ExecutionContext"], AgentIO]
    tags: Dict[str, Any] = Field(default_factory=dict)


class AgentInvocation(BaseModel):
    """
    Execution wrapper that stores agent arguments and results for tracing.
    """

    step_id: str
    agent: str
    input_payload: Dict[str, Any]
    output_payload: Optional[Dict[str, Any]] = None
    error: Optional[str] = None


class AgentExecutionError(RuntimeError):
    """Raised when an agent fails during execution."""

