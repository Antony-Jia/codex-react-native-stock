"""检查数据库中的任务"""
import sys
from pathlib import Path

project_root = Path(__file__).parent
if str(project_root) not in sys.path:
    sys.path.insert(0, str(project_root))

from src.stockaibe_be.core.database import engine
from sqlmodel import Session, select
from src.stockaibe_be.models import SchedulerTask

print("Checking tasks in database...")
with Session(engine) as session:
    statement = select(SchedulerTask)
    tasks = list(session.exec(statement).all())
    
    print(f"\nTotal tasks in database: {len(tasks)}")
    print("\nTask details:")
    print("-" * 80)
    
    for task in tasks:
        print(f"ID: {task.job_id}")
        print(f"  Name: {task.name}")
        print(f"  Type: {task.task_type}")
        print(f"  Active: {task.is_active}")
        print(f"  Cron: {task.cron}")
        print(f"  Quota: {task.quota_name}")
        print(f"  Created: {task.created_at}")
        print(f"  Updated: {task.updated_at}")
        print("-" * 80)
