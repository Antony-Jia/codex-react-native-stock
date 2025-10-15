# @LimitCallTask 函数级别限流装饰器指南

## 概述

`@LimitCallTask` 是一个**函数级别的限流装饰器**，用于保护被频繁调用的函数。与 `@LimitTask` 不同，它不是调度任务，而是为普通函数添加限流保护。

## 核心特性

✅ **函数级别限流**: 每次函数调用都自动应用配额限流  
✅ **自动重试**: 被限流时自动等待并重试，无需手动处理  
✅ **一对多映射**: 多个函数可以共享同一个配额  
✅ **动态调整**: 后台修改配额参数，所有函数立即生效  
✅ **完整追踪**: 所有调用记录到 `TraceLog` 表  
✅ **透明集成**: 装饰后的函数使用方式不变

---

## 使用场景

### 适用场景

1. **批量 API 调用**: 在循环中调用外部 API，防止超过速率限制
2. **批量邮件发送**: 防止邮件服务过载
3. **批量数据库操作**: 控制数据库写入频率
4. **批量文件处理**: 限制文件 I/O 操作速率
5. **爬虫请求**: 控制网页抓取频率

### 不适用场景

- 单次执行的任务（使用 `@SchedulerTask`）
- 需要精确调度时间的任务（使用 `@SchedulerTask`）
- 不需要限流的函数（直接定义普通函数）

---

## 快速开始

### 1. 定义限流函数

```python
from src.stockaibe_be.services.task_decorators import LimitCallTask

@LimitCallTask(
    id="api_call_001",
    name="调用外部API",
    quota_name="external_api",
    description="调用外部 API，受限流保护"
)
def call_external_api(data: dict) -> dict:
    """调用外部 API"""
    import requests
    response = requests.post("https://api.example.com", json=data)
    return response.json()
```

### 2. 创建配额

在前端"配额管理"或通过 API 创建配额：

```json
{
  "id": "external_api",
  "capacity": 10,
  "refill_rate": 1.0,
  "enabled": true
}
```

**配额参数说明：**
- `capacity`: 令牌桶容量（最大令牌数）
- `refill_rate`: 补充速率（令牌/秒）
- 上述配置表示：最多存储 10 个令牌，每秒补充 1 个

### 3. 在调度任务中使用

```python
from sqlmodel import Session
from src.stockaibe_be.services.task_decorators import SchedulerTask

@SchedulerTask(
    id="batch_process_001",
    name="批量处理",
    cron="0 * * * *"
)
def batch_process(session: Session) -> None:
    """批量处理任务"""
    items = get_items_to_process()
    
    for item in items:
        # 每次调用都会自动应用限流
        result = call_external_api(item)
        process_result(result)
```

---

## 装饰器详解

### 参数说明

```python
@LimitCallTask(
    id: str,              # 任务唯一标识
    name: str,            # 任务名称（可重复）
    quota_name: str,      # 关联的配额名称
    description: str = None  # 任务描述（可选）
)
```

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `id` | str | ✅ | 函数唯一标识，全局唯一 |
| `name` | str | ✅ | 函数名称，可重复 |
| `quota_name` | str | ✅ | 关联的配额名称，必须在 `Quota` 表中存在 |
| `description` | str | ❌ | 函数描述 |

### 工作流程

```
函数调用
    ↓
检查配额是否存在
    ↓
尝试获取令牌
    ↓
成功 → 执行函数 → 记录成功日志
    ↓
失败 → 等待重试（指数退避）→ 最多重试 10 次
    ↓
超时 → 抛出 RuntimeError
```

### 限流策略

1. **自动重试**: 被限流时自动等待并重试
2. **指数退避**: 等待时间逐渐增加（0.2s, 0.4s, 0.8s, ...）
3. **最大等待**: 单次最多等待 5 秒
4. **最大重试**: 最多重试 10 次
5. **超时处理**: 超过重试次数抛出异常

---

## 完整示例

### 示例 1：批量 API 调用

```python
from typing import List, Dict, Any
from sqlmodel import Session
from src.stockaibe_be.services.task_decorators import SchedulerTask, LimitCallTask
from src.stockaibe_be.core.logging_config import get_logger

logger = get_logger(__name__)

# 定义限流函数
@LimitCallTask(
    id="api_call_external_001",
    name="调用外部API",
    quota_name="external_api",
    description="调用外部 API，每次调用受限流保护"
)
def call_external_api(item_id: int, data: Dict[str, Any]) -> Dict[str, Any]:
    """调用外部 API"""
    logger.info(f"调用 API: item_id={item_id}")
    
    import requests
    response = requests.post(
        "https://api.example.com/process",
        json=data
    )
    
    return response.json()

# 在调度任务中使用
@SchedulerTask(
    id="batch_api_call_001",
    name="批量API调用",
    cron="*/5 * * * *",  # 每 5 分钟
    description="批量调用外部 API"
)
def batch_api_call_task(session: Session) -> None:
    """批量调用外部 API"""
    logger.info("开始批量 API 调用...")
    
    # 获取要处理的数据
    items = [
        {"id": i, "name": f"Item_{i}"}
        for i in range(1, 101)  # 100 个项目
    ]
    
    success_count = 0
    failed_count = 0
    
    for item in items:
        try:
            # 自动应用限流
            result = call_external_api(item["id"], item)
            success_count += 1
            logger.info(f"✓ 处理成功: {result}")
        except Exception as e:
            failed_count += 1
            logger.error(f"✗ 处理失败: {e}")
    
    logger.info(
        f"批量处理完成: 成功 {success_count}, 失败 {failed_count}"
    )
```

### 示例 2：批量邮件发送

```python
@LimitCallTask(
    id="send_email_001",
    name="发送邮件",
    quota_name="email_service",
    description="发送邮件通知"
)
def send_email(recipient: str, subject: str, body: str) -> bool:
    """发送邮件"""
    import smtplib
    from email.mime.text import MIMEText
    
    msg = MIMEText(body)
    msg['Subject'] = subject
    msg['To'] = recipient
    
    # 发送邮件逻辑
    # ...
    
    return True

@SchedulerTask(
    id="daily_notification_001",
    name="每日通知",
    cron="0 9 * * *"  # 每天早上 9 点
)
def daily_notification_task(session: Session) -> None:
    """每日邮件通知"""
    recipients = get_all_users()
    
    for user in recipients:
        try:
            send_email(
                recipient=user.email,
                subject="每日报告",
                body=f"您好 {user.name}，这是您的每日报告..."
            )
        except Exception as e:
            logger.error(f"邮件发送失败: {e}")
```

### 示例 3：多函数共享配额

```python
# 多个函数使用同一个配额
@LimitCallTask(
    id="api_get_001",
    name="API GET 请求",
    quota_name="shared_api",  # 共享配额
)
def api_get(url: str) -> dict:
    import requests
    return requests.get(url).json()

@LimitCallTask(
    id="api_post_001",
    name="API POST 请求",
    quota_name="shared_api",  # 共享配额
)
def api_post(url: str, data: dict) -> dict:
    import requests
    return requests.post(url, json=data).json()

@LimitCallTask(
    id="api_delete_001",
    name="API DELETE 请求",
    quota_name="shared_api",  # 共享配额
)
def api_delete(url: str) -> dict:
    import requests
    return requests.delete(url).json()

# 三个函数共享 'shared_api' 配额的令牌池
# 修改配额参数，三个函数同时生效
```

---

## 配额配置建议

### 外部 API 调用

```json
{
  "id": "external_api",
  "capacity": 10,
  "refill_rate": 1.0,
  "enabled": true
}
```
- 每秒最多 1 次请求
- 可以短时间内突发 10 次请求

### 邮件服务

```json
{
  "id": "email_service",
  "capacity": 20,
  "refill_rate": 0.1,
  "enabled": true
}
```
- 每 10 秒补充 1 个令牌
- 最多存储 20 个令牌

### 数据库写入

```json
{
  "id": "db_write",
  "capacity": 50,
  "refill_rate": 5.0,
  "enabled": true
}
```
- 每秒最多 5 次写入
- 可以短时间内突发 50 次写入

### 爬虫请求

```json
{
  "id": "web_crawler",
  "capacity": 5,
  "refill_rate": 0.5,
  "enabled": true
}
```
- 每 2 秒补充 1 个令牌
- 最多存储 5 个令牌
- 避免被目标网站封禁

---

## 动态调整

### 场景：根据时段调整限流

**高峰期（降低频率）：**
```bash
PUT /api/quotas/external_api
{
  "refill_rate": 0.5  # 每 2 秒补充 1 个令牌
}
```

**低峰期（提高频率）：**
```bash
PUT /api/quotas/external_api
{
  "refill_rate": 2.0  # 每秒补充 2 个令牌
}
```

**紧急情况（完全禁用）：**
```bash
PUT /api/quotas/external_api
{
  "enabled": false  # 所有使用该配额的函数停止执行
}
```

---

## 监控和调试

### 查看函数调用记录

前端"请求追踪"页面可以看到：
- 每次函数调用的记录
- 状态码（200/429/500）
- 执行延迟
- 关联的配额

### 查看日志

```bash
# 查看限流日志
tail -f logs/stockaibe.log | grep "限流"

# 查看特定函数的日志
tail -f logs/stockaibe.log | grep "call_external_api"
```

### 日志示例

```
✓ 函数 call_external_api 执行成功 (耗时 45.23ms, 剩余令牌 8.5)
⏳ 函数 call_external_api 被限流 (剩余令牌 0.0, 等待 0.20s, 重试 1/10)
⚠️ 函数 call_external_api 超过最大重试次数 10，配额 external_api 可能耗尽
```

---

## 最佳实践

### 1. 合理设置配额

```python
# ❌ 错误：配额过小，容易超时
{
  "capacity": 1,
  "refill_rate": 0.01  # 100 秒才补充 1 个令牌
}

# ✅ 正确：根据实际需求设置
{
  "capacity": 10,
  "refill_rate": 1.0  # 每秒补充 1 个令牌
}
```

### 2. 异常处理

```python
@SchedulerTask(id="task_001", name="任务", cron="0 * * * *")
def my_task(session: Session) -> None:
    for item in items:
        try:
            result = limited_function(item)
        except RuntimeError as e:
            # 限流超时
            logger.warning(f"限流超时，跳过剩余项目: {e}")
            break
        except Exception as e:
            # 其他错误
            logger.error(f"处理失败: {e}")
            continue
```

### 3. 批量处理策略

```python
# 策略 1：全部处理（可能很慢）
for item in items:
    result = limited_function(item)

# 策略 2：限时处理（超时则跳过）
import time
start_time = time.time()
for item in items:
    if time.time() - start_time > 300:  # 5 分钟超时
        break
    try:
        result = limited_function(item)
    except RuntimeError:
        break

# 策略 3：分批处理（推荐）
batch_size = 10
for i in range(0, len(items), batch_size):
    batch = items[i:i+batch_size]
    for item in batch:
        result = limited_function(item)
```

### 4. 配额命名规范

```python
# 推荐命名
"external_api"      # 外部 API
"email_service"     # 邮件服务
"db_write"          # 数据库写入
"web_crawler"       # 网页爬虫
"file_upload"       # 文件上传

# 避免
"api"               # 太宽泛
"limit1"            # 无意义
"test_quota"        # 测试用途
```

---

## 与其他装饰器对比

| 装饰器 | 用途 | 调度方式 | 限流方式 | 使用场景 |
|--------|------|----------|----------|----------|
| `@SchedulerTask` | 周期性任务 | Cron 表达式 | 无 | 定时任务 |
| `@LimitTask` | 限流任务 | Cron 表达式 | 任务级别 | 定时 + 限流 |
| `@LimitCallTask` | 限流函数 | 手动调用 | 函数级别 | 循环调用 + 限流 |

### 组合使用

```python
# @SchedulerTask + @LimitCallTask（推荐）
@SchedulerTask(id="task_001", name="定时任务", cron="0 * * * *")
def scheduled_task(session: Session) -> None:
    for item in items:
        result = limited_function(item)  # 限流函数

@LimitCallTask(id="func_001", name="限流函数", quota_name="api")
def limited_function(item):
    return process(item)
```

---

## 常见问题

### Q1: 函数一直被限流怎么办？

**检查：**
1. 配额是否存在且已启用
2. `refill_rate` 是否太低
3. `capacity` 是否太小
4. 是否有其他函数共享同一配额

**解决：**
```bash
# 提高补充速率
PUT /api/quotas/your_quota
{
  "refill_rate": 2.0  # 增加到每秒 2 个令牌
}

# 或增加容量
{
  "capacity": 20  # 增加到 20 个令牌
}
```

### Q2: 如何禁用限流？

```bash
# 方法 1：禁用配额
PUT /api/quotas/your_quota
{
  "enabled": false
}

# 方法 2：删除装饰器（需要重启）
# @LimitCallTask(...)  # 注释掉
def my_function():
    pass
```

### Q3: 多个函数共享配额会互相影响吗？

**会的！** 这是设计特性，用于统一限流。

```python
# 三个函数共享 'shared_api' 配额
@LimitCallTask(id="f1", name="F1", quota_name="shared_api")
def func1(): pass

@LimitCallTask(id="f2", name="F2", quota_name="shared_api")
def func2(): pass

@LimitCallTask(id="f3", name="F3", quota_name="shared_api")
def func3(): pass

# 配额: capacity=10, refill_rate=1.0
# func1 消耗 5 个令牌 → 剩余 5 个
# func2 消耗 3 个令牌 → 剩余 2 个
# func3 消耗 3 个令牌 → 被限流（令牌不足）
```

### Q4: 如何查看当前剩余令牌数？

```python
from src.stockaibe_be.services import limiter_service

tokens = limiter_service.get_current_tokens("your_quota_id")
print(f"剩余令牌: {tokens}")
```

---

## 完整工作流程

```
1. 定义限流函数
   @LimitCallTask(id="xxx", name="XXX", quota_name="api")
   def my_func(): pass

2. 创建配额
   POST /api/quotas {"id": "api", "capacity": 10, "refill_rate": 1.0}

3. 在任务中调用
   @SchedulerTask(...)
   def task(session):
       for item in items:
           my_func(item)  # 自动限流

4. 监控执行
   - 前端"请求追踪"查看调用记录
   - 日志查看详细信息

5. 动态调整
   - 修改配额参数
   - 立即生效，无需重启
```

---

## 相关文档

- [任务装饰器指南](./TASK_DECORATOR_GUIDE.md)
- [配额管理文档](./QUOTA_MANAGEMENT.md)
- [日志系统文档](./LOGGING.md)
- [完整示例](./tasks/batch_processing_example.py)
