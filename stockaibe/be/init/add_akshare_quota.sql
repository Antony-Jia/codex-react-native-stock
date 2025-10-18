-- ============================================================
-- 添加 AkShare 每日数据采集配额
-- ============================================================
-- 说明：
-- AkShare 是免费的数据接口，但需要控制调用频率避免被限制
-- 配置：容量 100，每秒补充 0.5 个令牌（即每 2 秒 1 次调用）
-- ============================================================

INSERT INTO quota (id, name, capacity, refill_rate, enabled, created_at, updated_at)
VALUES (
    'akshare_daily',
    'AkShare每日数据',
    100.0,
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

-- 查询验证
SELECT 
    id,
    name,
    capacity,
    refill_rate,
    enabled,
    created_at,
    updated_at
FROM quota 
WHERE id = 'akshare_daily';
