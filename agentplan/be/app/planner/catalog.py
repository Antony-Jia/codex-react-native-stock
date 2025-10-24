from __future__ import annotations

from dataclasses import dataclass
from typing import List


@dataclass(frozen=True)
class PlannerTool:
    name: str
    description: str
    inputs: List[str]
    outputs: List[str]


DEFAULT_TOOLS: List[PlannerTool] = [
    PlannerTool(
        name="draft_writer",
        description="Generate an initial draft of content based on a brief and key points.",
        inputs=["brief", "key_points", "tone"],
        outputs=["draft"],
    ),
    PlannerTool(
        name="content_polisher",
        description="Refine and improve an existing draft for clarity, tone, and style.",
        inputs=["draft", "tone", "audience"],
        outputs=["revised_draft"],
    ),
    PlannerTool(
        name="echo",
        description="Return the provided message unchanged. Useful for simple passes or debugging.",
        inputs=["message"],
        outputs=["message"],
    ),
]

