"""重新激活所有任务"""
import sys
from pathlib import Path
import datetime as dt

project_root = Path(__file__).parent
if str(project_root) not in sys.path:
    sys.path.insert(0, str(project_root))

from src.stockaibe_be.core.database import engine
from sqlmodel import Session, select
from src.stockaibe_be.models import SchedulerTask

print("Reactivating all tasks...")
with Session(engine) as session:
    statement = select(SchedulerTask)
    tasks = list(session.exec(statement).all())
    
    activated_count = 0
    for task in tasks:
        if not task.is_active:
            task.is_active = True
            task.updated_at = dt.datetime.now(dt.timezone.utc)
            activated_count += 1
            print(f"  Activated: {task.job_id}")
    
    session.commit()
    print(f"\nTotal activated: {activated_count}/{len(tasks)}")
