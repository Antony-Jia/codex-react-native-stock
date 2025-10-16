-- 数据库迁移脚本：为 scheduler_tasks 表添加 task_type 列
-- 使用方法：
--   psql -U stockai -d stockai_limiter -f add_task_type_column.sql
-- 或在 pgAdmin 中执行

-- 检查列是否已存在
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name='scheduler_tasks' 
        AND column_name='task_type'
    ) THEN
        -- 添加 task_type 列
        ALTER TABLE scheduler_tasks 
        ADD COLUMN task_type VARCHAR(20) DEFAULT 'scheduler' NOT NULL;
        
        RAISE NOTICE '✅ 成功添加 task_type 列';
    ELSE
        RAISE NOTICE '✅ task_type 列已存在，无需迁移';
    END IF;
END $$;

-- 验证列已添加
SELECT column_name, data_type, column_default, is_nullable
FROM information_schema.columns 
WHERE table_name='scheduler_tasks' 
AND column_name='task_type';
