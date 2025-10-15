"""Quota management API endpoints."""

from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select

from ..core.security import get_current_active_superuser, get_current_user, get_db
from ..models import Quota, User
from ..schemas import QuotaCreate, QuotaRead, QuotaUpdate
from ..services import limiter_service

router = APIRouter()


@router.get("", response_model=List[QuotaRead])
def list_quotas(db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    """List all quotas."""
    statement = select(Quota).order_by(Quota.id)
    quotas = db.exec(statement).all()
    for quota in quotas:
        limiter_service.ensure_quota(quota)
    return quotas


@router.post("", response_model=QuotaRead)
def create_quota(
    quota_in: QuotaCreate,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_active_superuser),
):
    """Create a new quota."""
    statement = select(Quota).where(Quota.id == quota_in.id)
    existing_quota = db.exec(statement).first()
    if existing_quota:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Quota already exists")
    quota = Quota(**quota_in.model_dump())
    db.add(quota)
    db.commit()
    db.refresh(quota)
    limiter_service.ensure_quota(quota)
    return quota


@router.put("/{quota_id}", response_model=QuotaRead)
def update_quota(
    quota_id: str,
    quota_in: QuotaUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_active_superuser),
):
    """Update an existing quota."""
    statement = select(Quota).where(Quota.id == quota_id)
    quota = db.exec(statement).first()
    if not quota:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Quota not found")
    for key, value in quota_in.model_dump(exclude_unset=True).items():
        setattr(quota, key, value)
    db.commit()
    db.refresh(quota)
    limiter_service.ensure_quota(quota)
    return quota


@router.post("/{quota_id}/toggle", response_model=QuotaRead)
def toggle_quota(
    quota_id: str,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_active_superuser),
):
    """Toggle quota enabled/disabled status."""
    statement = select(Quota).where(Quota.id == quota_id)
    quota = db.exec(statement).first()
    if not quota:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Quota not found")
    quota.enabled = not quota.enabled
    db.commit()
    db.refresh(quota)
    limiter_service.ensure_quota(quota)
    return quota
