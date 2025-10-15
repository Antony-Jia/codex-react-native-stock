以下是一份完整的**《可视化限流与调度后台系统指导书》**，涵盖功能需求、系统架构、技术设计、模块划分、数据库与接口说明，适合作为你团队的**技术方案+开发蓝图**使用。

---

# 🧭 一、项目概述

## 1.1 项目名称

**“StockCrawler-Limiter Admin”** —— 股票爬虫限流与任务调度管理系统。

## 1.2 背景与目标

在项目初期，因未购买付费行情接口，需通过网页爬取来获取基础数据。
该系统旨在提供一个**“安全、稳定、可监控”**的抓取运行环境，实现：

* 爬虫请求频率与流量的**可控管理**；
* 任务调度与执行的**可视化监控**；
* 各站点/端点配额与状态的**统一配置与追踪**。

## 1.3 系统目标

* 支持**分域/分端点**的配额与令牌桶/漏桶限流；
* 支持**可视化的仪表盘与追踪界面**；
* 提供**APScheduler任务调度**能力；
* 实现抓取任务状态、错误率、429率等指标的**可观测性**；
* 兼容爬虫客户端（如 FastAPI、异步脚本）通过 REST API 进行动态限流控制。

---

# 🧩 二、功能需求说明

## 2.1 管理端功能

| 功能模块                 | 功能描述               | 关键点                           |
| -------------------- | ------------------ | ----------------------------- |
| 🧱 配额管理（Quota）       | 管理站点/端点配额策略        | 分域限流、端点粒度限流、令牌桶与漏桶算法配置        |
| ⚙️ 调度任务管理（Scheduler） | 任务的创建、修改、暂停、执行日志   | APScheduler 周期任务：快照、健康检测、窗口轮换 |
| 📈 监控与可视化（Dashboard） | 实时显示限流状态与任务指标      | 令牌余量、QPS、错误率、429率、平均延迟        |
| 🔍 请求追踪与统计（Trace）    | 展示请求历史、错误详情、爬虫执行耗时 | 请求成功/失败比、P95 延迟、异常报警          |
| 🔔 告警与熔断管理           | 站点异常自动降速/暂停        | 支持基于错误率/429率阈值触发自动降档          |
| 🧩 API 接口管理          | 对外提供 RESTful API   | 客户端爬虫通过 `acquire(qid)` 请求许可   |

---

# 🏗️ 三、系统架构设计

## 3.1 总体架构图

```
┌───────────────────────────────┐
│           前端控制台          │
│  React + AntD + ECharts      │
│  - 配额管理界面              │
│  - 调度任务监控              │
│  - 仪表盘可视化              │
│  - 请求追踪日志              │
└────────────┬──────────────────┘
             │ REST / WebSocket
┌────────────┴──────────────────┐
│           FastAPI 后端         │
│  ├── Quota API                │
│  ├── Metrics API              │
│  ├── Trace API                │
│  ├── APScheduler Job 管理     │
│  └── Redis Lua 限流脚本调用   │
└────────────┬──────────────────┘
             │
      ┌──────┴──────┐
      │              │
┌──────────┐   ┌────────────┐
│ Redis    │   │ SQLite/CK  │
│ 限流状态 │   │ 指标持久化 │
│ + Token  │   │ + 历史日志 │
└──────────┘   └────────────┘
             │
         ┌───┴────────────────┐
         │   爬虫客户端 (异步)│
         │ aiohttp + aiolimiter│
         │ 调用 /acquire(qid)  │
         └─────────────────────┘
```

---

# ⚙️ 四、技术设计

## 4.1 核心组件

| 组件    | 技术栈                          | 说明                      |
| ----- | ---------------------------- | ----------------------- |
| 后端框架  | FastAPI + Uvicorn            | 提供 REST + WebSocket API |
| 任务调度  | APScheduler                  | 周期任务、轮转、快照、熔断恢复         |
| 限流实现  | Redis + Lua 脚本               | 实时扣令牌、补充令牌、原子性保障        |
| 数据存储  | SQLite（轻量）或 ClickHouse       | 存储统计、日志、调度信息            |
| 缓存与状态 | Redis                        | token 桶状态、请求计数、临时统计     |
| 前端展示  | React + Ant Design + ECharts | 可视化仪表盘、管理页面             |

---

# 🧠 五、核心模块说明

## 5.1 限流管理模块（Limiter）

* 支持 **令牌桶 (Token Bucket)** 与 **漏桶 (Leaky Bucket)**；
* 实现 **分域/分端点** 配额；
* Redis 内通过 `EVALSHA` 调用 Lua 实现原子扣令牌；
* 提供 `/acquire(qid)` API 接口：

  ```http
  POST /api/limiter/acquire
  Body: { "qid": "sina_quote", "cost": 1 }
  Response: { "allow": true, "remain": 7 }
  ```

## 5.2 任务调度模块（Scheduler）

* 使用 APScheduler 管理周期性任务：

  * `snapshot_job()`：聚合 Redis 统计 → 落库；
  * `health_job()`：分析错误率/429率 → 动态调速；
  * `window_reset()`：清理过期 key；
* 支持前端添加/暂停任务；
* 所有任务在前端“任务看板”实时展示。

## 5.3 数据监控模块（Metrics）

* 从 Redis + SQLite 聚合指标：

  * 成功率、429率、平均延迟；
  * 当前令牌余量；
  * 每端点实时QPS；
* 前端仪表盘通过 `/api/metrics/current` 与 `/api/metrics/series` 获取数据；
* 提供告警策略（如连续3分钟429率>30%触发熔断）。

## 5.4 可视化界面模块（Frontend）

主要页面：

1. **Dashboard 仪表盘**

   * 实时令牌余量（环形图）
   * QPS/429/错误率曲线（ECharts 折线图）
   * 热力图（端点 × 时间）
2. **Quota 配额管理页**

   * 表格展示每个域/端点的限流参数
   * 支持开关启停、实时编辑、保存到后端
3. **Trace 请求追踪页**

   * 表格展示最近请求：状态码、延迟、URL
   * 支持过滤、导出、重放
4. **Task 调度任务页**

   * 展示 APScheduler 任务列表与执行历史
   * 支持手动触发、暂停、编辑周期

---

# 💾 六、数据设计

## 6.1 Redis Key 结构

```
quota:{id}:tokens       当前令牌数
quota:{id}:last_refill  最近补充时间戳
stats:{id}:{minute}     每分钟统计（ok, err, 429, latency_sum）
```

## 6.2 SQLite 表设计

```sql
CREATE TABLE quotas (
    id TEXT PRIMARY KEY,
    domain TEXT,
    endpoint TEXT,
    algo TEXT,
    capacity INTEGER,
    refill_rate REAL,
    leak_rate REAL,
    burst INTEGER,
    enabled BOOLEAN,
    notes TEXT
);

CREATE TABLE metrics (
    ts DATETIME,
    quota_id TEXT,
    ok INTEGER,
    err INTEGER,
    r429 INTEGER,
    latency_p95 REAL,
    tokens_remain REAL
);
```

---

# 🔌 七、API 接口设计

| 接口                        | 方法               | 描述                 |
| ------------------------- | ---------------- | ------------------ |
| `/api/quotas`             | GET / POST / PUT | 查询、创建、更新配额         |
| `/api/quotas/{id}/toggle` | POST             | 启停某配额              |
| `/api/limiter/acquire`    | POST             | 扣令牌，返回许可与剩余        |
| `/api/metrics/current`    | GET              | 当前状态统计             |
| `/api/metrics/series`     | GET              | 时间序列数据             |
| `/api/traces`             | GET              | 请求追踪列表             |
| `/api/tasks`              | GET / POST       | APScheduler任务列表与控制 |
| `/api/events/stream`      | GET (SSE)        | 实时请求与告警推送          |

---

# 🧩 八、部署建议

| 环境    | 推荐方案                                    |
| ----- | --------------------------------------- |
| Redis | 本地开发用 docker: `redis:7.2`               |
| 后端    | FastAPI + Uvicorn (Gunicorn多worker生产模式) |
| 前端    | Vite + React + Ant Design + ECharts     |
| 定时任务  | APScheduler 集成 FastAPI 事件循环             |
| 数据存储  | 开发阶段 SQLite；生产 ClickHouse 或 Postgres    |
| 监控扩展  | Prometheus + Grafana 可后期扩展              |

---

# 🚦 九、开发阶段建议（MVP → V1）

| 阶段        | 功能                                    | 目标              |
| --------- | ------------------------------------- | --------------- |
| **MVP阶段** | Token Bucket + Redis + APScheduler 快照 | 单机限流监控可跑        |
| **V1.0**  | 前端可视化仪表盘 + 任务管理                       | 管理员可动态调整配额      |

---

# 🧱 十、可扩展方向

* **多实例协同限流**（Redis 全局共享桶）；
* **爬虫健康度评估模型**（智能调速）；
* **动态交易日历驱动策略**；
* **数据导出/回放机制**；
* **AI 自动调参模块**（根据历史负载自动计算 refill_rate）。

---

是否希望我帮你将这份指导书生成：
1️⃣ 一份可打印的 **PDF 技术文档**
2️⃣ 或者一份 **项目README.md模板**（可直接初始化Git仓库）？

我可以直接输出对应版本。
