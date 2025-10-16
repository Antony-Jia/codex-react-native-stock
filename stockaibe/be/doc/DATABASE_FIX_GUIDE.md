# 数据库表结构修复指南

## 🔍 问题描述

在添加 `name` 字段后，`quotas` 表的结构出现问题：
- 数据库表的 `id` 列被错误地创建为自增整数列
- 但模型定义中 `id` 应该是字符串类型的主键
- 导致插入数据时出现 `null value in column "id"` 错误

## 🛠️ 解决方案

### 方法 1：使用 Python 脚本修复（推荐）

```bash
cd d:\Code\codex-react-native-stock\stockaibe\be
conda activate stockai
python fix_database.py
```

**脚本功能**：
1. ✅ 自动备份现有数据
2. ✅ 删除旧表和外键约束
3. ✅ 创建正确结构的新表
4. ✅ 恢复备份数据
5. ✅ 重建外键约束
6. ✅ 验证表结构

### 方法 2：手动执行 SQL

```bash
psql -U your_username -d your_database -f fix_quota_table.sql
```

## 📋 修复后的表结构

```sql
CREATE TABLE quotas (
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    id VARCHAR(100) PRIMARY KEY,        -- ⭐ 字符串主键，不是自增
    domain VARCHAR(100),
    name VARCHAR(100),                  -- ⭐ 新增字段
    endpoint VARCHAR(255),
    algo VARCHAR(50) NOT NULL DEFAULT 'token_bucket',
    capacity INTEGER NOT NULL DEFAULT 60,
    refill_rate DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    leak_rate DOUBLE PRECISION,
    burst INTEGER,
    enabled BOOLEAN NOT NULL DEFAULT true,
    notes TEXT
);
```

## 🔧 模型定义更新

所有整数类型的自增主键都已添加 `autoincrement=True`：

### User 模型
```python
id: Optional[int] = Field(
    default=None, 
    primary_key=True, 
    sa_column_kwargs={"autoincrement": True}
)
```

### Metric 模型
```python
id: Optional[int] = Field(
    default=None, 
    primary_key=True, 
    sa_column_kwargs={"autoincrement": True}
)
```

### TraceLog 模型
```python
id: Optional[int] = Field(
    default=None, 
    primary_key=True, 
    sa_column_kwargs={"autoincrement": True}
)
```

### SchedulerTask 模型
```python
id: Optional[int] = Field(
    default=None, 
    primary_key=True, 
    sa_column_kwargs={"autoincrement": True}
)
```

### Quota 模型（特殊）
```python
id: str = Field(primary_key=True, max_length=100)  # 字符串主键，不自增
```

## 🚀 执行步骤

1. **停止应用**（如果正在运行）
   ```bash
   # 按 Ctrl+C 停止 uvicorn
   ```

2. **执行修复脚本**
   ```bash
   python fix_database.py
   ```

3. **初始化配额数据**
   ```bash
   python init_quotas.py
   ```

4. **重启应用**
   ```bash
   uvicorn src.stockaibe_be.main:app --reload --host 0.0.0.0 --port 8000
   ```

## ✅ 验证

修复完成后，检查：

1. **表结构正确**
   ```sql
   \d quotas
   ```
   应该看到 `id` 列是 `character varying(100)`，不是 `integer`

2. **数据完整**
   ```sql
   SELECT id, name, capacity, refill_rate, enabled FROM quotas;
   ```

3. **应用正常启动**
   - 无错误日志
   - 任务系统正常初始化
   - 配额正确加载

## ⚠️ 注意事项

1. **数据备份**：脚本会自动备份，但建议手动备份重要数据
2. **停机时间**：修复过程需要几秒钟，期间应用不可用
3. **外键约束**：会自动处理 `metrics` 和 `traces` 表的外键
4. **幂等性**：脚本可以安全地重复执行

## 🔍 常见问题

### Q: 为什么 Quota 的 id 是字符串？
A: 因为配额 ID 需要有意义的名称（如 `external_api`），便于在代码中引用和管理。

### Q: 其他表的 id 为什么是自增整数？
A: 这些表的 ID 只是内部标识符，不需要在代码中直接引用，使用自增整数更高效。

### Q: 如果修复失败怎么办？
A: 
1. 检查数据库连接
2. 查看错误日志
3. 手动执行 SQL 脚本
4. 联系管理员

## 📚 相关文件

- `fix_database.py` - Python 修复脚本
- `fix_quota_table.sql` - SQL 修复脚本
- `init_quotas.py` - 配额初始化脚本
- `models/models.py` - 数据模型定义
