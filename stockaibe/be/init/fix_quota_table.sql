-- ============================================================
-- 修复 Quota 表结构
-- ============================================================
-- 问题：quotas 表的 id 列被错误地创建为自增列
-- 解决：删除并重建表，使用字符串类型的 id 作为主键
-- ============================================================

-- 1. 备份现有数据（如果有）
CREATE TABLE IF NOT EXISTS quotas_backup AS 
SELECT * FROM quotas;

-- 2. 删除依赖表的外键约束
ALTER TABLE IF EXISTS metrics DROP CONSTRAINT IF EXISTS metrics_quota_id_fkey;
ALTER TABLE IF EXISTS traces DROP CONSTRAINT IF EXISTS traces_quota_id_fkey;

-- 3. 删除旧表
DROP TABLE IF EXISTS quotas CASCADE;

-- 4. 重新创建 quotas 表（正确的结构）
CREATE TABLE quotas (
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    id VARCHAR(100) PRIMARY KEY,  -- 字符串类型的主键，不是自增
    domain VARCHAR(100),
    name VARCHAR(100),
    endpoint VARCHAR(255),
    algo VARCHAR(50) NOT NULL DEFAULT 'token_bucket',
    capacity INTEGER NOT NULL DEFAULT 60,
    refill_rate DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    leak_rate DOUBLE PRECISION,
    burst INTEGER,
    enabled BOOLEAN NOT NULL DEFAULT true,
    notes TEXT
);

-- 5. 创建索引
CREATE INDEX IF NOT EXISTS ix_quotas_id ON quotas(id);

-- 6. 恢复数据（如果备份表存在且有数据）
INSERT INTO quotas (created_at, updated_at, id, domain, name, endpoint, algo, capacity, refill_rate, leak_rate, burst, enabled, notes)
SELECT created_at, updated_at, id, domain, name, endpoint, algo, capacity, refill_rate, leak_rate, burst, enabled, notes
FROM quotas_backup
WHERE EXISTS (SELECT 1 FROM quotas_backup)
ON CONFLICT (id) DO NOTHING;

-- 7. 重新创建外键约束
ALTER TABLE metrics 
ADD CONSTRAINT metrics_quota_id_fkey 
FOREIGN KEY (quota_id) REFERENCES quotas(id);

ALTER TABLE traces 
ADD CONSTRAINT traces_quota_id_fkey 
FOREIGN KEY (quota_id) REFERENCES quotas(id);

-- 8. 清理备份表
DROP TABLE IF EXISTS quotas_backup;

-- ============================================================
-- 验证表结构
-- ============================================================
SELECT 
    column_name, 
    data_type, 
    character_maximum_length,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'quotas'
ORDER BY ordinal_position;
