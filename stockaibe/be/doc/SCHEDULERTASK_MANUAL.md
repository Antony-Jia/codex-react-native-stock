# SchedulerTask 装饰器使用手册

## 概述

`@SchedulerTask` 用于创建按 Cron 表达式定时执行的任务，不受限流限制。适用于定期执行的内部操作。

---

## 语法

```python
@SchedulerTask(
    id: str,              # 任务唯一标识
    name: str,            # 任务名称（可重复）
    cron: str,            # Cron 表达式
    description: str = None  # 任务描述（可选）
)
def task_function(session: Session) -> None:
    pass
```

---

## 参数说明

### id (必需)
- **类型**: `str`
- **说明**: 任务的唯一标识符，全局唯一
- **建议格式**: `{category}_{name}_{number}`
- **示例**: `"daily_report_001"`, `"cleanup_logs_001"`

### name (必需)
- **类型**: `str`
- **说明**: 任务的显示名称，可以重复，用于前端展示
- **示例**: `"每日报告"`, `"清理旧日志"`

### cron (必需)
- **类型**: `str`
- **说明**: Cron 表达式，定义任务执行时间
- **格式**: `分 时 日 月 周`
- **示例**: 
  - `"0 9 * * *"` - 每天早上9点
  - `"*/5 * * * *"` - 每5分钟
  - `"0 */2 * * *"` - 每2小时

### description (可选)
- **类型**: `str`
- **说明**: 任务描述，用于说明任务的用途
- **示例**: `"生成并发送每日数据统计报告"`

---

## 函数要求

### 必需的函数签名

```python
def task_function(session: Session) -> None:
    pass
```

- **第一个参数**: 必须是 `session: Session`
- **返回值**: 建议为 `None`
- **其他参数**: 可以有，但调度器只会传入 `session`

### 为什么需要 session 参数？

`session` 是 SQLModel 的数据库会话对象，用于：
- 查询数据库
- 修改数据
- 提交事务

调度器会自动管理 `session` 的生命周期，任务结束后自动提交或回滚。

---

## Cron 表达式详解

### 格式说明

```
┌───────────── 分钟 (0 - 59)
│ ┌───────────── 小时 (0 - 23)
│ │ ┌───────────── 日 (1 - 31)
│ │ │ ┌───────────── 月 (1 - 12)
│ │ │ │ ┌───────────── 星期 (0 - 6) (0 = 周日)
│ │ │ │ │
* * * * *
```

### 常用示例

| Cron 表达式 | 说明 | 执行频率 |
|------------|------|---------|
| `"0 9 * * *"` | 每天早上 9:00 | 每天 1 次 |
| `"*/5 * * * *"` | 每 5 分钟 | 每小时 12 次 |
| `"0 */2 * * *"` | 每 2 小时 | 每天 12 次 |
| `"0 0 * * 0"` | 每周日午夜 | 每周 1 次 |
| `"0 3 1 * *"` | 每月 1 号凌晨 3:00 | 每月 1 次 |
| `"30 8-18 * * 1-5"` | 工作日 8:30-18:30 每小时 | 工作日 11 次 |
| `"0 0 1 1 *"` | 每年 1 月 1 日午夜 | 每年 1 次 |
| `"*/10 9-17 * * 1-5"` | 工作日 9:00-17:00 每 10 分钟 | 工作日 49 次 |

### 特殊字符

- `*` - 任意值
- `,` - 列举多个值，如 `1,3,5`
- `-` - 范围，如 `1-5`
- `/` - 步长，如 `*/5` 表示每 5 个单位

---

## 完整示例

### 示例 1: 每日数据报告

```python
from sqlmodel import Session, select
from stockaibe_be.services.task_decorators import SchedulerTask
from stockaibe_be.core.logging_config import get_logger
from stockaibe_be.models import TraceLog
from datetime import datetime, timedelta

logger = get_logger(__name__)

@SchedulerTask(
    id="daily_report_001",
    name="每日数据报告",
    cron="0 9 * * *",
    description="生成并发送每日数据统计报告"
)
def daily_report(session: Session) -> None:
    """生成每日报告"""
    logger.info("=" * 60)
    logger.info("开始生成每日报告...")
    
    # 查询昨天的数据
    yesterday = datetime.utcnow() - timedelta(days=1)
    statement = select(TraceLog).where(TraceLog.created_at >= yesterday)
    logs = session.exec(statement).all()
    
    # 统计数据
    total_calls = len(logs)
    success_calls = len([log for log in logs if log.status_code == 200])
    failed_calls = total_calls - success_calls
    
    # 生成报告
    report = f"""
    每日数据报告 ({yesterday.strftime('%Y-%m-%d')})
    =====================================
    总调用次数: {total_calls}
    成功调用: {success_calls}
    失败调用: {failed_calls}
    成功率: {success_calls / total_calls * 100:.2f}%
    """
    
    logger.info(report)
    
    # 发送报告（示例）
    # send_email(to="admin@example.com", subject="每日报告", body=report)
    
    logger.info("每日报告生成完成")
    logger.info("=" * 60)
```

### 示例 2: 清理旧日志

```python
@SchedulerTask(
    id="cleanup_old_logs_001",
    name="清理旧日志",
    cron="0 3 * * 0",
    description="每周日凌晨 3:00 清理 30 天前的日志"
)
def cleanup_old_logs(session: Session) -> None:
    """清理旧日志"""
    logger.info("=" * 60)
    logger.info("开始清理旧日志...")
    
    # 计算截止日期
    cutoff_date = datetime.utcnow() - timedelta(days=30)
    
    # 查询旧日志
    statement = select(TraceLog).where(TraceLog.created_at < cutoff_date)
    old_logs = session.exec(statement).all()
    
    # 删除旧日志
    for log in old_logs:
        session.delete(log)
    
    session.commit()
    
    logger.info(f"清理了 {len(old_logs)} 条旧日志")
    logger.info("=" * 60)
```

### 示例 3: 定时数据同步

```python
@SchedulerTask(
    id="sync_data_001",
    name="数据同步",
    cron="0 */2 * * *",
    description="每 2 小时同步一次数据"
)
def sync_data(session: Session) -> None:
    """同步数据"""
    logger.info("=" * 60)
    logger.info("开始数据同步...")
    
    try:
        # 从外部源获取数据
        # data = fetch_external_data()
        
        # 保存到数据库
        # for item in data:
        #     session.add(item)
        
        session.commit()
        logger.info("数据同步成功")
    except Exception as e:
        logger.error(f"数据同步失败: {e}", exc_info=True)
        session.rollback()
    finally:
        logger.info("=" * 60)
```

### 示例 4: 定时健康检查

```python
@SchedulerTask(
    id="health_check_001",
    name="系统健康检查",
    cron="*/10 * * * *",
    description="每 10 分钟检查一次系统健康状态"
)
def health_check(session: Session) -> None:
    """系统健康检查"""
    logger.info("执行健康检查...")
    
    # 检查数据库连接
    try:
        session.exec(select(TraceLog).limit(1))
        logger.info("✓ 数据库连接正常")
    except Exception as e:
        logger.error(f"✗ 数据库连接失败: {e}")
    
    # 检查 Redis 连接
    try:
        from stockaibe_be.services.limiter import limiter_service
        limiter_service.redis_client.ping()
        logger.info("✓ Redis 连接正常")
    except Exception as e:
        logger.error(f"✗ Redis 连接失败: {e}")
    
    logger.info("健康检查完成")
```

---

## 使用场景

### ✅ 适合的场景

1. **定时数据统计和报告**
   - 每日/每周/每月报告
   - 数据汇总和分析

2. **定期数据清理和归档**
   - 清理过期日志
   - 归档历史数据

3. **定时数据同步**（无限流需求）
   - 内部系统数据同步
   - 数据库间数据迁移

4. **定时健康检查**
   - 系统状态监控
   - 服务可用性检查

5. **定时备份任务**
   - 数据库备份
   - 文件备份

### ❌ 不适合的场景

1. **需要限流保护的任务**
   - 使用 `@LimitTask` 代替

2. **循环中的频繁调用**
   - 使用 `@LimitCallTask` 代替

3. **实时响应的任务**
   - 使用 API 端点代替

---

## 注意事项

### 1. 无限流保护

`@SchedulerTask` 不受配额限制，任务会按 Cron 表达式准时执行。如果需要限流保护，请使用 `@LimitTask`。

### 2. 长时间运行

如果任务执行时间过长，可能会影响下次调度：

```python
# 不推荐：任务执行时间超过调度间隔
@SchedulerTask(id="task_001", name="任务", cron="*/5 * * * *")
def long_running_task(session: Session) -> None:
    time.sleep(600)  # 10 分钟，超过 5 分钟的调度间隔
```

**解决方案**:
- 优化任务逻辑，减少执行时间
- 调整 Cron 表达式，增加调度间隔
- 将任务拆分成多个小任务

### 3. 异常处理

任务内部应该处理异常，避免影响调度器：

```python
@SchedulerTask(id="task_001", name="任务", cron="0 * * * *")
def my_task(session: Session) -> None:
    try:
        # 任务逻辑
        pass
    except Exception as e:
        logger.error(f"任务执行失败: {e}", exc_info=True)
        # 不要让异常传播到调度器
```

### 4. 数据库事务

`session` 由调度器管理，任务结束后会自动提交：

```python
@SchedulerTask(id="task_001", name="任务", cron="0 * * * *")
def my_task(session: Session) -> None:
    # 修改数据
    # ...
    
    # 不需要手动 commit，调度器会自动处理
    # session.commit()  # 不需要
```

如果需要手动控制事务：

```python
@SchedulerTask(id="task_001", name="任务", cron="0 * * * *")
def my_task(session: Session) -> None:
    try:
        # 修改数据
        # ...
        session.commit()
    except Exception as e:
        logger.error(f"任务失败: {e}")
        session.rollback()
```

---

## 最佳实践

### 1. 使用有意义的 ID 和名称

```python
# ✅ 推荐
@SchedulerTask(
    id="daily_stock_report_001",
    name="每日股票报告",
    cron="0 9 * * *"
)

# ❌ 不推荐
@SchedulerTask(
    id="task1",
    name="报告",
    cron="0 9 * * *"
)
```

### 2. 添加详细的日志

```python
@SchedulerTask(id="task_001", name="任务", cron="0 * * * *")
def my_task(session: Session) -> None:
    logger.info("=" * 60)
    logger.info("任务开始...")
    
    try:
        logger.info("执行步骤 1...")
        # ...
        
        logger.info("执行步骤 2...")
        # ...
        
        logger.info("任务成功完成")
    except Exception as e:
        logger.error(f"任务失败: {e}", exc_info=True)
    finally:
        logger.info("=" * 60)
```

### 3. 合理设置 Cron 表达式

```python
# 考虑任务执行时间和系统负载

# ✅ 推荐：错开高峰期
@SchedulerTask(id="task_001", name="任务1", cron="0 3 * * *")  # 凌晨 3:00
@SchedulerTask(id="task_002", name="任务2", cron="0 4 * * *")  # 凌晨 4:00

# ❌ 不推荐：所有任务同时执行
@SchedulerTask(id="task_001", name="任务1", cron="0 0 * * *")  # 午夜
@SchedulerTask(id="task_002", name="任务2", cron="0 0 * * *")  # 午夜
```

### 4. 添加任务描述

```python
@SchedulerTask(
    id="cleanup_logs_001",
    name="清理旧日志",
    cron="0 3 * * 0",
    description="每周日凌晨 3:00 清理 30 天前的日志，释放存储空间"
)
```

---

## 常见问题

### Q1: 任务没有自动注册到数据库？

**A**: 确保任务文件在 `tasks/` 目录下，并且应用启动时会自动扫描。

```python
# 检查任务是否被注册
from stockaibe_be.services.task_registry import get_all_registered_tasks

tasks = get_all_registered_tasks()
print(tasks)
```

### Q2: 任务没有按时执行？

**A**: 检查以下几点：

1. 调度器是否启动？
2. 任务是否启用？（在前端"任务调度"页面查看）
3. Cron 表达式是否正确？
4. 服务器时区是否正确？

### Q3: 如何手动触发任务？

**A**: 在前端"任务调度"页面，点击任务的"立即执行"按钮。

或者通过 API：

```bash
curl -X POST http://localhost:8000/api/tasks/{task_id}/trigger
```

### Q4: 如何查看任务执行历史？

**A**: 在前端"请求追踪"页面，可以查看所有任务的执行记录。

---

## 相关文档

- [LimitTask 使用手册](./LIMITTASK_MANUAL.md)
- [LimitCallTask 使用手册](./LIMITCALLTASK_MANUAL.md)
- [配额管理指南](./QUOTA_NAME_MAPPING.md)
- [任务调度故障排查](./TROUBLESHOOTING_TASKS.md)
