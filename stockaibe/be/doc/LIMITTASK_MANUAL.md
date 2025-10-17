# LimitTask 装饰器使用手册

## 概述

`@LimitTask` 结合了调度和限流功能，任务按 Cron 表达式执行，但执行前会检查配额。如果配额不足，任务会被跳过。适用于需要限流保护的定时任务。

---

## 语法

```python
@LimitTask(
    id: str,              # 任务唯一标识
    name: str,            # 任务名称（可重复）
    quota_name: str,      # 关联的配额名称
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
- **示例**: `"fetch_stock_data_001"`, `"send_email_001"`

### name (必需)
- **类型**: `str`
- **说明**: 任务的显示名称，可以重复，用于前端展示
- **示例**: `"获取股票数据"`, `"发送每日邮件"`

### quota_name (必需)
- **类型**: `str`
- **说明**: 关联的配额名称，必须在 `Quota` 表中存在
- **注意**: 使用配额的 `name` 字段匹配，不是 `id` 字段
- **示例**: `"external_api"`, `"email_service"`

### description (可选)
- **类型**: `str`
- **说明**: 任务描述，用于说明任务的用途
- **示例**: `"从外部 API 获取股票数据，受限流保护"`

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

---

## 配额配置

### 创建配额

在使用 `@LimitTask` 之前，必须先创建对应的配额。

#### 方式 1: 通过 API 创建

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

#### 方式 2: 在前端创建

1. 打开前端"配额管理"页面
2. 点击"新建配额"
3. 填写配额参数：
   - **ID**: `external_api`
   - **名称**: `external_api`
   - **容量**: `10`
   - **补充速率**: `1.0`
   - **启用**: `true`
4. 保存

### 配额参数说明

| 参数 | 类型 | 说明 |
|------|------|------|
| **id** | str | 配额唯一标识 |
| **name** | str | 配额名称（用于匹配） |
| **capacity** | float | 令牌桶容量（最大令牌数） |
| **refill_rate** | float | 令牌补充速率（令牌/秒） |
| **enabled** | bool | 是否启用 |

### 配额配置建议

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
- **适用场景**: 调用频率限制为 1 次/秒的 API

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
- **适用场景**: 邮件服务限制为 6 封/分钟

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
- **适用场景**: 数据库写入限制为 5 次/秒

---

## 限流行为

### 执行流程

```
调度器触发任务
    ↓
检查配额是否存在
    ↓
检查配额是否启用
    ↓
检查是否有足够的令牌
    ↓
    ├─ 有令牌 → 消耗令牌 → 执行任务 → 记录成功
    └─ 无令牌 → 跳过任务 → 记录限流 (429)
```

### 关键特性

1. **不会阻塞**: 如果配额不足，任务会被跳过，不会等待
2. **不会重试**: 任务不会自动重试，等待下次调度
3. **完整追踪**: 所有执行（包括被跳过的）都会记录到 `TraceLog` 表

---

## 完整示例

### 示例 1: 获取股票数据

```python
from sqlmodel import Session
from stockaibe_be.services.task_decorators import LimitTask
from stockaibe_be.core.logging_config import get_logger
import requests

logger = get_logger(__name__)

@LimitTask(
    id="fetch_stock_data_001",
    name="获取股票数据",
    quota_name="external_api",
    description="从外部 API 获取股票数据，受限流保护"
)
def fetch_stock_data(session: Session) -> None:
    """获取股票数据"""
    logger.info("=" * 60)
    logger.info("开始获取股票数据...")
    
    try:
        # 调用外部 API
        response = requests.get(
            "https://api.example.com/stocks",
            timeout=10
        )
        response.raise_for_status()
        data = response.json()
        
        # 保存数据到数据库
        # for stock in data:
        #     session.add(Stock(**stock))
        
        session.commit()
        
        logger.info(f"成功获取 {len(data)} 条股票数据")
    except requests.RequestException as e:
        logger.error(f"API 调用失败: {e}", exc_info=True)
        session.rollback()
    except Exception as e:
        logger.error(f"数据处理失败: {e}", exc_info=True)
        session.rollback()
    finally:
        logger.info("=" * 60)
```

### 示例 2: 发送每日邮件

```python
@LimitTask(
    id="send_daily_email_001",
    name="发送每日邮件",
    quota_name="email_service",
    description="发送每日邮件通知，受限流保护"
)
def send_daily_email(session: Session) -> None:
    """发送每日邮件"""
    logger.info("=" * 60)
    logger.info("开始发送每日邮件...")
    
    try:
        # 获取收件人列表
        recipients = get_recipients(session)
        
        # 生成邮件内容
        subject = "每日数据报告"
        body = generate_report(session)
        
        # 发送邮件
        for recipient in recipients:
            send_email(
                to=recipient.email,
                subject=subject,
                body=body
            )
        
        logger.info(f"成功发送 {len(recipients)} 封邮件")
    except Exception as e:
        logger.error(f"邮件发送失败: {e}", exc_info=True)
    finally:
        logger.info("=" * 60)


def get_recipients(session: Session):
    """获取收件人列表"""
    # 从数据库查询收件人
    return []


def generate_report(session: Session) -> str:
    """生成报告内容"""
    return "报告内容..."


def send_email(to: str, subject: str, body: str):
    """发送邮件"""
    # 调用邮件服务
    pass
```

### 示例 3: 数据同步任务

```python
@LimitTask(
    id="sync_user_data_001",
    name="同步用户数据",
    quota_name="db_write",
    description="从外部系统同步用户数据，受限流保护"
)
def sync_user_data(session: Session) -> None:
    """同步用户数据"""
    logger.info("=" * 60)
    logger.info("开始同步用户数据...")
    
    try:
        # 从外部系统获取数据
        external_users = fetch_external_users()
        
        # 批量写入数据库
        for user in external_users:
            # 检查用户是否存在
            existing_user = session.get(User, user["id"])
            
            if existing_user:
                # 更新用户
                for key, value in user.items():
                    setattr(existing_user, key, value)
            else:
                # 创建新用户
                session.add(User(**user))
        
        session.commit()
        
        logger.info(f"成功同步 {len(external_users)} 个用户")
    except Exception as e:
        logger.error(f"数据同步失败: {e}", exc_info=True)
        session.rollback()
    finally:
        logger.info("=" * 60)


def fetch_external_users():
    """从外部系统获取用户数据"""
    # 调用外部 API
    return []
```

### 示例 4: 定时备份任务

```python
@LimitTask(
    id="backup_database_001",
    name="数据库备份",
    quota_name="backup_service",
    description="定时备份数据库，受限流保护"
)
def backup_database(session: Session) -> None:
    """数据库备份"""
    logger.info("=" * 60)
    logger.info("开始数据库备份...")
    
    try:
        import subprocess
        from datetime import datetime
        
        # 生成备份文件名
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        backup_file = f"backup_{timestamp}.sql"
        
        # 执行备份命令
        subprocess.run([
            "pg_dump",
            "-h", "localhost",
            "-U", "postgres",
            "-d", "stockaibe",
            "-f", backup_file
        ], check=True)
        
        logger.info(f"备份成功: {backup_file}")
    except subprocess.CalledProcessError as e:
        logger.error(f"备份失败: {e}", exc_info=True)
    except Exception as e:
        logger.error(f"备份过程出错: {e}", exc_info=True)
    finally:
        logger.info("=" * 60)
```

---

## 使用场景

### ✅ 适合的场景

1. **调用外部 API**
   - 防止超出 API 配额
   - 避免被限流或封禁

2. **发送邮件通知**
   - 防止邮件服务过载
   - 避免被标记为垃圾邮件

3. **数据库写入**
   - 防止数据库压力过大
   - 避免影响其他服务

4. **文件上传下载**
   - 防止带宽耗尽
   - 控制网络流量

5. **定时备份**
   - 控制备份频率
   - 避免影响系统性能

### ❌ 不适合的场景

1. **循环中的频繁调用**
   - 使用 `@LimitCallTask` 代替

2. **内部操作（无限流需求）**
   - 使用 `@SchedulerTask` 代替

3. **需要立即执行的任务**
   - 使用 API 端点代替

---

## 注意事项

### 1. 配额必须存在

如果配额不存在或未启用，任务会被跳过：

```python
# 确保配额存在
curl http://localhost:8000/api/quotas/external_api

# 如果不存在，创建配额
curl -X POST http://localhost:8000/api/quotas \
  -H "Content-Type: application/json" \
  -d '{"id": "external_api", "name": "external_api", ...}'
```

### 2. 不会自动重试

如果配额不足，任务会被跳过，不会等待或重试。需要等待下次调度：

```python
# 示例：任务每小时执行一次
@LimitTask(id="task_001", name="任务", quota_name="api", cron="0 * * * *")
def my_task(session: Session) -> None:
    pass

# 如果 10:00 配额不足，任务被跳过
# 需要等到 11:00 下次调度
```

### 3. 适合低频任务

`@LimitTask` 适合调度频率较低的任务（如每小时、每天）：

```python
# ✅ 推荐：低频任务
@LimitTask(id="task_001", name="任务", quota_name="api", cron="0 9 * * *")  # 每天

# ⚠️ 不推荐：高频任务
@LimitTask(id="task_002", name="任务", quota_name="api", cron="* * * * *")  # 每分钟
```

### 4. 配额容量设计

配额容量应该考虑任务的调度频率：

```python
# 任务每小时执行一次，每次消耗 1 个令牌
# 配额应该至少有 1 个令牌的容量

{
  "capacity": 10,      # 允许突发 10 次
  "refill_rate": 0.5   # 每 2 秒补充 1 个令牌
}
```

---

## 监控和追踪

### 1. 查看任务状态

在前端"任务调度"页面：
- 查看任务列表
- 查看任务状态（启用/禁用）
- 查看下次执行时间
- 手动触发任务

### 2. 查看执行记录

在前端"请求追踪"页面：
- 查看所有任务的执行记录
- 查看成功/失败/限流次数
- 查看执行耗时
- 查看错误信息

### 3. 查看配额使用情况

在前端"配额管理"页面：
- 查看配额列表
- 查看剩余令牌数
- 动态调整配额参数
- 启用/禁用配额

---

## 动态调整配额

配额参数可以在运行时动态调整，无需重启应用：

### 调整补充速率

```bash
# 降低调用频率（从 1.0 降到 0.5）
curl -X PATCH http://localhost:8000/api/quotas/external_api \
  -H "Content-Type: application/json" \
  -d '{"refill_rate": 0.5}'
```

### 调整容量

```bash
# 增加容量（从 10 增到 20）
curl -X PATCH http://localhost:8000/api/quotas/external_api \
  -H "Content-Type: application/json" \
  -d '{"capacity": 20}'
```

### 临时禁用配额

```bash
# 禁用配额（任务会被跳过）
curl -X PATCH http://localhost:8000/api/quotas/external_api \
  -H "Content-Type: application/json" \
  -d '{"enabled": false}'
```

### 手动补充令牌

```bash
# 手动补充令牌（测试用）
curl -X POST http://localhost:8000/api/quotas/external_api/refill
```

---

## 最佳实践

### 1. 使用有意义的 ID 和名称

```python
# ✅ 推荐
@LimitTask(
    id="fetch_stock_data_001",
    name="获取股票数据",
    quota_name="external_api"
)

# ❌ 不推荐
@LimitTask(
    id="task1",
    name="任务",
    quota_name="api"
)
```

### 2. 添加详细的日志

```python
@LimitTask(id="task_001", name="任务", quota_name="api")
def my_task(session: Session) -> None:
    logger.info("=" * 60)
    logger.info("任务开始...")
    
    try:
        logger.info("执行步骤 1...")
        # ...
        
        logger.info("任务成功完成")
    except Exception as e:
        logger.error(f"任务失败: {e}", exc_info=True)
    finally:
        logger.info("=" * 60)
```

### 3. 合理设置配额参数

```python
# 考虑任务的调度频率和外部服务的限制

# 任务每小时执行一次，外部 API 限制 100 次/小时
{
  "capacity": 10,      # 允许突发 10 次
  "refill_rate": 0.03  # 每小时补充 100 个令牌 (100/3600)
}
```

### 4. 处理异常情况

```python
@LimitTask(id="task_001", name="任务", quota_name="api")
def my_task(session: Session) -> None:
    try:
        # 任务逻辑
        pass
    except requests.RequestException as e:
        logger.error(f"API 调用失败: {e}")
        # 不要让异常传播
    except Exception as e:
        logger.error(f"任务失败: {e}", exc_info=True)
        session.rollback()
```

---

## 常见问题

### Q1: 任务被跳过，提示配额不足？

**A**: 检查配额配置：

1. 配额是否存在？
   ```bash
   curl http://localhost:8000/api/quotas/external_api
   ```

2. 配额是否启用？
   ```json
   {"enabled": true}
   ```

3. 配额容量和补充速率是否合理？
   ```json
   {
     "capacity": 10,
     "refill_rate": 1.0
   }
   ```

### Q2: 如何查看配额剩余令牌？

**A**: 在前端"配额管理"页面，可以实时查看剩余令牌数。

或者通过 API：

```bash
curl http://localhost:8000/api/quotas
```

### Q3: 任务被限流后，何时会再次执行？

**A**: 等待下次调度时间。如果配额仍然不足，会再次被跳过。

### Q4: 如何手动触发任务？

**A**: 在前端"任务调度"页面，点击任务的"立即执行"按钮。

或者通过 API：

```bash
curl -X POST http://localhost:8000/api/tasks/{task_id}/trigger
```

---

## 相关文档

- [SchedulerTask 使用手册](./SCHEDULERTASK_MANUAL.md)
- [LimitCallTask 使用手册](./LIMITCALLTASK_MANUAL.md)
- [配额管理指南](./QUOTA_NAME_MAPPING.md)
- [任务调度故障排查](./TROUBLESHOOTING_TASKS.md)
