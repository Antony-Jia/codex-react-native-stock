from __future__ import annotations

from ..contracts.agent import AgentExecutionError, AgentIO, AgentSpec
from ..runtime.context import ExecutionContext
from .registry import registry


class DraftWriterInput(AgentIO):
    brief: str
    key_points: list[str] | None = None
    tone: str | None = None


class DraftWriterOutput(AgentIO):
    draft: str


def draft_writer_agent(payload: DraftWriterInput, ctx: ExecutionContext) -> DraftWriterOutput:
    llm = ctx.llm_client
    if not llm:
        raise AgentExecutionError("LLM client is not configured for draft_writer.")

    key_points = "\n".join(f"- {point}" for point in payload.key_points or [])
    system_prompt = "You are a helpful writing assistant that produces structured drafts."
    user_prompt = (
        f"Brief:\n{payload.brief}\n\n"
        f"Key points:\n{key_points or 'None provided.'}\n\n"
        f"Tone: {payload.tone or 'balanced professional'}\n\n"
        "Produce a concise draft that covers the key points."
    )
    text = llm.generate_text(system_prompt, user_prompt, temperature=0.4, max_tokens=600)
    if not text:
        raise AgentExecutionError("Draft writer returned an empty response.")
    return DraftWriterOutput(draft=text)


registry.register(
    AgentSpec(
        name="draft_writer",
        input_model=DraftWriterInput,
        output_model=DraftWriterOutput,
        run=draft_writer_agent,
        tags={"category": "content", "llm": True},
    )
)
