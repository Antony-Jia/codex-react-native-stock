# 限流函数调用追踪功能指南

## 功能概述

为 TraceLog 添加了 func_id 和 func_name 字段，用于追踪每个使用配额限流的函数调用情况。

## 追踪范围

只有通过以下装饰器定义的函数会被追踪：
- @LimitTask - 定时执行的限流任务
- @LimitCallTask - 函数级别的限流调用

## 数据库迁移

运行 migration_add_func_tracking.sql 脚本添加新字段。

## API 端点

### 获取函数调用统计
GET /api/traces/func-stats

返回每个限流函数的调用统计，包括：
- 总调用次数
- 成功/失败/被限流次数
- 平均延迟
- 最后调用时间

### 获取详细调用记录
GET /api/traces?limit=100

返回包含 func_id 和 func_name 的详细调用记录。

## 使用示例

```python
@LimitCallTask(id="api_001", name="调用API", quota_name="external_api")
def call_api(data: dict) -> dict:
    return requests.post("https://api.example.com", json=data).json()
```

所有调用都会记录 func_id="api_001" 和 func_name="调用API"。
