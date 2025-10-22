from __future__ import annotations

from ..contracts.agent import AgentIO, AgentSpec
from ..runtime.context import ExecutionContext
from .registry import registry


class EchoInput(AgentIO):
    message: str


class EchoOutput(AgentIO):
    message: str


def echo_agent(payload: EchoInput, _: ExecutionContext) -> EchoOutput:
    return EchoOutput(message=payload.message)


registry.register(
    AgentSpec(
        name="echo",
        input_model=EchoInput,
        output_model=EchoOutput,
        run=echo_agent,
        tags={"category": "utility"},
    )
)

