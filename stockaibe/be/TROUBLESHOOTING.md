# 故障排查指南

## 常见问题

### 1. 启动后无法访问且没有日志

**症状**: 运行 `uvicorn stockaibe_be.main:app --reload --host 0.0.0.0 --port 8000` 后，服务器似乎启动了但无法访问，也看不到详细日志。

**原因**:
- 使用了错误的 Python 环境（base 环境而不是 stockai 环境）
- `.env` 文件路径配置问题导致使用了默认的数据库配置
- 数据库连接失败但错误信息被隐藏

**解决方案**:

1. **确保使用正确的 conda 环境**:
   ```bash
   # 方式1: 使用完整路径
   C:\Users\Admin\anaconda3\envs\stockai\Scripts\uvicorn.exe stockaibe_be.main:app --reload --host 0.0.0.0 --port 8000
   
   # 方式2: 使用启动脚本
   .\start_server.bat
   ```

2. **检查 .env 文件是否存在**:
   ```bash
   # 检查文件是否存在
   Test-Path .env
   
   # 如果不存在，从示例文件复制
   Copy-Item env.example .env
   ```

3. **验证配置加载**:
   ```bash
   conda run -n stockai python test_startup.py
   ```

### 2. 数据库连接失败

**症状**: 
```
sqlalchemy.exc.OperationalError: (psycopg2.OperationalError) connection to server at "localhost" failed
```

**解决方案**:

1. **检查 PostgreSQL 是否运行**:
   ```bash
   # Windows: 检查服务状态
   Get-Service postgresql*
   ```

2. **验证数据库连接配置**:
   检查 `.env` 文件中的 `LIMITER_DATABASE_URL`:
   ```bash
   LIMITER_DATABASE_URL=postgresql://用户名:密码@主机:端口/数据库名
   ```

3. **测试数据库连接**:
   ```bash
   conda run -n stockai python -c "import sys; sys.path.insert(0, 'src'); from stockaibe_be.core.database import engine; from sqlalchemy import text; conn = engine.connect(); print('Connected:', conn.execute(text('SELECT 1')).scalar())"
   ```

### 3. Redis 连接失败

**症状**:
```
redis.exceptions.ConnectionError: Error connecting to Redis
```

**解决方案**:

1. **检查 Redis 是否运行**:
   ```bash
   # 测试 Redis 连接
   redis-cli ping
   ```

2. **验证 Redis 配置**:
   检查 `.env` 文件中的 `LIMITER_REDIS_URL`:
   ```bash
   # 无密码
   LIMITER_REDIS_URL=redis://localhost:6379/0
   
   # 有密码
   LIMITER_REDIS_URL=redis://:your_password@localhost:6379/0
   ```

### 4. 模块导入错误

**症状**:
```
ModuleNotFoundError: No module named 'psycopg2'
```

**解决方案**:

确保在 stockai 环境中安装了所有依赖:
```bash
conda activate stockai
pip install psycopg2-binary fastapi uvicorn sqlmodel redis apscheduler
```

### 5. 中文乱码问题

**症状**: 控制台输出显示 `��ҳ: 936` 或其他乱码。

**说明**: 这是 Windows PowerShell 的编码问题，不影响服务器功能。

**解决方案**:
```powershell
# 临时设置控制台编码为 UTF-8
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
chcp 65001
```

### 6. 端口已被占用

**症状**:
```
OSError: [WinError 10048] Only one usage of each socket address is normally permitted
```

**解决方案**:

1. **查找占用端口的进程**:
   ```bash
   netstat -ano | findstr :8000
   ```

2. **终止进程**:
   ```bash
   taskkill /PID <进程ID> /F
   ```

3. **或使用其他端口**:
   ```bash
   uvicorn stockaibe_be.main:app --reload --host 0.0.0.0 --port 8001
   ```

## 调试技巧

### 1. 启用详细日志

在 `main.py` 中添加日志配置:
```python
import logging
logging.basicConfig(level=logging.DEBUG)
```

### 2. 检查环境变量

```bash
conda run -n stockai python -c "from stockaibe_be.core.config import settings; print(vars(settings))"
```

### 3. 测试单个组件

使用 `test_startup.py` 脚本逐个测试各个组件的连接状态。

### 4. 查看完整错误堆栈

不使用 `--reload` 模式启动，可以看到更详细的错误信息:
```bash
C:\Users\Admin\anaconda3\envs\stockai\Scripts\uvicorn.exe stockaibe_be.main:app --host 0.0.0.0 --port 8000
```

## 获取帮助

如果以上方法都无法解决问题:

1. 检查 `test_startup.py` 的输出，确定具体是哪个组件出现问题
2. 查看 PostgreSQL 和 Redis 的日志文件
3. 确认 `.env` 文件的配置与实际环境匹配
