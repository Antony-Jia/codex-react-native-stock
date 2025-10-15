# StockCrawler Limiter Admin - 部署指南

完整的限流与调度管理系统部署文档。

## 系统架构

```
┌─────────────────┐
│   前端 (React)   │  http://localhost:5173
└────────┬────────┘
         │ REST API
┌────────┴────────┐
│  后端 (FastAPI) │  http://localhost:8000
└────────┬────────┘
         │
    ┌────┴────┬──────────┐
    │         │          │
┌───┴───┐ ┌──┴───┐ ┌────┴─────┐
│ Redis │ │SQLite│ │APScheduler│
└───────┘ └──────┘ └──────────┘
```

## 环境要求

### 后端
- Python 3.13+
- Poetry (依赖管理)
- Redis 7.0+ (限流状态存储)

### 前端
- Node.js 18+
- npm 或 yarn

---

## 一、后端部署

### 1. 安装 Redis

#### Windows (使用 Docker)
```bash
docker run -d --name redis -p 6379:6379 redis:7.2
```

#### Linux/Mac
```bash
# Ubuntu/Debian
sudo apt-get install redis-server

# macOS
brew install redis
brew services start redis
```

### 2. 安装 Python 依赖

```bash
cd stockaibe/be
poetry install
```

### 3. 配置环境变量

复制配置文件：
```bash
cp env.example .env
```

编辑 `.env` 文件：
```env
# 安全配置
LIMITER_SECRET_KEY=your-very-secure-random-secret-key-here
LIMITER_ALGORITHM=HS256
LIMITER_ACCESS_TOKEN_EXPIRE_MINUTES=720

# 数据库
LIMITER_DATABASE_URL=sqlite:///./src/data/limiter.db

# Redis
LIMITER_REDIS_URL=redis://localhost:6379/0
LIMITER_REDIS_DECODE_RESPONSES=False

# 调度器
LIMITER_SCHEDULER_TIMEZONE=Asia/Shanghai

# 告警阈值
LIMITER_ALERT_ERROR_RATE_THRESHOLD=0.3
LIMITER_ALERT_429_RATE_THRESHOLD=0.3
LIMITER_ALERT_WINDOW_MINUTES=3
```

### 4. 启动后端服务

#### 开发模式
```bash
python run.py
```

或使用 Poetry：
```bash
poetry run uvicorn stockaibe_be.main:app --reload --host 0.0.0.0 --port 8000
```

#### 生产模式
```bash
poetry run gunicorn stockaibe_be.main:app \
  --workers 4 \
  --worker-class uvicorn.workers.UvicornWorker \
  --bind 0.0.0.0:8000 \
  --access-logfile - \
  --error-logfile -
```

### 5. 验证后端

访问 API 文档：http://localhost:8000/docs

健康检查：
```bash
curl http://localhost:8000/health
```

---

## 二、前端部署

### 1. 安装依赖

```bash
cd stockaibe/fe
npm install
```

### 2. 配置环境变量

复制配置文件：
```bash
cp env-example.txt .env
```

编辑 `.env` 文件：
```env
VITE_API_BASE_URL=http://localhost:8000/api
```

### 3. 启动前端服务

#### 开发模式
```bash
npm run dev
```

访问：http://localhost:5173

#### 生产构建
```bash
npm run build
```

构建产物在 `dist/` 目录，可以部署到任何静态文件服务器。

#### 使用 Nginx 部署

创建 Nginx 配置 `/etc/nginx/sites-available/limiter-admin`：

```nginx
server {
    listen 80;
    server_name your-domain.com;

    # 前端静态文件
    location / {
        root /path/to/stockaibe/fe/dist;
        try_files $uri $uri/ /index.html;
    }

    # 后端 API 代理
    location /api {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # SSE 事件流
    location /api/events/stream {
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header Connection '';
        proxy_buffering off;
        proxy_cache off;
        chunked_transfer_encoding off;
    }
}
```

启用配置：
```bash
sudo ln -s /etc/nginx/sites-available/limiter-admin /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

---

## 三、首次使用

### 1. 注册管理员账户

访问前端页面，点击"注册"标签：
- 用户名：admin
- 密码：至少6位
- 姓名：可选

**重要**：第一个注册的用户自动成为超级管理员。

### 2. 登录系统

使用刚注册的账户登录。

### 3. 创建配额

进入"配额管理"页面，点击"新建配额"：

示例配置：
```
配额 ID: sina_quote
域名: finance.sina.com.cn
端点: /api/openapi.php/StockQuoteService.getRealtimeQuotes
算法: 令牌桶
容量: 60
补充速率: 1.0 (每秒1个令牌)
启用: 是
```

### 4. 测试限流

使用 API 测试工具（如 Postman）调用：

```bash
POST http://localhost:8000/api/limiter/acquire
Content-Type: application/json
Authorization: Bearer <your-token>

{
  "qid": "sina_quote",
  "cost": 1,
  "success": true,
  "latency_ms": 120.5
}
```

响应：
```json
{
  "allow": true,
  "remain": 59.0
}
```

---

## 四、系统监控

### 1. 监控仪表盘

访问首页查看：
- 总请求数
- 成功率
- 错误率
- 429限流率
- 请求趋势图
- 配额令牌余量

### 2. 请求追踪

"请求追踪"页面实时显示：
- 请求ID
- 配额ID
- 状态码（200/429/500）
- 延迟时间
- 错误消息

### 3. 任务调度

"任务调度"页面管理定时任务：
- **snapshot_metrics**: 每分钟聚合指标
- **health_check**: 每3分钟检查健康度
- **window_reset**: 每天3点清理过期数据

---

## 五、生产环境建议

### 1. 安全配置

- 修改默认 `SECRET_KEY` 为强随机字符串
- 使用 HTTPS
- 配置防火墙规则
- 限制 Redis 访问权限

### 2. 数据库

生产环境建议使用 PostgreSQL：

```env
LIMITER_DATABASE_URL=postgresql://user:password@localhost/limiter_db
```

### 3. Redis 持久化

编辑 Redis 配置 `/etc/redis/redis.conf`：

```conf
# 启用 AOF 持久化
appendonly yes
appendfsync everysec

# RDB 快照
save 900 1
save 300 10
save 60 10000
```

### 4. 进程管理

使用 Systemd 管理后端服务：

创建 `/etc/systemd/system/limiter-admin.service`：

```ini
[Unit]
Description=StockCrawler Limiter Admin
After=network.target redis.service

[Service]
Type=notify
User=www-data
WorkingDirectory=/path/to/stockaibe/be
Environment="PATH=/path/to/.local/bin"
ExecStart=/path/to/poetry run gunicorn stockaibe_be.main:app \
  --workers 4 \
  --worker-class uvicorn.workers.UvicornWorker \
  --bind 0.0.0.0:8000
Restart=always

[Install]
WantedBy=multi-user.target
```

启用服务：
```bash
sudo systemctl enable limiter-admin
sudo systemctl start limiter-admin
sudo systemctl status limiter-admin
```

### 5. 日志管理

配置日志轮转 `/etc/logrotate.d/limiter-admin`：

```
/var/log/limiter-admin/*.log {
    daily
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 www-data www-data
    sharedscripts
    postrotate
        systemctl reload limiter-admin
    endscript
}
```

---

## 六、故障排查

### 后端无法启动

1. 检查 Redis 是否运行：
```bash
redis-cli ping
```

2. 检查端口占用：
```bash
netstat -tuln | grep 8000
```

3. 查看日志：
```bash
poetry run python run.py
```

### 前端无法连接后端

1. 检查 `.env` 中的 API 地址
2. 检查浏览器控制台网络请求
3. 确认后端 CORS 配置

### Redis 连接失败

后端会自动降级到内存模式，但功能受限。检查：

```bash
# 测试 Redis 连接
redis-cli -h localhost -p 6379 ping

# 查看 Redis 日志
sudo tail -f /var/log/redis/redis-server.log
```

### 数据库错误

```bash
# 重新初始化数据库
rm src/data/limiter.db
poetry run python -c "from stockaibe_be.core import Base, engine; Base.metadata.create_all(bind=engine)"
```

---

## 七、性能优化

### 1. Redis 优化

```conf
# 最大内存
maxmemory 2gb
maxmemory-policy allkeys-lru

# 网络优化
tcp-backlog 511
timeout 0
tcp-keepalive 300
```

### 2. 后端优化

- 增加 Gunicorn workers 数量（CPU核心数 * 2 + 1）
- 使用连接池
- 启用 HTTP/2

### 3. 前端优化

- 启用 Gzip 压缩
- 配置 CDN
- 使用浏览器缓存

---

## 八、备份与恢复

### 备份脚本

```bash
#!/bin/bash
BACKUP_DIR="/backup/limiter-admin"
DATE=$(date +%Y%m%d_%H%M%S)

# 备份 SQLite
cp /path/to/limiter.db "$BACKUP_DIR/limiter_$DATE.db"

# 备份 Redis
redis-cli --rdb "$BACKUP_DIR/redis_$DATE.rdb"

# 清理7天前的备份
find "$BACKUP_DIR" -name "*.db" -mtime +7 -delete
find "$BACKUP_DIR" -name "*.rdb" -mtime +7 -delete
```

### 恢复

```bash
# 恢复 SQLite
cp backup/limiter_20250115.db /path/to/limiter.db

# 恢复 Redis
redis-cli FLUSHALL
redis-cli --rdb backup/redis_20250115.rdb
```

---

## 九、监控告警

### Prometheus 集成

后端可以添加 Prometheus metrics endpoint：

```python
from prometheus_client import Counter, Histogram, generate_latest

request_counter = Counter('limiter_requests_total', 'Total requests', ['quota_id', 'status'])
latency_histogram = Histogram('limiter_latency_seconds', 'Request latency')

@app.get("/metrics")
def metrics():
    return Response(generate_latest(), media_type="text/plain")
```

### Grafana 仪表盘

导入预配置的 Grafana dashboard JSON 文件，监控：
- QPS
- 成功率/错误率
- 令牌余量
- 延迟分布

---

## 联系支持

如有问题，请查看：
- 项目文档：`stockaibe/jobs.md`
- API 文档：http://localhost:8000/docs
- 前端 README：`stockaibe/fe/README.md`
- 后端 README：`stockaibe/be/README.md`
