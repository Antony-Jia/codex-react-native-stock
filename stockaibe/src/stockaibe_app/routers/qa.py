from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from ..auth import get_current_user
from ..database import get_session
from ..models import QAFeedback, User
from ..schemas.qa import QAChartData, QAFeedbackResponse, QAQuery, QAResponse, QASuggestion
from ..schemas.user import FeedbackCreate
from ..services.langchain_service import qa_service

router = APIRouter(prefix="/qa", tags=["qa"])


@router.post("/query", response_model=QAResponse)
async def qa_query(payload: QAQuery) -> QAResponse:
    answer = await qa_service.run(question=payload.question, context=payload.context)
    suggestions = ["关注宏观政策动向", "结合基本面分析个股走势"]
    return QAResponse(answer=answer, citations=[], suggested_actions=suggestions)


@router.get("/suggestions", response_model=list[QASuggestion])
async def qa_suggestions() -> list[QASuggestion]:
    return [
        QASuggestion(prompt="沪深300走势怎么看？", category="市场总览"),
        QASuggestion(prompt="新能源车龙头有哪些亮点？", category="行业洞察"),
    ]


@router.post("/feedback", response_model=QAFeedbackResponse)
async def qa_feedback(
    feedback: FeedbackCreate,
    current_user: Annotated[User, Depends(get_current_user)],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> QAFeedbackResponse:
    record = QAFeedback(
        user_id=current_user.id,
        query=feedback.query,
        response_summary=feedback.response_summary,
        is_positive=feedback.is_positive,
        extra=feedback.extra,
    )
    session.add(record)
    await session.commit()
    await session.refresh(record)
    return QAFeedbackResponse(id=record.id, created_at=record.created_at)


@router.get("/assets/chart", response_model=QAChartData)
async def qa_chart() -> QAChartData:
    return QAChartData(
        title="AI策略资金曲线",
        x_axis=["09:30", "10:30", "11:30", "14:00", "15:00"],
        series={"策略收益": [0.0, 0.2, 0.15, 0.4, 0.5]},
    )
