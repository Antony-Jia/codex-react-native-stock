"""Task scheduler API endpoints."""

import datetime as dt
import uuid
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select

from ..core.database import engine
from ..core.security import get_current_active_superuser, get_current_user, get_db
from ..models import SchedulerTask, TraceLog, User
from ..schemas import TaskCreate, TaskRead, TaskTriggerRequest
from ..services import register_cron_job, remove_job, scheduler

router = APIRouter()


def _run_registered_job(job_id: str) -> None:
    """Execute a registered job and log the execution."""
    with Session(engine) as session:
        trace = TraceLog(
            quota_id="system",
            status_code=200,
            latency_ms=None,
            message=f"Executed job {job_id}",
        )
        session.add(trace)
        statement = select(SchedulerTask).where(SchedulerTask.job_id == job_id)
        task = session.exec(statement).first()
        if task:
            task.last_run_at = dt.datetime.now(dt.timezone.utc)
        session.commit()


@router.get("", response_model=List[TaskRead])
def list_tasks(db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    """List all scheduled tasks."""
    jobs = scheduler.get_jobs()
    job_map = {job.id: job for job in jobs}
    statement = select(SchedulerTask)
    tasks = db.exec(statement).all()
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
                description=task.description,
            )
        )
    return results


@router.post("", response_model=TaskRead)
def create_task(
    task_in: TaskCreate,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_active_superuser),
):
    """Create a new scheduled task."""
    job_id = f"task-{uuid.uuid4()}"
    register_cron_job(job_id, task_in.cron, lambda job_id=job_id: _run_registered_job(job_id))
    task = SchedulerTask(
        job_id=job_id,
        name=task_in.name,
        cron=task_in.cron,
        func_path="stockaibe_be.api.tasks._run_registered_job",
    )
    db.add(task)
    db.commit()
    db.refresh(task)
    return TaskRead(
        job_id=task.job_id,
        name=task.name,
        cron=task.cron,
        next_run=scheduler.get_job(job_id).next_run_time,
        is_active=task.is_active,
        description=task.description,
    )


@router.post("/trigger")
def trigger_task(
    req: TaskTriggerRequest,
    _: User = Depends(get_current_active_superuser),
):
    """Manually trigger a task to run immediately."""
    job = scheduler.get_job(req.job_id)
    if not job:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found")
    scheduler.add_job(
        job.func,
        trigger="date",
        run_date=dt.datetime.now(dt.timezone.utc),
        args=job.args,
        kwargs=job.kwargs,
    )
    return {"status": "scheduled"}


@router.delete("/{job_id}")
def delete_task(
    job_id: str,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_active_superuser),
):
    """Delete a scheduled task."""
    statement = select(SchedulerTask).where(SchedulerTask.job_id == job_id)
    task = db.exec(statement).first()
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")
    remove_job(job_id)
    db.delete(task)
    db.commit()
    return {"status": "deleted"}
