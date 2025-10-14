from __future__ import annotations

import datetime as dt
from typing import Any, Callable

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from sqlalchemy.orm import Session

from .config import settings
from .database import SessionLocal
from .models import SchedulerTask


scheduler = AsyncIOScheduler(timezone=settings.scheduler_timezone)


def _with_session(func: Callable[[Session], Any]) -> None:
    with SessionLocal() as session:
        func(session)


def snapshot_metrics(session: Session) -> None:
    # Placeholder for advanced aggregation - we keep latest metrics only here
    now = dt.datetime.now(dt.timezone.utc)
    for task in session.query(SchedulerTask).all():
        task.last_run_at = now
    session.commit()


def init_jobs() -> None:
    if not scheduler.running:
        scheduler.start()
    if not scheduler.get_job("snapshot_metrics"):
        scheduler.add_job(
            lambda: _with_session(snapshot_metrics),
            trigger="interval",
            seconds=60,
            id="snapshot_metrics",
            name="Snapshot Metrics",
            replace_existing=True,
        )


def register_cron_job(job_id: str, cron: str, func: Callable[[], Any]) -> None:
    trigger = CronTrigger.from_crontab(cron)
    scheduler.add_job(func, trigger=trigger, id=job_id, name=job_id, replace_existing=True)


def remove_job(job_id: str) -> None:
    if scheduler.get_job(job_id):
        scheduler.remove_job(job_id)
