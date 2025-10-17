# 任务装饰器总览

本文档提供 stockaibe/be 项目中三种任务装饰器的快速对比和选择指南。

---

## 三种装饰器对比

| 特性 | @SchedulerTask | @LimitTask | @LimitCallTask |
|------|----------------|------------|----------------|
| **类型** | 调度任务 | 调度任务+限流 | 函数限流 |
| **触发方式** | Cron 表达式 | Cron 表达式 | 被动调用 |
| **限流保护** | ❌ | ✅ | ✅ |
| **自动重试** | ❌ | ❌ | ✅ (最多10次) |
| **函数签名** | `(session: Session)` | `(session: Session)` | 任意参数 |
| **配额要求** | 不需要 | 必须 | 必须 |
| **典型场景** | 定时报告、数据清理 | 定时API调用 | 循环中的API调用 |
| **执行频率** | 低频（小时/天） | 低频（小时/天） | 高频（秒/分钟） |

---

## 快速选择指南

### 选择 @SchedulerTask

**适用场景**:
- ✅ 定时执行的内部操作
- ✅ 不需要限流保护
- ✅ 执行频率较低（每小时/每天）

**示例**:
```python
@SchedulerTask(
    id="daily_report_001",
    name="每日数据报告",
    cron="0 9 * * *"
)
def daily_report(session: Session) -> None:
    # 生成每日报告
    pass
```

**典型用途**:
- 每日数据统计报告
- 定期数据清理和归档
- 定时健康检查
- 定时备份任务

---

### 选择 @LimitTask

**适用场景**:
- ✅ 定时调用外部服务
- ✅ 需要限流保护
- ✅ 执行频率较低（每小时/每天）
- ✅ 配额不足时可以跳过

**示例**:
```python
@LimitTask(
    id="fetch_data_001",
    name="获取外部数据",
    quota_name="external_api",
    cron="0 * * * *"
)
def fetch_external_data(session: Session) -> None:
    # 调用外部 API
    pass
```

**典型用途**:
- 定时调用外部 API
- 定时发送邮件通知
- 定时数据同步（需限流）
- 定时备份到云端

---

### 选择 @LimitCallTask

**适用场景**:
- ✅ 在循环中频繁调用
- ✅ 需要限流保护
- ✅ 需要自动重试
- ✅ 多个函数共享配额

**示例**:
```python
@LimitCallTask(
    id="call_api_001",
    name="调用API",
    quota_name="external_api"
)
def call_api(data: dict) -> dict:
    # 调用外部 API
    return requests.post("https://api.example.com", json=data).json()

# 在调度任务中使用
@SchedulerTask(id="batch_001", name="批量处理", cron="0 * * * *")
def batch_process(session: Session) -> None:
    for item in get_items():
        result = call_api(item)  # 自动限流和重试
```

**典型用途**:
- 批量 API 调用
- 批量邮件发送
- 批量数据库写入
- 批量文件处理

---

## 装饰器组合使用

### 模式 1: 调度任务 + 限流函数

最常用的组合模式：

```python
# 1. 定义限流函数
@LimitCallTask(id="api_001", name="调用API", quota_name="external_api")
def call_api(data: dict) -> dict:
    return requests.post("https://api.example.com", json=data).json()

# 2. 在调度任务中使用
@SchedulerTask(id="batch_001", name="批量处理", cron="0 * * * *")
def batch_process(session: Session) -> None:
    for item in get_items():
        result = call_api(item)  # 自动应用限流
```

**优势**:
- ✅ 调度任务控制执行时间
- ✅ 限流函数控制调用频率
- ✅ 职责分离，易于维护

### 模式 2: 多函数共享配额

多个函数共享同一个配额：

```python
@LimitCallTask(id="api_1", name="API1", quota_name="shared_api")
def call_api_1(data):
    pass

@LimitCallTask(id="api_2", name="API2", quota_name="shared_api")
def call_api_2(data):
    pass

@LimitCallTask(id="api_3", name="API3", quota_name="shared_api")
def call_api_3(data):
    pass

# 三个函数共享 "shared_api" 配额
# 修改配额参数，三个函数都会受影响
```

**优势**:
- ✅ 统一管理：一个配额控制多个函数
- ✅ 动态调整：修改配额参数，所有函数立即生效
- ✅ 灵活分配：根据实际需求调整配额容量

---

## 配额配置指南

### 配额参数说明

| 参数 | 类型 | 说明 |
|------|------|------|
| **id** | str | 配额唯一标识 |
| **name** | str | 配额名称（用于匹配） |
| **capacity** | float | 令牌桶容量（最大令牌数） |
| **refill_rate** | float | 令牌补充速率（令牌/秒） |
| **enabled** | bool | 是否启用 |

### 常用配额配置

#### 外部 API 调用

```json
{
  "id": "external_api",
  "name": "external_api",
  "capacity": 10,
  "refill_rate": 1.0,
  "enabled": true
}
```

- **容量**: 10 个令牌（允许突发 10 次调用）
- **速率**: 每秒补充 1 个令牌（平均每秒 1 次调用）

#### 邮件服务

```json
{
  "id": "email_service",
  "name": "email_service",
  "capacity": 20,
  "refill_rate": 0.1,
  "enabled": true
}
```

- **容量**: 20 个令牌（允许突发 20 封邮件）
- **速率**: 每 10 秒补充 1 个令牌（平均每 10 秒 1 封邮件）

#### 数据库写入

```json
{
  "id": "db_write",
  "name": "db_write",
  "capacity": 50,
  "refill_rate": 5.0,
  "enabled": true
}
```

- **容量**: 50 个令牌（允许突发 50 次写入）
- **速率**: 每秒补充 5 个令牌（平均每秒 5 次写入）

### 配额容量计算

```python
# 公式：容量 = 平均调用频率 × 突发时长

# 示例 1：API 平均每秒 1 次，允许突发 10 秒
capacity = 1 * 10 = 10

# 示例 2：邮件平均每 10 秒 1 封，允许突发 200 秒（3.3分钟）
capacity = (1/10) * 200 = 20

# 示例 3：数据库平均每秒 5 次，允许突发 10 秒
capacity = 5 * 10 = 50
```

---

## 使用流程

### 1. 创建配额

在前端"配额管理"页面或通过 API 创建配额：

```bash
curl -X POST http://localhost:8000/api/quotas \
  -H "Content-Type: application/json" \
  -d '{
    "id": "external_api",
    "name": "external_api",
    "capacity": 10,
    "refill_rate": 1.0,
    "enabled": true
  }'
```

### 2. 定义任务

在 `tasks/` 目录下创建任务文件：

```python
# tasks/my_tasks.py

from sqlmodel import Session
from stockaibe_be.services.task_decorators import (
    SchedulerTask,
    LimitTask,
    LimitCallTask
)

# 定义限流函数
@LimitCallTask(id="api_001", name="调用API", quota_name="external_api")
def call_api(data: dict) -> dict:
    # 函数逻辑
    pass

# 定义调度任务
@SchedulerTask(id="batch_001", name="批量处理", cron="0 * * * *")
def batch_process(session: Session) -> None:
    for item in get_items():
        result = call_api(item)
```

### 3. 启动应用

```bash
python -m stockaibe_be.main
```

任务会自动注册到数据库，并开始执行。

### 4. 监控和管理

在前端查看和管理任务：

- **任务调度页面**: 查看任务列表、启用/禁用、手动触发
- **请求追踪页面**: 查看函数调用记录、成功率、延迟
- **配额管理页面**: 查看配额使用情况、剩余令牌、动态调整参数

---

## 常见问题

### Q1: 如何选择合适的装饰器？

**A**: 根据以下决策树选择：

```
需要定时执行？
├─ 是 → 需要限流保护？
│      ├─ 是 → 使用 @LimitTask
│      └─ 否 → 使用 @SchedulerTask
└─ 否 → 在循环中调用？
       ├─ 是 → 使用 @LimitCallTask
       └─ 否 → 普通函数（不需要装饰器）
```

### Q2: 任务没有自动注册？

**A**: 确保任务文件在 `tasks/` 目录下，应用启动时会自动扫描。

### Q3: 配额不足时会发生什么？

**A**: 取决于装饰器类型：

- **@LimitTask**: 任务被跳过，等待下次调度
- **@LimitCallTask**: 自动等待并重试（最多 10 次）

### Q4: 如何动态调整配额？

**A**: 在前端"配额管理"页面或通过 API 修改配额参数：

```bash
curl -X PATCH http://localhost:8000/api/quotas/external_api \
  -H "Content-Type: application/json" \
  -d '{"refill_rate": 2.0}'
```

修改后立即生效，无需重启应用。

### Q5: 多个函数如何共享配额？

**A**: 使用相同的 `quota_name` 即可：

```python
@LimitCallTask(id="api_1", name="API1", quota_name="shared_api")
def call_api_1(data):
    pass

@LimitCallTask(id="api_2", name="API2", quota_name="shared_api")
def call_api_2(data):
    pass
```

---

## 详细文档

- [SchedulerTask 使用手册](./SCHEDULERTASK_MANUAL.md) - 周期性调度任务详细说明
- [LimitTask 使用手册](./LIMITTASK_MANUAL.md) - 调度+限流任务详细说明
- [LimitCallTask 使用手册](./LIMITCALLTASK_GUIDE.md) - 函数级别限流详细说明
- [配额管理指南](./QUOTA_NAME_MAPPING.md) - 配额配置和管理
- [任务调度故障排查](./TROUBLESHOOTING_TASKS.md) - 常见问题和解决方案

---

## 最佳实践

### 1. 命名规范

```python
# ✅ 推荐：使用清晰的 ID 和名称
@SchedulerTask(
    id="daily_stock_report_001",
    name="每日股票报告",
    cron="0 9 * * *"
)

# ❌ 不推荐：使用模糊的 ID
@SchedulerTask(
    id="task1",
    name="报告",
    cron="0 9 * * *"
)
```

### 2. 日志记录

```python
from stockaibe_be.core.logging_config import get_logger

logger = get_logger(__name__)

@SchedulerTask(id="task_001", name="任务", cron="0 * * * *")
def my_task(session: Session) -> None:
    logger.info("=" * 60)
    logger.info("任务开始...")
    
    try:
        # 任务逻辑
        logger.info("任务成功完成")
    except Exception as e:
        logger.error(f"任务失败: {e}", exc_info=True)
    finally:
        logger.info("=" * 60)
```

### 3. 异常处理

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

### 4. 配额设计

```python
# 考虑任务的调用频率和外部服务的限制

# 任务每小时执行一次，每次调用 100 个 API
# 外部 API 限制 1000 次/小时
{
  "capacity": 200,     # 允许突发 200 次
  "refill_rate": 0.28  # 每小时 1000 个令牌 (1000/3600)
}
```

---

## 示例代码

完整的示例代码请参考：

- `tasks/example_tasks.py` - 基础示例
- `tasks/batch_processing_example.py` - 批量处理完整示例

---

## 技术支持

如有问题，请查看：

1. [任务调度故障排查](./TROUBLESHOOTING_TASKS.md)
2. [配额管理指南](./QUOTA_NAME_MAPPING.md)
3. 前端"请求追踪"页面查看调用记录
4. 日志文件：`logs/stockaibe.log`
