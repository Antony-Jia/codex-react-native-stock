# 项目架构说明

## 概述

StockCrawler Limiter Admin 是一个基于 FastAPI 的股票爬虫限流与任务调度管理系统。本文档描述了项目的工程化架构设计。

## 设计原则

1. **分层架构**: 清晰的分层设计，职责分离
2. **模块化**: 按功能模块组织代码，便于维护和扩展
3. **依赖注入**: 使用 FastAPI 的依赖注入系统
4. **类型安全**: 使用 Python 类型提示和 Pydantic 验证

## 目录结构

```
stockaibe_be/
├── api/              # API 路由层 (Controller)
│   ├── __init__.py   # 路由聚合和注册
│   ├── auth.py       # 认证相关端点
│   ├── quotas.py     # 配额管理端点
│   ├── limiter.py    # 限流服务端点
│   ├── metrics.py    # 监控指标端点
│   ├── traces.py     # 追踪日志端点
│   └── tasks.py      # 任务调度端点
│
├── core/             # 核心配置和基础设施
│   ├── __init__.py   # 核心模块导出
│   ├── config.py     # 配置管理（Pydantic Settings）
│   ├── database.py   # 数据库连接和会话管理
│   └── security.py   # 安全相关（JWT、密码哈希、认证）
│
├── models/           # 数据模型层 (Model)
│   ├── __init__.py   # 模型导出
│   └── models.py     # SQLAlchemy ORM 模型定义
│
├── schemas/          # 数据验证层 (DTO)
│   ├── __init__.py   # Schema 导出
│   └── schemas.py    # Pydantic 请求/响应模型
│
├── services/         # 业务逻辑层 (Service)
│   ├── __init__.py   # 服务导出
│   ├── limiter.py    # 限流业务逻辑（令牌桶算法）
│   └── scheduler.py  # 任务调度业务逻辑
│
├── __init__.py       # 包初始化
└── main.py           # FastAPI 应用入口
```

## 各层职责

### 1. API 层 (`api/`)

**职责**: 处理 HTTP 请求和响应

- 定义路由端点
- 请求参数验证（通过 Pydantic）
- 调用服务层处理业务逻辑
- 返回标准化的响应
- 处理 HTTP 异常

**设计要点**:
- 每个模块对应一个功能域
- 使用 `APIRouter` 组织路由
- 依赖注入获取数据库会话和当前用户
- 保持轻量，不包含业务逻辑

### 2. Core 层 (`core/`)

**职责**: 提供核心基础设施

#### config.py
- 使用 `pydantic-settings` 管理配置
- 支持环境变量和 .env 文件
- 提供类型安全的配置访问

#### database.py
- SQLAlchemy 引擎和会话管理
- 提供 `get_db()` 依赖注入函数
- 数据库连接池配置

#### security.py
- JWT token 生成和验证
- 密码哈希和验证（bcrypt）
- 认证和授权依赖函数

### 3. Models 层 (`models/`)

**职责**: 定义数据库模型

- SQLAlchemy ORM 模型
- 表结构定义
- 关系映射
- 时间戳 Mixin

**核心模型**:
- `User`: 用户表
- `Quota`: 配额表
- `Metric`: 指标表
- `TraceLog`: 追踪日志表
- `SchedulerTask`: 调度任务表

### 4. Schemas 层 (`schemas/`)

**职责**: 数据传输对象（DTO）

- Pydantic 模型定义
- 请求体验证
- 响应体序列化
- 数据类型转换

**命名规范**:
- `*Create`: 创建资源的请求模型
- `*Update`: 更新资源的请求模型
- `*Read`: 读取资源的响应模型
- `*Request`: 通用请求模型
- `*Response`: 通用响应模型

### 5. Services 层 (`services/`)

**职责**: 业务逻辑实现

#### limiter.py
- 令牌桶算法实现
- 限流状态管理
- 请求许可判断
- 指标和日志记录

#### scheduler.py
- APScheduler 集成
- 定时任务管理
- Cron 表达式解析
- 任务执行和监控

## 数据流

```
HTTP Request
    ↓
API Layer (路由处理)
    ↓
Schemas (请求验证)
    ↓
Services (业务逻辑)
    ↓
Models (数据访问)
    ↓
Database
    ↓
Models (数据返回)
    ↓
Services (业务处理)
    ↓
Schemas (响应序列化)
    ↓
API Layer (响应返回)
    ↓
HTTP Response
```

## 依赖关系

```
main.py
  ├── api/*
  │   ├── schemas/*
  │   ├── services/*
  │   ├── models/*
  │   └── core/*
  │
  ├── services/*
  │   ├── models/*
  │   └── core/*
  │
  └── core/*
      └── models/* (仅 database.py)
```

**依赖规则**:
1. 上层可以依赖下层，下层不能依赖上层
2. 同层之间尽量减少依赖
3. 核心层是最底层，被所有层依赖

## 扩展指南

### 添加新的 API 端点

1. 在 `schemas/schemas.py` 中定义请求/响应模型
2. 在 `api/` 中创建或编辑路由文件
3. 在 `api/__init__.py` 中注册路由
4. 如需新的业务逻辑，在 `services/` 中实现

### 添加新的数据模型

1. 在 `models/models.py` 中定义 SQLAlchemy 模型
2. 在 `models/__init__.py` 中导出
3. 创建数据库迁移（如使用 Alembic）
4. 在 `schemas/schemas.py` 中定义对应的 Pydantic 模型

### 添加新的服务

1. 在 `services/` 中创建新的服务文件
2. 实现业务逻辑类或函数
3. 在 `services/__init__.py` 中导出
4. 在 API 层中调用

## 最佳实践

1. **保持单一职责**: 每个模块只负责一个功能域
2. **使用类型提示**: 所有函数都应有完整的类型注解
3. **异常处理**: 在 API 层统一处理异常，返回标准错误响应
4. **日志记录**: 关键操作应记录日志
5. **文档字符串**: 为公共函数和类添加文档字符串
6. **测试**: 为核心业务逻辑编写单元测试

## 配置管理

配置优先级（从高到低）:
1. 环境变量（`LIMITER_*`）
2. `.env` 文件
3. 默认值（`core/config.py`）

## 安全考虑

1. **密码**: 使用 bcrypt 哈希存储
2. **JWT**: 使用 HS256 算法签名
3. **CORS**: 生产环境应配置具体的允许源
4. **SQL 注入**: 使用 SQLAlchemy ORM 防止
5. **权限控制**: 敏感操作需要超级管理员权限

## 性能优化

1. **数据库连接池**: SQLAlchemy 自动管理
2. **异步支持**: 可升级为 `async/await` 模式
3. **缓存**: 可集成 Redis 缓存热点数据
4. **限流**: 已实现令牌桶算法

## 监控和日志

1. **请求追踪**: `TraceLog` 表记录所有限流请求
2. **指标收集**: `Metric` 表记录性能指标
3. **任务日志**: 调度任务执行记录
4. **健康检查**: `/health` 端点

## 未来扩展方向

1. **Redis 集成**: 分布式限流状态管理
2. **消息队列**: 异步任务处理
3. **Prometheus**: 指标导出
4. **Grafana**: 可视化监控
5. **Docker**: 容器化部署
6. **K8s**: 集群部署支持
