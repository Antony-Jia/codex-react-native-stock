from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


class QAQuery(BaseModel):
    question: str
    context: list[dict[str, Any]] = Field(default_factory=list)
    metadata: dict[str, Any] = Field(default_factory=dict)


class QAResponse(BaseModel):
    answer: str
    citations: list[str] = Field(default_factory=list)
    suggested_actions: list[str] = Field(default_factory=list)


class QASuggestion(BaseModel):
    prompt: str
    category: str


class QAChartData(BaseModel):
    title: str
    x_axis: list[str]
    series: dict[str, list[float]]


class QAFeedbackResponse(BaseModel):
    id: int
    created_at: datetime
