# 时区显示修复说明

## 问题描述

数据库中存储的时间是 UTC 时间，但前端直接显示导致时间比实际时间慢 8 小时（北京时间为 UTC+8）。

## 解决方案

### 1. 创建统一的时区处理工具

**文件**: `src/utils/dayjs.ts`

- 配置 dayjs 的 UTC 和时区插件
- 设置默认时区为 `Asia/Shanghai` (UTC+8)
- 提供两个工具函数：
  - `formatLocalTime(time, format)`: 将 UTC 时间格式化为本地时间字符串
  - `toLocalTime(time)`: 将 UTC 时间转换为本地时区的 dayjs 对象

### 2. 修改所有页面的时间显示

已修改以下文件，将 `dayjs(time).format()` 替换为 `formatLocalTime(time)`:

- ✅ `src/pages/Traces.tsx` - 请求追踪页面
  - traces 表格的 `created_at` 列
  - funcStats 表格的 `last_call_at` 列

- ✅ `src/pages/Tasks.tsx` - 定时任务页面
  - tasks 表格的 `next_run` 列

- ✅ `src/pages/Quotas.tsx` - 配额管理页面
  - quotas 表格的 `updated_at` 列

- ✅ `src/pages/Dashboard.tsx` - 监控仪表盘
  - 时间序列图表的时间轴显示

## 使用方法

### 在新页面中使用

```typescript
import { formatLocalTime } from '../utils/dayjs';

// 默认格式 'YYYY-MM-DD HH:mm:ss'
const timeStr = formatLocalTime(utcTimeString);

// 自定义格式
const shortTime = formatLocalTime(utcTimeString, 'HH:mm:ss');
const dateOnly = formatLocalTime(utcTimeString, 'YYYY-MM-DD');
```

### 在表格列中使用

```typescript
{
  title: '时间',
  dataIndex: 'created_at',
  key: 'created_at',
  render: (time: string) => formatLocalTime(time),
}
```

## 技术细节

### 后端存储
- 数据库使用 UTC 时间存储（`dt.datetime.now(dt.timezone.utc)`）
- 符合国际化标准，便于跨时区使用

### 前端显示
- 使用 dayjs 的 `utc` 和 `timezone` 插件
- 自动将 UTC 时间转换为用户本地时区（当前设置为 Asia/Shanghai）
- 所有时间显示统一使用 `formatLocalTime` 函数

### 时区转换逻辑

```typescript
// UTC 时间: 2024-01-15T10:30:00Z
// 转换为北京时间: 2024-01-15 18:30:00 (UTC+8)

dayjs.utc(time).tz('Asia/Shanghai').format('YYYY-MM-DD HH:mm:ss')
```

## 测试

运行测试脚本验证时区转换：

```bash
# 在浏览器控制台中导入并运行
import './utils/test-timezone';
```

或者直接在页面中查看时间显示是否正确（应该显示北京时间）。

## 注意事项

1. **不要修改后端时间存储**：保持使用 UTC 时间存储是最佳实践
2. **统一使用工具函数**：所有新增的时间显示都应使用 `formatLocalTime`
3. **时区配置**：如需支持其他时区，修改 `src/utils/dayjs.ts` 中的时区设置

## 相关文件

- `src/utils/dayjs.ts` - 时区处理工具
- `src/utils/test-timezone.ts` - 时区转换测试
- `src/pages/Traces.tsx` - 请求追踪页面
- `src/pages/Tasks.tsx` - 定时任务页面
- `src/pages/Quotas.tsx` - 配额管理页面
- `src/pages/Dashboard.tsx` - 监控仪表盘
