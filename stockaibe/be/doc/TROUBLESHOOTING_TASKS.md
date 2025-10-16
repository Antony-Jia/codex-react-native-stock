# 任务未创建到数据库 - 问题排查指南

## 问题现象

`tasks/example_tasks.py` 中定义的任务没有出现在数据库中。

## 根本原因

根据日志分析，应用启动时**数据库连接失败**，导致启动流程中断，任务扫描和注册代码根本没有执行到。

### 错误日志

```
psycopg2.OperationalError: connection to server at "127.0.0.1", port 5432 failed: Connection refused
Is the server running on that host and accepting TCP/IP connections?
```

### 启动流程

```
1. 应用启动
2. 创建数据库表 (SQLModel.metadata.create_all) ← 在这里失败
3. 初始化调度任务 (init_jobs) ← 未执行
4. 扫描 tasks/ 目录 ← 未执行
5. 注册任务到数据库 ← 未执行
```

## 解决方案

### 方案 1：启动 PostgreSQL 数据库（推荐）

#### Windows 服务方式

1. 打开"服务"（services.msc）
2. 找到 PostgreSQL 服务
3. 启动服务

#### Docker 方式

```bash
docker run -d --name postgres \
  -e POSTGRES_USER=stockai \
  -e POSTGRES_PASSWORD=stockai_password \
  -e POSTGRES_DB=stockai_limiter \
  -p 5432:5432 \
  postgres:latest
```

#### 验证连接

```bash
# 使用 psql 测试连接
psql -h localhost -U stockai -d stockai_limiter

# 或使用 Python 测试
python -c "import psycopg2; conn = psycopg2.connect('postgresql://stockai:stockai_password@localhost:5432/stockai_limiter'); print('连接成功')"
```

### 方案 2：使用 SQLite（仅用于测试）

如果只是想测试任务系统，可以临时改用 SQLite：

#### 修改配置

编辑 `src/stockaibe_be/core/config.py`:

```python
class Settings(BaseSettings):
    # 原来的 PostgreSQL
    # database_url: str = "postgresql://stockai:stockai_password@localhost:5432/stockai_limiter"
    
    # 改为 SQLite
    database_url: str = "sqlite:///./stockai_limiter.db"
    
    # ... 其他配置保持不变
```

#### 修改数据库引擎配置

编辑 `src/stockaibe_be/core/database.py`:

```python
# 根据数据库类型调整参数
if settings.database_url.startswith("sqlite"):
    engine = create_engine(
        settings.database_url,
        echo=False,
        connect_args={"check_same_thread": False}  # SQLite 需要这个
    )
else:
    engine = create_engine(
        settings.database_url,
        echo=False,
        pool_pre_ping=True,
        pool_size=10,
        max_overflow=20,
    )
```

### 方案 3：检查并修复数据库配置

#### 检查 .env 文件

确保 `.env` 文件中的数据库配置正确：

```bash
LIMITER_DATABASE_URL=postgresql://stockai:stockai_password@localhost:5432/stockai_limiter
```

#### 检查数据库是否存在

```sql
-- 连接到 PostgreSQL
psql -h localhost -U stockai

-- 列出所有数据库
\l

-- 如果数据库不存在，创建它
CREATE DATABASE stockai_limiter;
```

## 验证任务是否成功注册

### 方法 1：查看启动日志

```bash
# 查看日志中的任务相关信息
Get-Content logs\stockaibe.log | Select-String "任务|扫描|注册"
```

成功的日志应该包含：

```
任务目录: D:\Code\codex-react-native-stock\stockaibe\be\tasks
开始扫描任务模块...
✓ 扫描到模块: example_tasks
✓ 扫描到模块: batch_processing_example
任务同步完成: 创建 X 个, 更新 Y 个, 停用 Z 个, 函数限流器 N 个
✓ 已加载任务: daily_report_001 (每日数据报告)
✓ 已加载任务: weekly_cleanup_001 (每周数据清理)
...
```

### 方法 2：查询数据库

```sql
-- 查看所有任务
SELECT job_id, name, task_type, is_active, cron 
FROM scheduler_tasks 
ORDER BY created_at DESC;

-- 查看活跃任务
SELECT job_id, name, task_type, cron 
FROM scheduler_tasks 
WHERE is_active = true;

-- 统计任务数量
SELECT task_type, COUNT(*) as count 
FROM scheduler_tasks 
GROUP BY task_type;
```

### 方法 3：通过 API 查询

```bash
# 获取所有任务
curl http://localhost:8000/api/tasks

# 或在浏览器中访问
http://localhost:8000/api/tasks
```

### 方法 4：前端查看

访问前端"任务调度"页面，应该能看到所有已注册的任务。

## 常见问题

### Q1: 数据库连接成功，但任务还是没有创建？

**检查清单：**

1. 确认 `tasks/` 目录存在且包含 Python 文件
2. 确认任务文件中使用了装饰器（@SchedulerTask, @LimitTask, @LimitCallTask）
3. 确认装饰器导入路径正确
4. 查看启动日志是否有错误信息

### Q2: 任务文件导入失败？

**可能原因：**

- 任务文件中有语法错误
- 导入的模块不存在
- 循环导入问题

**解决方法：**

```bash
# 单独测试任务文件导入
python -c "import tasks.example_tasks"
```

### Q3: 任务创建到数据库但没有执行？

**检查：**

1. 任务是否被标记为 `is_active=true`
2. Cron 表达式是否正确
3. 调度器是否正常运行
4. 查看日志是否有执行记录

### Q4: 如何强制重新扫描任务？

**方法 1：重启应用**

```bash
# 停止应用
Ctrl+C

# 重新启动
python -m src.stockaibe_be.main
```

**方法 2：手动触发扫描（需要添加 API）**

可以添加一个管理 API 端点来手动触发任务扫描。

## 完整启动检查清单

- [ ] PostgreSQL 数据库正在运行
- [ ] Redis 服务正在运行
- [ ] 数据库连接配置正确
- [ ] `tasks/` 目录存在
- [ ] 任务文件使用了正确的装饰器
- [ ] Python 环境中安装了所有依赖
- [ ] 没有防火墙阻止数据库连接
- [ ] 查看启动日志确认任务已注册

## 调试技巧

### 启用详细日志

编辑 `logging_config.yaml`:

```yaml
loggers:
  stockaibe_be.services.task_registry:
    level: DEBUG  # 改为 DEBUG
  stockaibe_be.services.scheduler:
    level: DEBUG
```

### 手动测试任务扫描

使用提供的测试脚本：

```bash
# 使用 stockai 环境
C:\Users\Admin\anaconda3\envs\stockai\python.exe test_task_scan.py
```

### 查看 APScheduler 状态

```python
from stockaibe_be.services import scheduler

# 查看所有已注册的任务
for job in scheduler.get_jobs():
    print(f"{job.id}: {job.name}, next_run: {job.next_run_time}")
```

## 下一步

1. **启动数据库**: 选择方案 1 或方案 2
2. **重启应用**: `python -m src.stockaibe_be.main`
3. **查看日志**: 确认任务已注册
4. **验证数据库**: 查询 `scheduler_tasks` 表
5. **测试执行**: 等待任务触发或手动触发

## 相关文档

- [任务装饰器指南](./TASK_DECORATOR_GUIDE.md)
- [函数级别限流指南](./LIMITCALLTASK_GUIDE.md)
- [日志系统文档](./LOGGING.md)
