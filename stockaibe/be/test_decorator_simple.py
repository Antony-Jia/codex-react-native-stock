"""简单测试装饰器是否工作"""

import sys
from pathlib import Path

# 添加 src 目录到 Python 路径
project_root = Path(__file__).parent
src_path = project_root / "src"
if str(src_path) not in sys.path:
    sys.path.insert(0, str(src_path))

print("=" * 60)
print("测试装饰器注册")
print("=" * 60)

# 导入装饰器
from stockaibe_be.services.task_decorators import (
    SchedulerTask,
    get_registered_tasks,
    _REGISTERED_TASKS
)
from sqlmodel import Session

print(f"\n导入装饰器成功")
print(f"当前注册任务数: {len(_REGISTERED_TASKS)}")

# 定义一个测试任务
@SchedulerTask(
    id="test_task_001",
    name="测试任务",
    cron="0 * * * *",
    description="这是一个测试任务"
)
def test_task(session: Session) -> None:
    print("测试任务执行")

print(f"\n定义测试任务后，注册任务数: {len(_REGISTERED_TASKS)}")
print(f"注册的任务: {list(_REGISTERED_TASKS.keys())}")

# 获取注册任务
registered = get_registered_tasks()
print(f"\n通过 get_registered_tasks() 获取: {len(registered)} 个任务")

for job_id, task_info in registered.items():
    metadata = task_info["metadata"]
    print(f"\n任务 ID: {job_id}")
    print(f"  名称: {metadata.name}")
    print(f"  类型: {metadata.task_type}")
    print(f"  Cron: {metadata.cron}")

print("\n" + "=" * 60)
print("测试完成")
print("=" * 60)
