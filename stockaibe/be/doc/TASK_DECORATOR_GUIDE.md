# 任务装饰器使用指南

## 概述

本系统提供了基于装饰器的任务注册机制，让任务定义更加声明式和工程化。支持两种类型的任务：

1. **调度任务 (`@SchedulerTask`)**: 按照 cron 表达式周期性执行
2. **限流任务 (`@LimitTask`)**: 执行时自动应用配额限流策略

## 核心特性

✅ **声明式定义**: 使用装饰器定义任务，代码清晰易读  
✅ **自动注册**: 程序启动时自动扫描并注册任务到数据库  
✅ **数据库驱动**: 以数据库为准，支持动态修改任务配置  
✅ **前端可见**: 所有任务自动显示在前端"任务调度"页面  
✅ **限流保护**: 限流任务自动应用配额策略，防止资源过载  
✅ **日志追踪**: 完整的执行日志和请求追踪

---

## 快速开始

### 1. 创建任务文件

在 `tasks/` 目录下创建 Python 文件（如 `my_tasks.py`）：

```python
from sqlmodel import Session
from src.stockaibe_be.services.task_decorators import SchedulerTask, LimitTask
from src.stockaibe_be.core.logging_config import get_logger

logger = get_logger(__name__)

@SchedulerTask(
    id="daily_report_001",
    name="每日报告",
    cron="0 9 * * *",
    description="生成每日数据报告"
)
def daily_report(session: Session) -> None:
    logger.info("生成每日报告...")
    # 你的业务逻辑
```

### 2. 启动应用

程序启动时会自动：
1. 扫描 `tasks/` 目录下的所有 Python 文件
2. 注册装饰器定义的任务到数据库
3. 加载到调度器并开始执行

### 3. 查看任务

访问前端"任务调度"页面，可以看到：
- 所有已注册的任务
- 任务的下次执行时间
- 任务的启用/禁用状态
- 最后执行时间

---

## 装饰器详解

### @SchedulerTask - 调度任务

用于定义周期性执行的任务。

#### 参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `id` | str | ✅ | 任务唯一标识，全局唯一 |
| `name` | str | ✅ | 任务名称，可重复 |
| `cron` | str | ✅ | Cron 表达式 |
| `description` | str | ❌ | 任务描述 |

#### Cron 表达式格式

```
分 时 日 月 周
* * * * *
```

**示例：**
- `0 9 * * *` - 每天早上 9 点
- `0 */2 * * *` - 每 2 小时
- `0 0 * * 0` - 每周日凌晨
- `0 9 * * 1-5` - 工作日早上 9 点
- `*/30 * * * *` - 每 30 分钟

#### 完整示例

```python
@SchedulerTask(
    id="weekly_cleanup_001",
    name="每周数据清理",
    cron="0 2 * * 0",  # 每周日凌晨 2 点
    description="清理超过 30 天的旧数据"
)
def weekly_cleanup(session: Session) -> None:
    """每周清理旧数据"""
    logger.info("开始清理旧数据...")
    
    import datetime as dt
    from sqlmodel import select
    from src.stockaibe_be.models import Metric
    
    cutoff = dt.datetime.now(dt.timezone.utc) - dt.timedelta(days=30)
    statement = select(Metric).where(Metric.ts < cutoff)
    old_metrics = session.exec(statement).all()
    
    for metric in old_metrics:
        session.delete(metric)
    
    session.commit()
    logger.info(f"已清理 {len(old_metrics)} 条数据")
```

---

### @LimitTask - 限流任务

用于定义需要限流保护的任务。

#### 参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `id` | str | ✅ | 任务唯一标识 |
| `name` | str | ✅ | 任务名称 |
| `quota_name` | str | ✅ | 关联的配额名称 |
| `description` | str | ❌ | 任务描述 |

#### 工作原理

1. 任务执行前先尝试获取令牌
2. 如果配额不存在或未启用，按无限制执行
3. 如果被限流（429），任务跳过本次执行
4. 执行成功/失败都会记录到 `TraceLog` 表

#### 完整示例

```python
@LimitTask(
    id="external_api_call_001",
    name="调用外部API",
    quota_name="external_api",
    description="调用外部 API 服务，受限流保护"
)
def call_external_api(session: Session) -> None:
    """
    调用外部 API
    
    注意：需要先在配额管理中创建名为 'external_api' 的配额
    例如：capacity=100, refill_rate=1.0 (每秒补充1个令牌)
    """
    logger.info("调用外部 API...")
    
    import requests
    response = requests.get("https://api.example.com/data")
    
    if response.status_code == 200:
        logger.info("✓ API 调用成功")
    else:
        raise Exception(f"API 调用失败: {response.status_code}")
```

#### 配额配置

在前端"配额管理"页面创建配额：

```json
{
  "id": "external_api",
  "capacity": 100,
  "refill_rate": 1.0,
  "enabled": true
}
```

---

## 任务生命周期

### 1. 注册阶段（程序启动）

```
扫描 tasks/ 目录
    ↓
导入所有 .py 文件
    ↓
收集装饰器元数据
    ↓
同步到数据库
    ↓
加载到调度器
```

### 2. 同步规则

- **新任务**: 自动创建到数据库，`is_active=True`
- **已存在任务**: 更新元数据（保留 `is_active` 和 `last_run_at`）
- **代码中删除的任务**: 数据库中标记为 `is_active=False`

### 3. 执行阶段

**调度任务：**
```
触发时间到达
    ↓
执行任务函数
    ↓
更新 last_run_at
    ↓
记录日志
```

**限流任务：**
```
触发时间到达
    ↓
检查配额
    ↓
尝试获取令牌
    ↓
如果成功 → 执行任务 → 记录 TraceLog
如果失败 → 跳过执行 → 记录限流日志
```

---

## 最佳实践

### 1. 任务 ID 命名规范

```python
# 推荐格式：{功能}_{类型}_{序号}
@SchedulerTask(id="daily_report_001", ...)
@SchedulerTask(id="weekly_cleanup_001", ...)
@LimitTask(id="api_call_external_001", ...)
```

### 2. 函数签名要求

**必须**接受 `session: Session` 作为第一个参数：

```python
✅ 正确
def my_task(session: Session) -> None:
    pass

❌ 错误
def my_task() -> None:  # 缺少 session 参数
    pass
```

### 3. 异常处理

任务内部应该捕获异常，避免影响调度器：

```python
@SchedulerTask(id="safe_task_001", name="安全任务", cron="0 * * * *")
def safe_task(session: Session) -> None:
    try:
        # 可能失败的操作
        risky_operation()
    except Exception as e:
        logger.error(f"任务执行失败: {e}", exc_info=True)
        # 可以选择重试或发送告警
```

### 4. 数据库事务

`session` 会自动提交，但建议显式控制：

```python
@SchedulerTask(id="db_task_001", name="数据库任务", cron="0 * * * *")
def db_task(session: Session) -> None:
    try:
        # 批量操作
        for item in items:
            process(item)
        
        session.commit()  # 显式提交
        logger.info("✓ 任务完成")
    except Exception as e:
        session.rollback()  # 回滚
        logger.error(f"✗ 任务失败: {e}")
        raise
```

### 5. 限流任务的配额管理

```python
# 1. 先创建配额（通过前端或 API）
# POST /api/quotas
{
  "id": "email_service",
  "capacity": 20,
  "refill_rate": 0.1,  # 每10秒补充1个令牌
  "enabled": true
}

# 2. 然后定义任务
@LimitTask(
    id="email_001",
    name="发送邮件",
    quota_name="email_service"
)
def send_email(session: Session) -> None:
    # 自动受限流保护
    send_email_to_users()
```

---

## 动态修改任务

### 通过前端

1. 访问"任务调度"页面
2. 找到目标任务
3. 可以：
   - 切换启用/禁用状态
   - 手动触发执行
   - 查看执行历史

### 通过 API

```bash
# 禁用任务
PUT /api/tasks/{job_id}
{
  "is_active": false
}

# 手动触发
POST /api/tasks/trigger
{
  "job_id": "daily_report_001"
}
```

### 通过数据库

```sql
-- 禁用任务
UPDATE scheduler_tasks 
SET is_active = false 
WHERE job_id = 'daily_report_001';

-- 修改 cron 表达式（需要重启应用）
UPDATE scheduler_tasks 
SET cron = '0 10 * * *' 
WHERE job_id = 'daily_report_001';
```

---

## 监控和调试

### 查看日志

```bash
# 主日志
tail -f logs/stockaibe.log | grep "任务"

# 错误日志
tail -f logs/error.log
```

### 查看任务状态

```python
from sqlmodel import Session, select
from src.stockaibe_be.models import SchedulerTask

with Session(engine) as session:
    tasks = session.exec(select(SchedulerTask)).all()
    for task in tasks:
        print(f"{task.job_id}: {task.is_active}, 最后执行: {task.last_run_at}")
```

### 查看限流追踪

前端"请求追踪"页面可以看到：
- 限流任务的执行记录
- 状态码（200/429/500）
- 执行延迟
- 关联的配额

---

## 常见问题

### Q1: 任务没有被加载？

**检查清单：**
1. 文件是否在 `tasks/` 目录下
2. 文件名是否以 `.py` 结尾且不以 `_` 开头
3. 装饰器导入是否正确
4. 查看启动日志是否有错误

### Q2: 限流任务总是被跳过？

**可能原因：**
1. 配额不存在 → 在前端创建配额
2. 配额已禁用 → 启用配额
3. 令牌耗尽 → 调整 `capacity` 或 `refill_rate`

### Q3: 如何删除任务？

1. 从代码中删除装饰器定义
2. 重启应用（任务会被标记为 `is_active=False`）
3. 可选：手动从数据库删除记录

### Q4: 任务执行时间不准确？

检查：
1. Cron 表达式是否正确
2. 服务器时区设置（默认 UTC）
3. 调度器是否正常运行

---

## 示例集合

查看 `tasks/example_tasks.py` 获取更多示例：

- 每日报告
- 每周清理
- 每小时健康检查
- API 调用（限流）
- 数据同步（限流）
- 邮件通知（限流）

---

## 技术架构

```
装饰器定义 (@SchedulerTask/@LimitTask)
    ↓
任务注册表 (task_decorators.py)
    ↓
数据库同步 (task_registry.py)
    ↓
调度器加载 (scheduler.py)
    ↓
APScheduler 执行
    ↓
日志记录 + TraceLog
```

---

## 相关文档

- [配额管理文档](./QUOTA_MANAGEMENT.md)
- [日志系统文档](./LOGGING.md)
- [API 文档](http://localhost:8000/docs)
