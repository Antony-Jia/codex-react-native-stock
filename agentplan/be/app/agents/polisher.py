from __future__ import annotations

from ..contracts.agent import AgentExecutionError, AgentIO, AgentSpec
from ..runtime.context import ExecutionContext
from .registry import registry


class ContentPolisherInput(AgentIO):
    draft: str
    tone: str | None = None
    audience: str | None = None


class ContentPolisherOutput(AgentIO):
    revised_draft: str


def content_polisher_agent(payload: ContentPolisherInput, ctx: ExecutionContext) -> ContentPolisherOutput:
    llm = ctx.llm_client
    if not llm:
        raise AgentExecutionError("LLM client is not configured for content_polisher.")

    system_prompt = "You improve drafts while preserving meaning, fixing tone, grammar, and clarity."
    user_prompt = (
        f"Draft:\n{payload.draft}\n\n"
        f"Target tone: {payload.tone or 'professional yet warm'}\n"
        f"Audience: {payload.audience or 'general'}\n\n"
        "Rewrite the draft to improve clarity, flow, and readability. Respond with only the revised content."
    )
    text = llm.generate_text(system_prompt, user_prompt, temperature=0.3, max_tokens=600)
    if not text:
        raise AgentExecutionError("Content polisher returned an empty response.")
    return ContentPolisherOutput(revised_draft=text)


registry.register(
    AgentSpec(
        name="content_polisher",
        input_model=ContentPolisherInput,
        output_model=ContentPolisherOutput,
        run=content_polisher_agent,
        tags={"category": "content", "llm": True},
    )
)

