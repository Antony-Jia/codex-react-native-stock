# 数据库迁移说明

## 问题

数据库表 `scheduler_tasks` 缺少 `task_type` 列，导致应用启动失败。

错误信息：
```
psycopg2.errors.UndefinedColumn: column scheduler_tasks.task_type does not exist
```

## 解决方案

有三种方式执行迁移：

### 方式 1: 使用 Python 脚本（推荐）

```bash
# 1. 激活 conda 环境
conda activate stockai

# 2. 进入项目目录
cd d:\Code\codex-react-native-stock\stockaibe\be

# 3. 运行迁移脚本
python add_task_type_column.py
```

### 方式 2: 使用 psql 命令行

```bash
# 直接执行 SQL 文件
psql -U stockai -d stockai_limiter -f migrations/add_task_type_column.sql
```

### 方式 3: 使用 pgAdmin 或其他数据库工具

在数据库工具中执行以下 SQL：

```sql
-- 检查并添加 task_type 列
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name='scheduler_tasks' 
        AND column_name='task_type'
    ) THEN
        ALTER TABLE scheduler_tasks 
        ADD COLUMN task_type VARCHAR(20) DEFAULT 'scheduler' NOT NULL;
        
        RAISE NOTICE '成功添加 task_type 列';
    ELSE
        RAISE NOTICE 'task_type 列已存在，无需迁移';
    END IF;
END $$;
```

## 迁移后验证

执行以下 SQL 验证列已添加：

```sql
SELECT column_name, data_type, column_default, is_nullable
FROM information_schema.columns 
WHERE table_name='scheduler_tasks' 
AND column_name='task_type';
```

预期结果：
- column_name: task_type
- data_type: character varying
- column_default: 'scheduler'::character varying
- is_nullable: NO

## 重启应用

迁移完成后，重新启动应用：

```bash
conda activate stockai
cd d:\Code\codex-react-native-stock\stockaibe\be
python -m stockaibe_be.main
```

或使用 uvicorn：

```bash
uvicorn stockaibe_be.main:app --reload
```

## 为什么会出现这个问题？

SQLModel 的 `create_all()` 方法只会创建**不存在的表**，不会修改**已存在的表**。

当模型添加新字段时，已存在的数据库表不会自动更新，需要手动执行迁移。

## 未来建议

考虑使用 Alembic 进行数据库版本管理，自动生成和执行迁移脚本。
