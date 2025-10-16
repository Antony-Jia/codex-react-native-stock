# 配额名称映射说明

## 📋 概述

在任务系统中，`Quota` 模型现在包含两个标识字段：
- **`id`**: 配额的唯一标识符（主键）
- **`name`**: 配额的名称，用于与任务的 `quota_name` 字段匹配

## 🔗 映射关系

### 任务装饰器 → 配额

任务装饰器中的 `quota_name` 参数对应 `Quota.name` 字段：

```python
@LimitTask(
    id="external_api_call_001",
    name="调用外部API",
    quota_name="external_api",  # ← 这里匹配 Quota.name
    description="调用外部 API 服务"
)
def call_external_api(session: Session) -> None:
    pass
```

### 数据库配额记录

```python
Quota(
    id="quota_001",           # 配额的唯一 ID（可以不同）
    name="external_api",      # ← 这里与任务的 quota_name 匹配
    capacity=10.0,
    refill_rate=1.0,
    enabled=True
)
```

## 🔧 已修改的文件

### 1. `task_registry.py`
- ✅ 使用 `quotas_by_name` 字典（键为 `quota.name`）
- ✅ 验证任务的 `quota_name` 时查找 `quotas_by_name`
- ✅ 添加了详细的日志输出

### 2. `task_decorators.py`
- ✅ `LimitCallTask` 装饰器中使用 `Quota.name == quota_name` 查询

### 3. `scheduler.py`
- ✅ 执行任务时使用 `Quota.name == quota_name` 查询配额
- ✅ 添加了配额不存在的警告日志

### 4. `init_quotas.py`
- ✅ 已正确设置 `id` 和 `name` 字段

## 📊 配额示例

| ID | Name | 说明 |
|----|------|------|
| quota_001 | external_api | 外部API调用 |
| quota_002 | data_sync | 数据同步 |
| quota_003 | email_service | 邮件服务 |
| quota_004 | db_write | 数据库写入 |
| quota_005 | dynamic_api | 动态API调用 |

## 🚀 使用流程

1. **创建配额**：
   ```python
   quota = Quota(
       id="unique_id",
       name="external_api",  # 这个名称将被任务引用
       capacity=10.0,
       refill_rate=1.0
   )
   ```

2. **在任务中引用**：
   ```python
   @LimitTask(
       id="task_001",
       name="API调用",
       quota_name="external_api"  # 引用配额的 name
   )
   ```

3. **系统自动匹配**：
   - 任务注册时验证 `quota_name` 是否存在于 `Quota.name`
   - 任务执行时通过 `Quota.name` 查找配额
   - 限流器通过 `Quota.name` 应用限流策略

## ⚠️ 注意事项

1. **配额名称唯一性**：虽然 `Quota.id` 是主键，但 `Quota.name` 也应该保持唯一，避免任务匹配混淆
2. **大小写敏感**：配额名称匹配是大小写敏感的
3. **配额不存在**：如果任务的 `quota_name` 找不到对应的配额，任务将按无限制执行，并记录警告日志
4. **配额禁用**：如果配额的 `enabled=False`，任务也将按无限制执行

## 🔍 调试建议

查看日志中的配额匹配信息：
```
✓ 任务 external_api_call_001 关联配额: external_api (ID: quota_001)
```

如果看到警告：
```
⚠️ 任务 xxx 的配额名称 'yyy' 不存在，将按无限制处理
```

检查：
1. 配额是否已创建（运行 `init_quotas.py`）
2. 配额的 `name` 字段是否与任务的 `quota_name` 完全匹配
3. 配额是否已启用（`enabled=True`）
