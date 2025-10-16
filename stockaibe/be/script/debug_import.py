"""调试装饰器注册"""
import sys
print("Python path:")
for p in sys.path:
    print(f"  {p}")

print("\n" + "="*80)
print("Importing task modules...")

# 模拟 task_registry.py 的导入方式
import importlib
from pathlib import Path

tasks_dir = Path(__file__).parent / "tasks"
print(f"Tasks directory: {tasks_dir}")
print(f"Tasks directory exists: {tasks_dir.exists()}")

# 添加到 Python 路径（模拟 task_registry.py 的逻辑）
if str(tasks_dir.parent) not in sys.path:
    sys.path.insert(0, str(tasks_dir.parent))
    print(f"Added to sys.path: {tasks_dir.parent}")

print("\n" + "="*80)
print("Attempting to import tasks.example_tasks...")

try:
    module1 = importlib.import_module("tasks.example_tasks")
    print(f"SUCCESS: Imported {module1}")
except Exception as e:
    print(f"FAILED: {e}")
    import traceback
    traceback.print_exc()

print("\n" + "="*80)
print("Attempting to import tasks.batch_processing_example...")

try:
    module2 = importlib.import_module("tasks.batch_processing_example")
    print(f"SUCCESS: Imported {module2}")
except Exception as e:
    print(f"FAILED: {e}")
    import traceback
    traceback.print_exc()

print("\n" + "="*80)
print("Checking registered tasks...")

try:
    from src.stockaibe_be.services.task_decorators import (
        get_registered_tasks,
        get_registered_call_limiters
    )
    
    tasks = get_registered_tasks()
    limiters = get_registered_call_limiters()
    
    print(f"Registered tasks: {len(tasks)}")
    for task_id in list(tasks.keys())[:3]:
        print(f"  - {task_id}")
    
    print(f"Registered limiters: {len(limiters)}")
    for limiter_id in list(limiters.keys())[:3]:
        print(f"  - {limiter_id}")
        
except Exception as e:
    print(f"FAILED to check: {e}")
    import traceback
    traceback.print_exc()
