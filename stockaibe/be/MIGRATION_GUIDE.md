# 代码重构迁移指南

## 重构概述

本次重构将原有的扁平化代码结构改造为分层的工程化架构，提高了代码的可维护性和可扩展性。

## 主要变更

### 1. 删除的内容

- ❌ **be/dashboard/** 目录已完全删除
  - 原因：dashboard 功能应独立部署，不应与后端 API 混合

### 2. 目录结构变更

#### 旧结构
```
be/src/stockaibe_be/
├── auth.py
├── config.py
├── database.py
├── limiter.py
├── main.py
├── models.py
├── scheduler.py
└── schemas.py
```

#### 新结构
```
be/src/stockaibe_be/
├── api/              # API 路由层
│   ├── auth.py
│   ├── quotas.py
│   ├── limiter.py
│   ├── metrics.py
│   ├── traces.py
│   └── tasks.py
├── core/             # 核心配置
│   ├── config.py
│   ├── database.py
│   └── security.py
├── models/           # 数据模型
│   └── models.py
├── schemas/          # 数据验证
│   └── schemas.py
├── services/         # 业务逻辑
│   ├── limiter.py
│   └── scheduler.py
└── main.py           # 应用入口
```

### 3. 文件映射关系

| 旧文件 | 新位置 | 变更说明 |
|--------|--------|----------|
| `auth.py` | `core/security.py` + `api/auth.py` | 拆分为安全工具和API路由 |
| `config.py` | `core/config.py` | 移动到 core 模块 |
| `database.py` | `core/database.py` | 移动到 core 模块 |
| `limiter.py` | `services/limiter.py` + `api/limiter.py` | 拆分为服务和API |
| `models.py` | `models/models.py` | 移动到 models 模块 |
| `scheduler.py` | `services/scheduler.py` + `api/tasks.py` | 拆分为服务和API |
| `schemas.py` | `schemas/schemas.py` | 移动到 schemas 模块 |
| `main.py` | `main.py` + `api/*.py` | 路由拆分到各个 API 模块 |

### 4. 导入路径变更

#### 旧导入方式
```python
from .auth import get_current_user
from .config import settings
from .database import get_db
from .limiter import limiter_service
from .models import User, Quota
from .schemas import QuotaCreate
```

#### 新导入方式
```python
from .core.security import get_current_user
from .core.config import settings
from .core.database import get_db
from .services.limiter import limiter_service
from .models import User, Quota
from .schemas import QuotaCreate
```

### 5. API 路由变更

#### 旧方式（所有路由在 main.py）
```python
@app.post("/api/auth/login")
def login(...):
    pass

@app.get("/api/quotas")
def list_quotas(...):
    pass
```

#### 新方式（路由分散在各模块）
```python
# api/auth.py
router = APIRouter()

@router.post("/login")
def login(...):
    pass

# api/quotas.py
router = APIRouter()

@router.get("")
def list_quotas(...):
    pass

# main.py
app.include_router(api_router, prefix="/api")
```

## 功能对比

| 功能 | 旧实现 | 新实现 | 状态 |
|------|--------|--------|------|
| 用户认证 | `main.py` | `api/auth.py` | ✅ 保持 |
| 配额管理 | `main.py` | `api/quotas.py` | ✅ 保持 |
| 限流服务 | `main.py` | `api/limiter.py` | ✅ 保持 |
| 监控指标 | `main.py` | `api/metrics.py` | ✅ 保持 |
| 请求追踪 | `main.py` | `api/traces.py` | ✅ 保持 |
| 任务调度 | `main.py` | `api/tasks.py` | ✅ 保持 |
| Dashboard | `dashboard/app.py` | ❌ 已删除 | ⚠️ 需独立部署 |

## 兼容性说明

### API 端点保持不变

所有 API 端点路径保持完全一致，客户端无需修改：

- ✅ `POST /api/auth/register`
- ✅ `POST /api/auth/login`
- ✅ `GET /api/auth/me`
- ✅ `GET /api/quotas`
- ✅ `POST /api/quotas`
- ✅ `PUT /api/quotas/{quota_id}`
- ✅ `POST /api/quotas/{quota_id}/toggle`
- ✅ `POST /api/limiter/acquire`
- ✅ `GET /api/metrics/current`
- ✅ `GET /api/metrics/series`
- ✅ `GET /api/traces`
- ✅ `GET /api/tasks`
- ✅ `POST /api/tasks`
- ✅ `POST /api/tasks/trigger`
- ✅ `DELETE /api/tasks/{job_id}`

### 数据库模型保持不变

所有数据库表结构保持一致，无需迁移数据。

### 配置方式保持不变

环境变量和配置文件格式保持一致。

## 新增功能

### 1. 启动脚本

新增 `run.py` 便于开发：

```bash
python run.py
```

### 2. 配置示例文件

新增 `env.example` 提供配置模板。

### 3. 架构文档

新增 `ARCHITECTURE.md` 详细说明系统架构。

### 4. 更完善的文档

更新 `README.md` 包含完整的使用说明。

## 升级步骤

### 对于开发者

1. **拉取最新代码**
   ```bash
   git pull
   ```

2. **无需额外操作**
   - 依赖未变更，无需重新安装
   - 数据库结构未变更，无需迁移
   - 配置方式未变更，无需修改

3. **启动服务**
   ```bash
   python run.py
   # 或
   poetry run uvicorn stockaibe_be.main:app --reload
   ```

### 对于前端/客户端

**无需任何修改** - 所有 API 端点保持完全兼容。

## 注意事项

### ⚠️ Dashboard 已删除

原 `be/dashboard/` 目录已删除。如需可视化界面：

1. **选项1**: 使用独立的前端项目（推荐）
   - 参考 `fe/` 目录（React + Ant Design）

2. **选项2**: 重新创建独立的 Streamlit 应用
   - 在项目根目录创建独立的 dashboard 项目
   - 通过 API 调用后端服务

### 📝 代码引用更新

如果你的代码中有直接导入 `stockaibe_be` 的模块，需要更新导入路径：

```python
# 旧
from stockaibe_be.auth import get_current_user
from stockaibe_be.limiter import limiter_service

# 新
from stockaibe_be.core.security import get_current_user
from stockaibe_be.services.limiter import limiter_service
```

## 优势总结

### ✅ 代码组织更清晰
- 按功能域划分模块
- 职责分离明确
- 易于定位和修改

### ✅ 可维护性提升
- 模块化设计
- 降低耦合度
- 便于单元测试

### ✅ 可扩展性增强
- 新增功能只需添加对应模块
- 不影响现有代码
- 支持团队协作开发

### ✅ 符合最佳实践
- 遵循 FastAPI 推荐的项目结构
- 清晰的分层架构
- 便于新人理解

## 问题排查

### 导入错误

**问题**: `ModuleNotFoundError: No module named 'stockaibe_be.auth'`

**解决**: 更新导入路径
```python
# 错误
from stockaibe_be.auth import get_current_user

# 正确
from stockaibe_be.core.security import get_current_user
```

### 启动失败

**问题**: 服务启动报错

**排查步骤**:
1. 检查 Python 版本（需要 3.13+）
2. 重新安装依赖：`poetry install`
3. 检查数据库文件路径
4. 查看详细错误日志

## 技术支持

如有问题，请参考：
1. `README.md` - 使用说明
2. `ARCHITECTURE.md` - 架构设计
3. 项目根目录的 `README.md` - 系统设计文档

## 总结

本次重构是一次**无破坏性升级**：
- ✅ API 完全兼容
- ✅ 数据库无需迁移
- ✅ 配置无需修改
- ✅ 功能完全保留
- ✅ 代码质量提升

唯一的变更是删除了 `dashboard/` 目录，建议使用独立的前端项目替代。
