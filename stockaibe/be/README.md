# StockCrawler Limiter Admin Backend

基于 FastAPI + APScheduler 的限流与调度管理后台，遵循 `stockaibe/readme.md` 的蓝图设计。

## 功能特性

- **认证授权**: JWT 登录/注册与用户管理
- **配额管理**: 分域/分端点的限流配额 CRUD
- **限流服务**: 令牌桶算法实现的 `/api/limiter/acquire` 接口
- **监控指标**: 实时指标查询与时间序列数据
- **请求追踪**: 详细的请求日志追踪
- **任务调度**: APScheduler 定时任务管理

## 项目结构

```
be/
├── src/stockaibe_be/
│   ├── api/              # API路由层
│   │   ├── auth.py       # 认证相关API
│   │   ├── quotas.py     # 配额管理API
│   │   ├── limiter.py    # 限流API
│   │   ├── metrics.py    # 监控指标API
│   │   ├── traces.py     # 追踪日志API
│   │   └── tasks.py      # 任务调度API
│   ├── core/             # 核心配置和依赖
│   │   ├── config.py     # 配置管理
│   │   ├── database.py   # 数据库连接
│   │   └── security.py   # 安全相关（JWT、密码）
│   ├── models/           # 数据模型
│   │   └── models.py     # SQLAlchemy模型
│   ├── schemas/          # Pydantic schemas
│   │   └── schemas.py    # 请求/响应模型
│   ├── services/         # 业务逻辑层
│   │   ├── limiter.py    # 限流服务
│   │   └── scheduler.py  # 调度服务
│   └── main.py           # FastAPI应用入口
├── pyproject.toml        # Poetry依赖配置
├── run.py                # 开发服务器启动脚本
└── README.md             # 本文档
```

## 快速开始

### 安装依赖

```bash
cd stockaibe/be
poetry install
```

### 启动开发服务器

```bash
# 方式1: 使用启动脚本
python run.py

# 方式2: 使用poetry命令
poetry run uvicorn stockaibe_be.main:app --reload --host 0.0.0.0 --port 8000
```

### 配置说明

默认配置会在 `src/data/limiter.db` 创建 SQLite 数据库。

可通过环境变量或 `.env` 文件自定义配置（前缀 `LIMITER_`）：

```bash
LIMITER_SECRET_KEY=your-secret-key
LIMITER_DATABASE_URL=sqlite:///path/to/db.db
LIMITER_SCHEDULER_TIMEZONE=Asia/Shanghai
```

### 首次使用

1. 启动服务后访问 http://localhost:8000/docs 查看API文档
2. 使用 `POST /api/auth/register` 注册用户（首个用户自动成为超级管理员）
3. 使用 `POST /api/auth/login` 登录获取token
4. 在后续请求中携带 `Authorization: Bearer <token>` 访问受保护的API

## API接口

### 认证相关
- `POST /api/auth/register` - 用户注册
- `POST /api/auth/login` - 用户登录
- `GET /api/auth/me` - 获取当前用户信息

### 配额管理
- `GET /api/quotas` - 获取所有配额
- `POST /api/quotas` - 创建配额（需要超级管理员权限）
- `PUT /api/quotas/{quota_id}` - 更新配额（需要超级管理员权限）
- `POST /api/quotas/{quota_id}/toggle` - 启用/禁用配额（需要超级管理员权限）

### 限流服务
- `POST /api/limiter/acquire` - 获取令牌（核心限流接口）

### 监控指标
- `GET /api/metrics/current` - 获取当前指标
- `GET /api/metrics/series` - 获取时间序列数据

### 请求追踪
- `GET /api/traces` - 获取请求追踪日志

### 任务调度
- `GET /api/tasks` - 获取所有任务
- `POST /api/tasks` - 创建定时任务（需要超级管理员权限）
- `POST /api/tasks/trigger` - 手动触发任务（需要超级管理员权限）
- `DELETE /api/tasks/{job_id}` - 删除任务（需要超级管理员权限）

## 开发指南

### 添加新的API端点

1. 在 `api/` 目录下创建或编辑相应的路由文件
2. 在 `api/__init__.py` 中注册新的路由
3. 如需新的数据模型，在 `models/models.py` 中添加
4. 如需新的请求/响应schema，在 `schemas/schemas.py` 中添加

### 添加新的业务逻辑

在 `services/` 目录下创建新的服务模块，并在 `services/__init__.py` 中导出。

## 技术栈

- **FastAPI**: 现代、高性能的Web框架
- **SQLAlchemy**: ORM数据库工具
- **APScheduler**: 任务调度库
- **Pydantic**: 数据验证和设置管理
- **JWT**: 身份认证
- **Uvicorn**: ASGI服务器

## 更多信息

详细的系统设计和架构说明请参阅项目根目录的 `README.md` 文件。
