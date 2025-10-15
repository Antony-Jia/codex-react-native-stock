"""Rate limiter API endpoints."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..core.security import get_db
from ..models import Quota
from ..schemas import AcquireRequest, AcquireResponse
from ..services import limiter_service

router = APIRouter()


@router.post("/acquire", response_model=AcquireResponse)
def acquire_token(req: AcquireRequest, db: Session = Depends(get_db)):
    """
    Acquire tokens from a quota.
    
    This is the main endpoint for rate limiting. Clients call this before making requests
    to check if they have permission to proceed.
    """
    quota = db.query(Quota).filter(Quota.id == req.qid).first()
    if not quota:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Quota not found")
    allowed, remain = limiter_service.acquire(
        db=db,
        quota=quota,
        cost=req.cost,
        success=req.success,
        latency_ms=req.latency_ms,
        message=req.message,
    )
    db.commit()
    return AcquireResponse(allow=allowed, remain=remain)
