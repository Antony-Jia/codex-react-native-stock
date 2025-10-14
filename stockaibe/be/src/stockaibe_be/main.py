from __future__ import annotations

import datetime as dt
import uuid
from typing import List, Optional

from fastapi import Depends, FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from .auth import (
    create_access_token,
    get_current_active_superuser,
    get_current_user,
    get_db,
    get_password_hash,
    verify_password,
)
from .database import Base, engine
from .limiter import limiter_service
from .models import Metric, Quota, SchedulerTask, TraceLog, User
from .scheduler import init_jobs, register_cron_job, remove_job, scheduler
from .schemas import (
    AcquireRequest,
    AcquireResponse,
    MetricsCurrentResponse,
    MetricsSeriesResponse,
    QuotaCreate,
    QuotaRead,
    QuotaUpdate,
    TaskCreate,
    TaskRead,
    TaskTriggerRequest,
    Token,
    TraceRead,
    UserCreate,
    UserLogin,
    UserRead,
)

app = FastAPI(title="StockCrawler Limiter Admin")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def startup_event() -> None:
    Base.metadata.create_all(bind=engine)
    init_jobs()
    with Session(bind=engine) as session:
        quotas = session.query(Quota).all()
        for quota in quotas:
            limiter_service.ensure_quota(quota)


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}


@app.post("/api/auth/register", response_model=UserRead)
def register(user_in: UserCreate, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.username == user_in.username).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="User already exists")
    user_count = db.query(User).count()
    user = User(
        username=user_in.username,
        full_name=user_in.full_name,
        hashed_password=get_password_hash(user_in.password),
        is_superuser=user_count == 0,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@app.post("/api/auth/login", response_model=Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == form_data.username).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Incorrect username or password")
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="User disabled")
    token = create_access_token(user.username)
    return Token(access_token=token)


@app.get("/api/users/me", response_model=UserRead)
def read_users_me(current_user: User = Depends(get_current_user)):
    return current_user


@app.get("/api/quotas", response_model=List[QuotaRead])
def list_quotas(db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    quotas = db.query(Quota).order_by(Quota.id).all()
    for quota in quotas:
        limiter_service.ensure_quota(quota)
    return quotas


@app.post("/api/quotas", response_model=QuotaRead)
def create_quota(
    quota_in: QuotaCreate,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_active_superuser),
):
    quota = db.query(Quota).filter(Quota.id == quota_in.id).first()
    if quota:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Quota already exists")
    quota = Quota(**quota_in.model_dump())
    db.add(quota)
    db.commit()
    db.refresh(quota)
    limiter_service.ensure_quota(quota)
    return quota


@app.put("/api/quotas/{quota_id}", response_model=QuotaRead)
def update_quota(
    quota_id: str,
    quota_in: QuotaUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_active_superuser),
):
    quota = db.query(Quota).filter(Quota.id == quota_id).first()
    if not quota:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Quota not found")
    for key, value in quota_in.model_dump(exclude_unset=True).items():
        setattr(quota, key, value)
    db.commit()
    db.refresh(quota)
    limiter_service.ensure_quota(quota)
    return quota


@app.post("/api/quotas/{quota_id}/toggle", response_model=QuotaRead)
def toggle_quota(
    quota_id: str,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_active_superuser),
):
    quota = db.query(Quota).filter(Quota.id == quota_id).first()
    if not quota:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Quota not found")
    quota.enabled = not quota.enabled
    db.commit()
    db.refresh(quota)
    limiter_service.ensure_quota(quota)
    return quota


@app.post("/api/limiter/acquire", response_model=AcquireResponse)
def acquire_token(req: AcquireRequest, db: Session = Depends(get_db)):
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


@app.get("/api/metrics/current", response_model=List[MetricsCurrentResponse])
def metrics_current(db: Session = Depends(get_db), _: User = Depends(get_current_user)):
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


@app.get("/api/metrics/series", response_model=MetricsSeriesResponse)
def metrics_series(
    quota_id: Optional[str] = None,
    limit: int = 100,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
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


@app.get("/api/traces", response_model=List[TraceRead])
def traces(limit: int = 50, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    items = db.query(TraceLog).order_by(TraceLog.created_at.desc()).limit(limit).all()
    return items


def _run_registered_job(job_id: str) -> None:
    with Session(bind=engine) as session:
        trace = TraceLog(
            quota_id="system",
            status_code=200,
            latency_ms=None,
            message=f"Executed job {job_id}",
        )
        session.add(trace)
        task = session.query(SchedulerTask).filter(SchedulerTask.job_id == job_id).first()
        if task:
            task.last_run_at = dt.datetime.now(dt.timezone.utc)
        session.commit()


@app.get("/api/tasks", response_model=List[TaskRead])
def list_tasks(db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    jobs = scheduler.get_jobs()
    job_map = {job.id: job for job in jobs}
    tasks = db.query(SchedulerTask).all()
    results: list[TaskRead] = []
    for task in tasks:
        job = job_map.get(task.job_id)
        results.append(
            TaskRead(
                job_id=task.job_id,
                name=task.name,
                cron=task.cron,
                next_run=job.next_run_time if job else None,
                is_active=task.is_active,
            )
        )
    return results


@app.post("/api/tasks", response_model=TaskRead)
def create_task(
    task_in: TaskCreate,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_active_superuser),
):
    job_id = f"task-{uuid.uuid4()}"
    register_cron_job(job_id, task_in.cron, lambda job_id=job_id: _run_registered_job(job_id))
    task = SchedulerTask(
        job_id=job_id,
        name=task_in.name,
        cron=task_in.cron,
        func_path="stockaibe_be.main._run_registered_job",
    )
    db.add(task)
    db.commit()
    db.refresh(task)
    return TaskRead(job_id=task.job_id, name=task.name, cron=task.cron, next_run=scheduler.get_job(job_id).next_run_time, is_active=task.is_active)


@app.post("/api/tasks/trigger")
def trigger_task(
    req: TaskTriggerRequest,
    _: User = Depends(get_current_active_superuser),
):
    job = scheduler.get_job(req.job_id)
    if not job:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found")
    scheduler.add_job(job.func, trigger="date", run_date=dt.datetime.now(dt.timezone.utc), args=job.args, kwargs=job.kwargs)
    return {"status": "scheduled"}


@app.delete("/api/tasks/{job_id}")
def delete_task(
    job_id: str,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_active_superuser),
):
    task = db.query(SchedulerTask).filter(SchedulerTask.job_id == job_id).first()
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")
    remove_job(job_id)
    db.delete(task)
    db.commit()
    return {"status": "deleted"}
