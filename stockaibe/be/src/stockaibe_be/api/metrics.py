"""Metrics and monitoring API endpoints."""

from typing import List, Optional

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..core.security import get_current_user, get_db
from ..models import Metric, Quota, User
from ..schemas import MetricsCurrentResponse, MetricsSeriesResponse
from ..services import limiter_service

router = APIRouter()


@router.get("/current", response_model=List[MetricsCurrentResponse])
def metrics_current(db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    """Get current metrics for all quotas."""
    result: list[MetricsCurrentResponse] = []
    quotas = db.query(Quota).all()
    for quota in quotas:
        metric = (
            db.query(Metric)
            .filter(Metric.quota_id == quota.id)
            .order_by(Metric.ts.desc())
            .first()
        )
        state = limiter_service.states.get(quota.id)
        remain_value = metric.tokens_remain if metric else (state.tokens if state else None)
        result.append(
            MetricsCurrentResponse(
                quota_id=quota.id,
                ok=metric.ok if metric else 0,
                err=metric.err if metric else 0,
                r429=metric.r429 if metric else 0,
                tokens_remain=remain_value,
            )
        )
    return result


@router.get("/series", response_model=MetricsSeriesResponse)
def metrics_series(
    quota_id: Optional[str] = None,
    limit: int = 100,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Get time series metrics data."""
    query = db.query(Metric)
    if quota_id:
        query = query.filter(Metric.quota_id == quota_id)
    items = query.order_by(Metric.ts.desc()).limit(limit).all()
    items.reverse()
    return MetricsSeriesResponse(
        items=[
            {
                "ts": item.ts,
                "quota_id": item.quota_id,
                "ok": item.ok,
                "err": item.err,
                "r429": item.r429,
                "latency_p95": item.latency_p95,
                "tokens_remain": item.tokens_remain,
            }
            for item in items
        ]
    )
