下面是一份可落地的《Plan-and-Execute 多代理编排框架（基于 LangChain / LangGraph）开发文档》。先给出综述，再分章节展开，包含接口约定、关键数据结构、执行流程、记忆系统(计划/VFS)、再规划策略、HITL、人机协同、可观测性、测试与部署要点、前端 SVG 绘图规范等。内容力求“开箱即用+可扩展”。

---

# 0. 综述（Overall Summary）

本框架旨在解决“复杂任务需要多个子 Agent 协作”的工程落地问题。核心理念：

* **规划→编译→执行（Plan → Compile → Execute）**：先由 Planner 生成结构化计划（含步骤依赖与参数占位），再将计划**动态编译**为 LangGraph `StateGraph`（支持并行/条件边/循环），最后执行并在必要时**再规划**。
* **强 I/O 契约**：所有子 Agent 以 **Pydantic/TypedDict** 明确输入/输出；DAG 边以**字段映射**为基本单位，编译期校验类型与连通性。
* **可嵌套编排**：任意子图可封装为 CompositeAgent，对外暴露新的 I/O；上层 DAG 仅视其为“一个节点”，从而实现任意层级组合。
* **Redis 记忆系统（KV）**：提供两个命名空间：

  * `plan:*` —— 计划的增删查（版本化/审计）
  * `vfs:*` —— 虚拟文件系统的增删查，针对redis的string封装读取、写入、查询、删除操作即可。
    同时用 **Checkpointer** 做执行态快照（断点续跑/HITL 暂停/回滚）。
* **可视化输出**：统一导出 Graph JSON，前端用 **HTML 内嵌 SVG** 渲染横向分层编排图（图例、层级配色、阴影、箭头、端口映射注释）。

---

# 1. 系统架构（Architecture）

## 1.1 分层视图

* **接口层（API）**：任务提交、计划 CRUD、VFS CRUD、运行监控、HITL 交互。
* **编排层（Orchestration）**：

  * 外层 Planner Graph：`create_plan → execute_subgraph → finalize`，可条件回流到 `create_plan` 实现**再规划**。
  * 内层 Plan Graph：将 Planner 产出的 Plan 动态编译为 `StateGraph`，每个 step 为节点，依赖为边。
* **Agent 层**：子 Agent 注册表、CompositeAgent（嵌套子图）、适配器节点（字段转换/数据清洗）。
* **记忆与持久化层**：

  * **Checkpointer**：执行态快照（Redis/SQLite/Postgres）。
  * **Redis KV（长期业务记忆）**：`plan:*`、`vfs:*` 两大命名空间；。
  * **缓存**：输入哈希 → 输出缓存（可放 Redis）。
* **前端展示层**：编排图 SVG 渲染、运行态高亮、HITL 面板、日志与产物浏览。

## 1.2 目录结构（建议）

```
/orchestrator
  /api             # FastAPI/Routers
  /agents          # 子Agent/CompositeAgent与注册
  /graph           # Plan->Graph 编译、条件边、回路控制
  /contracts       # Pydantic I/O 模型、Plan schema、字段映射
  /memory          # Redis KV(Store)/Checkpointer 封装、缓存
  /runtime         # 执行器、重试/预算/熔断、评估器、HITL
  /observability   # OTel、事件流、结构化日志
  /frontend        # Graph JSON 导出与 SVG 模板
  /tests           # 单测、集成测试、回放（金测试）
```

---

# 2. 核心数据与契约（Data & Contracts）

## 2.1 子 Agent 契约

```python
# contracts/agent.py
from typing import Any, Dict, Type, Callable
from pydantic import BaseModel

class AgentInput(BaseModel): ...
class AgentOutput(BaseModel): ...

class AgentSpec(BaseModel):
    name: str
    input_model: Type[AgentInput]
    output_model: Type[AgentOutput]
    run: Callable[[AgentInput, "ExecutionCtx"], AgentOutput]
    tags: Dict[str, Any] = {}
```

> 规则：**纯函数化**（相同输入→相同输出）、**幂等**、**无副作用**（副作用交给 VFS/Store 层）。

## 2.2 计划（Plan）与步骤（Step）

```python
# contracts/plan.py
from pydantic import BaseModel
from typing import List, Dict, Any, Optional

class Step(BaseModel):
    id: str                   # "1","2",...
    action: str               # 子Agent名或预定义动作名
    depends_on: List[str] = []
    args: Dict[str, Any] = {} # 可含 "$1" 占位符（取依赖结果）

class Plan(BaseModel):
    steps: List[Step]
    description: Optional[str] = None
    version: Optional[str] = None
    meta: Dict[str, Any] = {}
```

## 2.3 图（GraphSpec）与字段映射（如需静态 DAG）

```python
# contracts/graph.py
from pydantic import BaseModel
from typing import Dict, List, Any

class EdgeMap(BaseModel):
    src_node: str
    dst_node: str
    field_map: Dict[str, str]  # src_field -> dst_field

class NodeSpec(BaseModel):
    node_id: str
    agent_name: str
    static_inputs: Dict[str, Any] = {}
```

---

# 3. 执行流程（Execution Flow）

## 3.1 外层 Planner Graph（再规划闭环）

1. `create_plan`：根据用户输入/上下文生成结构化 Plan（使用 LLM 结构化输出，携带 agent catalog 与环境约束）。
2. `execute_subgraph`：将 Plan **动态编译**为 LangGraph 的 `StateGraph`，按依赖并行执行，变量占位 `$id` 在运行时替换为依赖步骤输出（可指定字段路径，如 `$1.result.abstract`）。
3. `finalize`：对结果进行**自动评估**（结构化 rubric），必要时标记 `need_replan=True` 并回到 `create_plan`；限制最大循环次数与预算（避免无限回路）。

## 3.2 内层 Plan Graph（动态编译）

* 为每个 `Step` 生成节点：`node(step_i)`；
* 依赖为空的步骤从 `START` 发出，有依赖的从各 `dep` 节点连边；
* 末层步骤连 `END`；
* 节点函数做三件事：

  1. 变量替换（把 `$dep_id` 替换为 `agent_results[dep_id]`），
  2. 调用 `RUN_ACTION(step.action, args)` 执行子 Agent，
  3. 将 `{input, result}` 写入 `agent_results[step.id]`。

---

# 4. 记忆系统（Memory System）

## 4.1 执行态快照（Checkpointer）

* **作用**：每个“超步”自动存储图状态，支持**断点续跑**、**人机协同暂停/继续**、**回滚/时间旅行**。
* **介质**：Redis 。
* **粒度**：外层 Graph 与子计划 Graph 共享同一 Checkpointer，天然支持嵌套。

## 4.2 业务长期记忆（Redis KV Store）

* **命名空间**：

  * `plan:{tenant}:{plan_id}` → `{ver, steps[], meta, author, tags, created_at, ...}`
  * `vfs:{tenant}:{path}` → `{uri, mime, size, ver, tags, created_at, sha256, ...}`

## 4.3 输入可寻址缓存（Hash Cache）

* `cache:{agent_name}:{sha16(inputs)}` → `output JSON`，TTL 可配置；
* 适用于**幂等子 Agent**（检索/解析/结构化等），显著降本增效。

---

# 5. 再规划（Re-Planning）策略

* **触发条件**：质量评估不达标、关键依赖失败/缺失、外部环境变化、预算/时长超限。
* **策略**：

  * **最小扰动修补**（prefer partial replan）：Planner 接收当前 `agent_results` 摘要与“缺口描述”，仅调整需要的步骤/依赖。
  * **限次+限额**：最大循环次数、token/time/cost 上限，超限给出可操作的失败原因与“下一步建议”。
  * **可解释性**：保留 replan 决策日志，便于复盘与审计。

---

# 6. 可观测性（Observability）

* **Tracing**：注意日志与事件。
* **事件流**：`runs:{run_id}:events`（Redis Streams）推送节点开始/结束、输入摘要、输出摘要、异常、HITL 等。
* **产物管理**：每步产物（artifact）写入 VFS 路径：`vfs:/runs/{run_id}/{node_id}/artifact.json`。


---

# 10. 前端绘图规范（HTML 内嵌 SVG）

## 10.1 Graph JSON（后端导出统一格式）

```json
{
  "graph_id": "g-001",
  "nodes": [
    {"id":"n1","label":"researcher","layer":0,"io":{"in":[],"out":["draft_points"]}},
    {"id":"n2","label":"writer","layer":1,"io":{"in":["bullets"],"out":["article"]}},
    {"id":"n3","label":"reviewer","layer":2,"io":{"in":["doc"],"out":["review_summary"]}}
  ],
  "edges": [
    {"from":"n1","to":"n2","map":{"draft_points":"bullets"}},
    {"from":"n2","to":"n3","map":{"article":"doc"}}
  ],
  "runtime": {
    "active_node_ids": ["n2"],
    "completed_node_ids": ["n1"],
    "critical_path": ["n1","n2","n3"]
  }
}
```

## 10.2 视觉规范要点

* 横向分层布局（layer=0..N），同层纵向均分；
* 节点：圆角矩形、阴影、标题（Agent 名）+ I/O 端口图标（小圆点或文本）；
* 边：直线/正交折线 + 箭头；中点标注字段映射 `src→dst`；
* 主题配色：

  * 规划类（灰）、内容生成（淡蓝）、检索（绿）、评估（紫）、HITL（橙）；
* 运行态：

  * `active` 高亮呼吸动画，`completed` 低饱和，`failed` 红色边框。

---

# 11. API 设计（示例）

```python
# /api/routes.py (FastAPI)
from fastapi import APIRouter
router = APIRouter()

@router.post("/runs")
def create_run(payload: dict) -> dict:
    """
    payload: { "user_input": "...", "tenant": "acme", "options": {...} }
    return: { "run_id": "...", "status": "running" }
    """

@router.get("/runs/{run_id}")
def get_run(run_id: str) -> dict:
    """
    return: { "status": "...", "graph_json": {...}, "metrics": {...} }
    """

@router.post("/plans")
def upsert_plan(body: dict) -> dict:
    """写入 Redis KV: plan:{tenant}:{plan_id}"""

@router.get("/plans/{plan_id}")
def read_plan(plan_id: str, tenant: str) -> dict: ...

@router.put("/vfs")
def put_vfs(obj: dict) -> dict:
    """写入 vfs:{tenant}:{path}"""

@router.get("/vfs")
def get_vfs(path: str, tenant: str) -> dict: ...

@router.post("/hitl/{run_id}/reply")
def hitl_reply(run_id: str, node_id: str, content: dict) -> dict: ...
```

---

# 12. 关键实现片段（精简骨架）

## 12.1 子 Agent 注册与调用

```python
# agents/registry.py
AGENTS = {}

def register_agent(spec: AgentSpec):
    if spec.name in AGENTS:
        raise ValueError("dup agent")
    AGENTS[spec.name] = spec
    return spec

def RUN_ACTION(action: str, args: dict, ctx) -> dict:
    spec = AGENTS[action]
    inp = spec.input_model(**args)
    out = spec.run(inp, ctx)
    return out.dict()
```

## 12.2 动态编译 Plan 为 LangGraph

```python
# graph/plan_compile.py
from langgraph.graph import StateGraph, START, END
from typing import TypedDict, Dict, Any

class SubState(TypedDict):
    agent_results: Dict[str, Dict[str, Any]]

def substitute(args: dict, results: Dict[str, Any]) -> dict:
    # 递归替换 "$<id>[.field...]"
    ...

def compile_plan(plan) -> Any:
    sg = StateGraph(SubState)

    def make_node(step):
        def node_fn(state: SubState):
            in_args = substitute(step.args, state["agent_results"])
            result  = RUN_ACTION(step.action, in_args, ctx=None)
            state["agent_results"][step.id] = {"input": in_args, "result": result}
            return state
        return node_fn

    # 节点
    for s in plan.steps:
        sg.add_node(s.id, make_node(s))

    # 边
    ids = {s.id for s in plan.steps}
    for s in plan.steps:
        if not s.depends_on:
            sg.add_edge(START, s.id)
        else:
            for d in s.depends_on:
                assert d in ids
                sg.add_edge(d, s.id)
    # 简单做法：所有无出边的指向 END（略）
    return sg.compile()
```

## 12.3 Redis KV（计划/VFS/缓存）

```python
# memory/redis_store.py
class KV:
    def __init__(self, r, prefix="app"):
        self.r=r; self.p=prefix
    def k(self, ns, key): return f"{self.p}:{ns}:{key}"

    # plan
    def plan_set(self, tenant, pid, val): self.r.set(self.k("plan", f"{tenant}:{pid}"), json.dumps(val))
    def plan_get(self, tenant, pid): ...
    # vfs
    def vfs_put(self, tenant, path, meta): ...
    def vfs_get(self, tenant, path): ...
    # cache
    def cache_get(self, agent, h): ...
    def cache_set(self, agent, h, val, ttl=3600): ...
```

---


