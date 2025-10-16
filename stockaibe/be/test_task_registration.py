"""测试任务注册是否正常工作"""

import sys
from pathlib import Path

# 添加 src 目录到 Python 路径
project_root = Path(__file__).parent
src_path = project_root / "src"
if str(src_path) not in sys.path:
    sys.path.insert(0, str(src_path))

# 导入装饰器模块
from stockaibe_be.services.task_decorators import (
    get_registered_tasks,
    get_registered_call_limiters,
    clear_registered_tasks,
    clear_registered_call_limiters,
)

# 清空注册表
clear_registered_tasks()
clear_registered_call_limiters()

print("=" * 60)
print("开始测试任务注册...")
print("=" * 60)

# 导入任务模块
print("\n1. 导入 example_tasks 模块...")
try:
    import tasks.example_tasks
    print("   ✓ 成功导入 example_tasks")
except Exception as e:
    print(f"   ✗ 导入失败: {e}")
    import traceback
    traceback.print_exc()

print("\n2. 导入 batch_processing_example 模块...")
try:
    import tasks.batch_processing_example
    print("   ✓ 成功导入 batch_processing_example")
except Exception as e:
    print(f"   ✗ 导入失败: {e}")
    import traceback
    traceback.print_exc()

# 检查注册结果
print("\n" + "=" * 60)
print("检查注册结果...")
print("=" * 60)

registered_tasks = get_registered_tasks()
registered_call_limiters = get_registered_call_limiters()

print(f"\n已注册任务总数: {len(registered_tasks)}")
print(f"已注册函数限流器: {len(registered_call_limiters)}")

if registered_tasks:
    print("\n任务列表:")
    for job_id, task_info in registered_tasks.items():
        metadata = task_info["metadata"]
        print(f"  - {job_id}")
        print(f"    名称: {metadata.name}")
        print(f"    类型: {metadata.task_type}")
        if metadata.cron:
            print(f"    Cron: {metadata.cron}")
        if metadata.quota_name:
            print(f"    配额: {metadata.quota_name}")
        print()
else:
    print("\n⚠️ 没有注册任何任务！")

if registered_call_limiters:
    print("\n函数限流器列表:")
    for limiter_id, limiter_info in registered_call_limiters.items():
        metadata = limiter_info["metadata"]
        print(f"  - {limiter_id}")
        print(f"    名称: {metadata.name}")
        print(f"    配额: {metadata.quota_name}")
        print()

print("=" * 60)
print("测试完成")
print("=" * 60)
