# StockAI Backend 管理前端

React + Ant Design 构建的纯前端管理界面，用于对接 `stockaibe/be` 后端的 API 服务。页面结构遵循企业级后台的通用设计，便于未来扩展审批、监控、灰度发布等能力。

## 功能概览

- API 管理：支持接口检索、状态筛选、新增/编辑、批量导入占位等交互；
- 运行仪表盘：展示成功率、失败率和趋势图表；
- 系统设置：预留与统一认证、监控和通知的集成入口；
- 可插拔的状态管理：通过 `useApiRegistry` Hook 管理接口数据，后续可替换成真实 API 调用。

## 快速开始

```bash
cd stockaibe/fe
npm install
npm run dev
```

构建产物：

```bash
npm run build
```

本工程使用 Vite 作为构建工具，可通过 `.env` 系列文件注入后端地址、认证配置等环境变量。
