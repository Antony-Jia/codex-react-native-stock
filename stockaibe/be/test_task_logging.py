"""测试任务日志功能"""

import time
from sqlmodel import Session

from src.stockaibe_be.core.database import engine
from src.stockaibe_be.core.logging_config import setup_logging
from src.stockaibe_be.services.task_decorators import SchedulerTask


# 设置日志系统
setup_logging()


@SchedulerTask(
    id="test_task_001",
    name="测试任务1",
    cron="0 * * * *",
    description="用于测试任务日志功能"
)
def test_task_success(session: Session) -> None:
    """测试成功的任务"""
    print("执行测试任务1...")
    time.sleep(1)
    print("任务1执行完成")


@SchedulerTask(
    id="test_task_002",
    name="测试任务2",
    cron="0 * * * *",
    description="用于测试任务失败日志"
)
def test_task_failure(session: Session) -> None:
    """测试失败的任务"""
    print("执行测试任务2...")
    time.sleep(0.5)
    raise ValueError("这是一个测试错误")


if __name__ == "__main__":
    print("=" * 60)
    print("开始测试任务日志功能")
    print("=" * 60)
    
    with Session(engine) as session:
        # 测试成功的任务
        print("\n[测试1] 执行成功的任务...")
        try:
            test_task_success(session)
        except Exception as e:
            print(f"任务执行失败: {e}")
        
        # 测试失败的任务
        print("\n[测试2] 执行失败的任务...")
        try:
            test_task_failure(session)
        except Exception as e:
            print(f"任务执行失败（预期）: {e}")
    
    print("\n" + "=" * 60)
    print("测试完成！请查看 logs/tasks.log 文件")
    print("=" * 60)
