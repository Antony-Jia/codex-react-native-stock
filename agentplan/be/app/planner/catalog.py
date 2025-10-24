from __future__ import annotations

from dataclasses import dataclass
from typing import List, Sequence


@dataclass(frozen=True)
class PlannerTool:
    name: str
    description: str
    inputs: List[str]
    outputs: List[str]
    category: str = "agent"
    default_objective: str | None = None


def core_memory_tools() -> List[PlannerTool]:
    """
    Tools that persist planning artefacts to the shared KV/VFS memory.
    """

    return [
        PlannerTool(
            name="upsert_plan",
            description="Persist the entire plan definition, including per-step objectives and arguments, into the plan store.",
            inputs=["description", "steps", "notes"],
            outputs=["status"],
            category="memory",
        ),
        PlannerTool(
            name="read_plan",
            description="Load an existing plan and summarise any reusable components before planning new work.",
            inputs=["plan_id"],
            outputs=["plan"],
            category="memory",
        ),
        PlannerTool(
            name="put_vfs",
            description="Store a key insight, artefact summary, or dependency contract into the virtual file system for later agents.",
            inputs=["path", "payload", "tags"],
            outputs=["status"],
            category="memory",
        ),
        PlannerTool(
            name="get_vfs",
            description="Retrieve previously stored artefacts or context from the virtual file system.",
            inputs=["path"],
            outputs=["payload"],
            category="memory",
        ),
    ]


def default_agent_tools() -> List[PlannerTool]:
    """
    Tools mirroring the built-in content agents available for execution.
    """

    return [
        PlannerTool(
            name="draft_writer",
            description="Generate an initial draft of content given a brief, tone, and key bullet points.",
            inputs=["brief", "key_points", "tone"],
            outputs=["draft"],
            default_objective="Create a first-pass draft covering all mandatory talking points.",
        ),
        PlannerTool(
            name="content_polisher",
            description="Refine and improve an existing draft focusing on clarity, tone adjustment, and polishing.",
            inputs=["draft", "tone", "audience"],
            outputs=["revised_draft"],
            default_objective="Polish the draft to align with the desired tone and audience expectations.",
        ),
        PlannerTool(
            name="echo",
            description="Return the provided message unchanged; useful for validation and lightweight formatting.",
            inputs=["message"],
            outputs=["message"],
            default_objective="Echo input content so downstream steps can validate orchestration plumbing.",
        ),
    ]


def build_tool_catalog(extra_tools: Sequence[PlannerTool] | None = None) -> List[PlannerTool]:
    """
    Assemble the planner tool catalog, always prepending the core memory tools.
    """

    tools: List[PlannerTool] = []
    tools.extend(core_memory_tools())
    tools.extend(default_agent_tools())
    if extra_tools:
        tools.extend(extra_tools)
    return tools

