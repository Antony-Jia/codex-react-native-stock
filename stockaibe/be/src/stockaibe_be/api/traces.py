"""Request trace logging API endpoints."""

from typing import List

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..core.security import get_current_user, get_db
from ..models import TraceLog, User
from ..schemas import TraceRead

router = APIRouter()


@router.get("", response_model=List[TraceRead])
def traces(limit: int = 50, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    """Get recent trace logs."""
    items = db.query(TraceLog).order_by(TraceLog.created_at.desc()).limit(limit).all()
    return items
