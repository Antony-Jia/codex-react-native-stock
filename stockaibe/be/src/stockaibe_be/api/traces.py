"""Request trace logging API endpoints."""

from datetime import datetime, timedelta
from typing import List

from fastapi import APIRouter, Depends
from sqlmodel import Session, select, delete

from ..core.security import get_current_user, get_db
from ..models import TraceLog, User
from ..schemas import TraceRead

router = APIRouter()


@router.get("", response_model=List[TraceRead])
def traces(limit: int = 50, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    """Get recent trace logs."""
    statement = select(TraceLog).order_by(TraceLog.created_at.desc()).limit(limit)
    items = db.exec(statement).all()
    return items


@router.delete("/all")
def delete_all_traces(db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    """Delete all trace logs."""
    statement = delete(TraceLog)
    result = db.exec(statement)
    db.commit()
    return {"message": f"已删除 {result.rowcount} 条记录", "deleted_count": result.rowcount}


@router.delete("/old")
def delete_old_traces(db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    """Delete trace logs older than today."""
    # Get start of today in local time
    today_start = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
    
    statement = delete(TraceLog).where(TraceLog.created_at < today_start)
    result = db.exec(statement)
    db.commit()
    return {"message": f"已删除今天之前的 {result.rowcount} 条记录", "deleted_count": result.rowcount}
