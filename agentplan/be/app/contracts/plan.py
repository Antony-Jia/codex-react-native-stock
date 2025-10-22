from __future__ import annotations

from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field, validator


class Step(BaseModel):
    """
    Planner generated node with dependencies expressed as step identifiers.
    """

    id: str
    action: str
    depends_on: List[str] = Field(default_factory=list)
    args: Dict[str, Any] = Field(default_factory=dict)


class Plan(BaseModel):
    """
    Structured plan used to compile a LangGraph StateGraph.
    """

    steps: List[Step]
    description: Optional[str] = None
    version: Optional[str] = None
    meta: Dict[str, Any] = Field(default_factory=dict)

    @validator("steps")
    def ensure_unique_step_ids(cls, steps: List[Step]) -> List[Step]:
        ids = {step.id for step in steps}
        if len(ids) != len(steps):
            raise ValueError("Step ids must be unique")
        return steps

