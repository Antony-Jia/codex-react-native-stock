# 数据库迁移指南：从 SQLite + SQLAlchemy 到 PostgreSQL + SQLModel

## 概述

本项目已从 SQLite 数据库和 SQLAlchemy ORM 迁移到 PostgreSQL 数据库和 SQLModel ORM。

## 主要变更

### 1. 依赖更新

**pyproject.toml** 中的变更：
- ❌ 移除：`sqlalchemy = "^2.0.30"`
- ✅ 添加：`sqlmodel = "^0.0.22"`
- ✅ 添加：`psycopg2-binary = "^2.9.9"`

### 2. 数据库配置

**默认数据库 URL** (在 `core/config.py` 中)：
```python
# 旧配置 (SQLite)
database_url: str = "sqlite:///./src/data/limiter.db"

# 新配置 (PostgreSQL)
database_url: str = "postgresql://stockai:stockai_password@localhost:5432/stockai_limiter"
```

**环境变量** (在 `env.example` 中)：
```bash
# 旧配置
LIMITER_DATABASE_URL=sqlite:///./src/data/limiter.db

# 新配置
LIMITER_DATABASE_URL=postgresql://stockai:stockai_password@localhost:5432/stockai_limiter
```

### 3. ORM 变更

#### 模型定义 (models/models.py)

**旧方式 (SQLAlchemy)**：
```python
from sqlalchemy import String, Integer
from sqlalchemy.orm import Mapped, mapped_column
from ..core.database import Base

class User(Base):
    __tablename__ = "users"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    username: Mapped[str] = mapped_column(String(50), unique=True)
```

**新方式 (SQLModel)**：
```python
from sqlmodel import Field, SQLModel

class User(SQLModel, table=True):
    __tablename__ = "users"
    id: Optional[int] = Field(default=None, primary_key=True)
    username: str = Field(max_length=50, unique=True)
```

#### 查询语法

**旧方式 (SQLAlchemy)**：
```python
# 查询所有
users = db.query(User).all()

# 条件查询
user = db.query(User).filter(User.username == "admin").first()

# 排序和限制
items = db.query(Metric).order_by(Metric.ts.desc()).limit(10).all()
```

**新方式 (SQLModel)**：
```python
from sqlmodel import select

# 查询所有
statement = select(User)
users = db.exec(statement).all()

# 条件查询
statement = select(User).where(User.username == "admin")
user = db.exec(statement).first()

# 排序和限制
statement = select(Metric).order_by(Metric.ts.desc()).limit(10)
items = db.exec(statement).all()
```

#### Session 管理

**旧方式 (SQLAlchemy)**：
```python
from sqlalchemy.orm import Session
from ..core.database import SessionLocal

with SessionLocal() as session:
    # 使用 session
```

**新方式 (SQLModel)**：
```python
from sqlmodel import Session
from ..core.database import engine

with Session(engine) as session:
    # 使用 session
```

## 迁移步骤

### 1. 安装 PostgreSQL

确保已安装 PostgreSQL 数据库服务器。

### 2. 创建数据库

```bash
# 登录 PostgreSQL
psql -U postgres

# 创建用户和数据库
CREATE USER stockai WITH PASSWORD 'stockai_password';
CREATE DATABASE stockai_limiter OWNER stockai;
GRANT ALL PRIVILEGES ON DATABASE stockai_limiter TO stockai;
```

### 3. 更新依赖

使用 conda 环境 `stockai`：

```bash
# 激活 conda 环境
conda activate stockai

# 使用 poetry 安装新依赖
cd stockaibe/be
poetry install
```

### 4. 配置环境变量

复制 `env.example` 到 `.env` 并更新数据库连接：

```bash
cp env.example .env
```

编辑 `.env` 文件：
```bash
LIMITER_DATABASE_URL=postgresql://stockai:your_password@localhost:5432/stockai_limiter
```

### 5. 初始化数据库表

运行应用时，SQLModel 会自动创建表结构：

```bash
# 使用 conda 的 stockai 环境
conda activate stockai
python -m stockaibe_be.main
```

或使用 uvicorn：
```bash
uvicorn stockaibe_be.main:app --reload
```

### 6. 数据迁移（如果需要）

如果需要从旧的 SQLite 数据库迁移数据到 PostgreSQL：

```python
# 创建迁移脚本 migrate_data.py
from sqlmodel import Session, create_engine, select
from stockaibe_be.models import User, Quota, Metric, TraceLog, SchedulerTask

# 旧数据库（SQLite）
old_engine = create_engine("sqlite:///./src/data/limiter.db")

# 新数据库（PostgreSQL）
new_engine = create_engine("postgresql://stockai:password@localhost:5432/stockai_limiter")

# 迁移数据
with Session(old_engine) as old_session, Session(new_engine) as new_session:
    # 迁移用户
    users = old_session.exec(select(User)).all()
    for user in users:
        new_session.add(user)
    
    # 迁移其他表...
    new_session.commit()
```

## 注意事项

1. **字符编码**：PostgreSQL 默认使用 UTF-8，确保所有中文数据正确编码
2. **连接池**：新配置使用连接池（pool_size=10, max_overflow=20）以提高性能
3. **时区**：所有时间戳使用 UTC 时区
4. **备份**：迁移前请备份原有的 SQLite 数据库文件

## 测试

迁移完成后，测试以下功能：

1. 用户注册和登录
2. Quota 的 CRUD 操作
3. 限流功能
4. 指标收集和查询
5. 任务调度

## 回滚

如果需要回滚到 SQLite：

1. 在 `.env` 中修改数据库 URL：
   ```bash
   LIMITER_DATABASE_URL=sqlite:///./src/data/limiter.db
   ```

2. 重启应用

## 支持

如有问题，请检查：
- PostgreSQL 服务是否运行
- 数据库连接字符串是否正确
- 用户权限是否足够
- 防火墙是否阻止连接
