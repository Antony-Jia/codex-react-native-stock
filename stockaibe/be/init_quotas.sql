-- ============================================================
-- 初始化任务系统所需的配额
-- ============================================================
-- 说明：
-- 1. capacity: 令牌桶容量（最大令牌数）
-- 2. refill_rate: 令牌补充速率（每秒补充的令牌数）
-- 3. enabled: 是否启用配额限流
-- 
-- 使用 ON CONFLICT 确保脚本可以重复执行
-- ============================================================

-- 1. 外部 API 调用配额
-- 用途：限制外部 API 调用频率
-- 配置：容量 10，每秒补充 1 个令牌（即每秒最多 1 次调用）
INSERT INTO quota (id, name, capacity, refill_rate, enabled, created_at, updated_at)
VALUES (
    'external_api',
    '外部API调用',
    10.0,
    1.0,
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    capacity = EXCLUDED.capacity,
    refill_rate = EXCLUDED.refill_rate,
    updated_at = CURRENT_TIMESTAMP;

-- 2. 数据同步配额
-- 用途：限制数据同步任务的执行频率
-- 配置：容量 50，每 2 秒补充 1 个令牌（refill_rate=0.5）
INSERT INTO quota (id, name, capacity, refill_rate, enabled, created_at, updated_at)
VALUES (
    'data_sync',
    '数据同步',
    50.0,
    0.5,
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    capacity = EXCLUDED.capacity,
    refill_rate = EXCLUDED.refill_rate,
    updated_at = CURRENT_TIMESTAMP;

-- 3. 邮件服务配额
-- 用途：防止邮件服务过载
-- 配置：容量 20，每 10 秒补充 1 个令牌（refill_rate=0.1）
INSERT INTO quota (id, name, capacity, refill_rate, enabled, created_at, updated_at)
VALUES (
    'email_service',
    '邮件服务',
    20.0,
    0.1,
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    capacity = EXCLUDED.capacity,
    refill_rate = EXCLUDED.refill_rate,
    updated_at = CURRENT_TIMESTAMP;

-- 4. 数据库写入配额
-- 用途：防止数据库写入过载
-- 配置：容量 50，每秒补充 5 个令牌（即每秒最多 5 次批量写入）
INSERT INTO quota (id, name, capacity, refill_rate, enabled, created_at, updated_at)
VALUES (
    'db_write',
    '数据库写入',
    50.0,
    5.0,
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    capacity = EXCLUDED.capacity,
    refill_rate = EXCLUDED.refill_rate,
    updated_at = CURRENT_TIMESTAMP;

-- 5. 动态 API 调用配额
-- 用途：支持动态调整的 API 调用限流
-- 配置：容量 30，每秒补充 2 个令牌（即每秒最多 2 次调用）
INSERT INTO quota (id, name, capacity, refill_rate, enabled, created_at, updated_at)
VALUES (
    'dynamic_api',
    '动态API调用',
    30.0,
    2.0,
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    capacity = EXCLUDED.capacity,
    refill_rate = EXCLUDED.refill_rate,
    updated_at = CURRENT_TIMESTAMP;

-- ============================================================
-- 查询所有配额，验证创建结果
-- ============================================================
SELECT 
    id,
    name,
    capacity,
    refill_rate,
    enabled,
    created_at,
    updated_at
FROM quota 
ORDER BY id;
