# StockCrawler Limiter Admin - 前端

基于 React + Ant Design + TypeScript 构建的限流与调度管理系统前端，对接 `stockaibe/be` 后端 API 服务。

## 功能特性

- **用户认证**：JWT 登录/注册，首个用户自动成为超级管理员
- **监控仪表盘**：实时显示限流指标、成功率、错误率、429率
- **配额管理**：创建、编辑、启用/禁用限流配额
- **请求追踪**：查看详细的请求日志和状态
- **任务调度**：管理 APScheduler 定时任务
- **实时更新**：自动刷新数据，保持最新状态

## 技术栈

- **React 18** - UI 框架
- **TypeScript** - 类型安全
- **Ant Design 5** - UI 组件库
- **Ant Design Charts** - 数据可视化
- **Axios** - HTTP 客户端
- **React Router 6** - 路由管理
- **Vite** - 构建工具

## 快速开始

### 1. 安装依赖

```bash
cd stockaibe/fe
npm install
```

### 2. 配置环境变量

复制 `env-example.txt` 为 `.env`：

```bash
cp env-example.txt .env
```

编辑 `.env` 文件，配置后端 API 地址：

```env
VITE_API_BASE_URL=http://localhost:8000/api
```

### 3. 启动开发服务器

```bash
npm run dev
```

访问 http://localhost:5173

### 4. 构建生产版本

```bash
npm run build
```

构建产物在 `dist/` 目录。

## 页面结构

```
/login              - 登录/注册页面
/                   - 监控仪表盘
/quotas             - 配额管理
/traces             - 请求追踪
/tasks              - 任务调度
/settings           - 系统设置
```

## 开发说明

### 目录结构

```
src/
├── api/              # API 客户端
│   └── client.ts     # Axios 封装
├── contexts/         # React Context
│   └── AuthContext.tsx
├── layouts/          # 布局组件
│   └── MainLayout.tsx
├── pages/            # 页面组件
│   ├── Login.tsx
│   ├── Dashboard.tsx
│   ├── Quotas.tsx
│   ├── Traces.tsx
│   ├── Tasks.tsx
│   └── Settings.tsx
├── types/            # TypeScript 类型定义
│   └── api.ts
├── App.tsx           # 应用入口
└── main.tsx          # 渲染入口
```

### API 客户端使用

```typescript
import apiClient from '@/api/client';

// 获取配额列表
const quotas = await apiClient.getQuotas();

// 创建配额
await apiClient.createQuota({
  id: 'sina_quote',
  capacity: 60,
  refill_rate: 1.0,
});
```

### 认证流程

1. 用户在 `/login` 页面登录
2. 登录成功后，token 存储在 localStorage
3. 所有 API 请求自动携带 Authorization header
4. Token 过期时自动跳转到登录页

## 注意事项

- 首次使用需要先注册用户，第一个注册的用户自动成为超级管理员
- 确保后端服务已启动并可访问
- 开发环境默认使用 http://localhost:8000/api
- 生产环境需要配置正确的 API 地址
