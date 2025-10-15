"""Server-Sent Events (SSE) API for real-time updates."""

import asyncio
import datetime as dt
import json
from typing import AsyncGenerator

from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from ..core.security import get_current_user, get_db
from ..models import User, TraceLog, Quota
from ..services import limiter_service

router = APIRouter()


async def event_generator(db: Session) -> AsyncGenerator[str, None]:
    """Generate SSE events for real-time monitoring."""
    last_trace_id = 0
    
    while True:
        try:
            # Query new traces since last check
            traces = (
                db.query(TraceLog)
                .filter(TraceLog.id > last_trace_id)
                .order_by(TraceLog.id.asc())
                .limit(10)
                .all()
            )
            
            for trace in traces:
                event_data = {
                    "type": "trace",
                    "data": {
                        "id": trace.id,
                        "quota_id": trace.quota_id,
                        "status_code": trace.status_code,
                        "latency_ms": trace.latency_ms,
                        "message": trace.message,
                        "created_at": trace.created_at.isoformat(),
                    }
                }
                yield f"data: {json.dumps(event_data)}\n\n"
                last_trace_id = trace.id
            
            # Send current token status
            quotas = db.query(Quota).filter(Quota.enabled == True).all()
            for quota in quotas:
                tokens = limiter_service.get_current_tokens(quota.id)
                if tokens is not None:
                    event_data = {
                        "type": "tokens",
                        "data": {
                            "quota_id": quota.id,
                            "tokens_remain": tokens,
                            "capacity": quota.capacity,
                            "timestamp": dt.datetime.now(dt.timezone.utc).isoformat(),
                        }
                    }
                    yield f"data: {json.dumps(event_data)}\n\n"
            
            # Keep-alive ping
            yield f": ping\n\n"
            
            await asyncio.sleep(2)  # Update every 2 seconds
            
        except Exception as e:
            error_data = {
                "type": "error",
                "data": {"message": str(e)}
            }
            yield f"data: {json.dumps(error_data)}\n\n"
            await asyncio.sleep(5)


@router.get("/stream")
async def events_stream(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user)
):
    """
    Server-Sent Events stream for real-time monitoring.
    
    Returns events for:
    - New request traces
    - Token bucket status updates
    - Alerts and warnings
    """
    return StreamingResponse(
        event_generator(db),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",  # Disable nginx buffering
        }
    )
