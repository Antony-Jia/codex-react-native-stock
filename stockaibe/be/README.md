# StockCrawler Limiter Admin Backend

基于 FastAPI + APScheduler 的限流与调度管理后台，遵循 `stockaibe/readme.md` 的蓝图设计，提供：

- JWT 登录/注册与人员管理；
- 配额（Quota）管理 CRUD；
- 令牌桶限流 `/api/limiter/acquire` 接口；
- 指标查询、请求追踪；
- APScheduler 定时任务管理接口。

## 快速开始

```bash
cd stockaibe/be
poetry install
poetry run uvicorn stockaibe_be.main:app --reload
```

默认会在 `../data/limiter.db` 创建 SQLite 数据库。首次注册的用户会自动成为超级管理员。

## 主要接口

- `POST /api/auth/register`、`POST /api/auth/login`
- `GET/POST/PUT /api/quotas`
- `POST /api/limiter/acquire`
- `GET /api/metrics/current`、`GET /api/metrics/series`
- `GET /api/traces`
- `GET/POST/DELETE /api/tasks`

更多细节请参阅源代码中的注释。
