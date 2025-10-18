"""临时脚本：添加 akshare_daily 配额"""
import requests

# API 配置
API_BASE = "http://localhost:8000/api"

# 先登录获取 token（需要根据实际情况调整）
# 如果没有用户，需要先注册
def create_quota():
    """创建 akshare_daily 配额"""
    
    # 配额数据
    quota_data = {
        "id": "akshare_daily",
        "name": "AkShare每日数据",
        "capacity": 100.0,
        "refill_rate": 0.5,  # 每2秒1个令牌
        "enabled": True
    }
    
    print("正在创建配额...")
    print(f"配额数据: {quota_data}")
    
    # 注意：这个脚本需要认证，可能需要先登录
    # 这里提供两种方式：
    
    # 方式1: 直接通过数据库插入（推荐）
    print("\n请使用以下 SQL 语句在数据库中执行：")
    print("-" * 60)
    print("""
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
""")
    print("-" * 60)
    
    # 方式2: 通过 API（需要认证）
    print("\n或者在前端登录后，通过配额管理页面手动创建")
    print("配额ID: akshare_daily")
    print("配额名称: AkShare每日数据")
    print("容量: 100")
    print("补充速率: 0.5 (每2秒1个令牌)")
    print("启用: 是")

if __name__ == "__main__":
    create_quota()
