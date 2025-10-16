"""初始化配额数据到数据库"""

import sys
from pathlib import Path

# 添加 src 目录到 Python 路径
project_root = Path(__file__).parent
src_path = project_root / "src"
if str(src_path) not in sys.path:
    sys.path.insert(0, str(src_path))

from sqlmodel import Session, select
from stockaibe_be.core.database import engine
from stockaibe_be.models import Quota
from stockaibe_be.core.logging_config import setup_logging, get_logger

# 初始化日志
setup_logging()
logger = get_logger(__name__)

# 定义配额数据
# 注意：id 是主键（必填），name 用于任务装饰器匹配
QUOTAS = [
    {
        "id": "external_api",
        "name": "external_api",
        "capacity": 10.0,
        "refill_rate": 1.0,
        "enabled": True,
        "notes": "限制外部 API 调用频率，每秒最多 1 次调用"
    },
    {
        "id": "data_sync",
        "name": "data_sync",
        "capacity": 50.0,
        "refill_rate": 0.5,
        "enabled": True,
        "notes": "限制数据同步任务的执行频率，每 2 秒补充 1 个令牌"
    },
    {
        "id": "email_service",
        "name": "email_service",
        "capacity": 20.0,
        "refill_rate": 0.1,
        "enabled": True,
        "notes": "防止邮件服务过载，每 10 秒补充 1 个令牌"
    },
    {
        "id": "db_write",
        "name": "db_write",
        "capacity": 50.0,
        "refill_rate": 5.0,
        "enabled": True,
        "notes": "防止数据库写入过载，每秒最多 5 次批量写入"
    },
    {
        "id": "dynamic_api",
        "name": "dynamic_api",
        "capacity": 30.0,
        "refill_rate": 2.0,
        "enabled": True,
        "notes": "支持动态调整的 API 调用限流，每秒最多 2 次调用"
    }
]


def init_quotas():
    """初始化配额到数据库"""
    logger.info("=" * 60)
    logger.info("开始初始化配额...")
    logger.info("=" * 60)
    
    created_count = 0
    updated_count = 0
    
    with Session(engine) as session:
        for quota_data in QUOTAS:
            quota_id = quota_data["id"]
            
            # 检查配额是否已存在（通过 id 查询，因为 id 是主键）
            statement = select(Quota).where(Quota.id == quota_id)
            existing_quota = session.exec(statement).first()
            
            if existing_quota:
                # 更新现有配额
                existing_quota.name = quota_data["name"]
                existing_quota.capacity = quota_data["capacity"]
                existing_quota.refill_rate = quota_data["refill_rate"]
                existing_quota.enabled = quota_data["enabled"]
                if "notes" in quota_data:
                    existing_quota.notes = quota_data["notes"]
                
                updated_count += 1
                logger.info(f"✓ 更新配额: {quota_id} ({quota_data['name']})")
            else:
                # 创建新配额
                new_quota = Quota(**quota_data)
                session.add(new_quota)
                
                created_count += 1
                logger.info(f"✓ 创建配额: {quota_id} ({quota_data['name']})")
        
        # 提交事务
        session.commit()
    
    logger.info("=" * 60)
    logger.info(f"配额初始化完成: 创建 {created_count} 个, 更新 {updated_count} 个")
    logger.info("=" * 60)
    
    # 显示所有配额
    logger.info("\n当前所有配额:")
    with Session(engine) as session:
        statement = select(Quota).order_by(Quota.id)
        quotas = session.exec(statement).all()
        
        for quota in quotas:
            logger.info(f"\n  ID: {quota.id}")
            logger.info(f"  名称: {quota.name}")
            logger.info(f"  容量: {quota.capacity}")
            logger.info(f"  补充速率: {quota.refill_rate}/秒")
            logger.info(f"  状态: {'启用' if quota.enabled else '禁用'}")


if __name__ == "__main__":
    try:
        init_quotas()
        logger.info("\n✅ 配额初始化成功！")
    except Exception as e:
        logger.error(f"\n❌ 配额初始化失败: {e}", exc_info=True)
        sys.exit(1)
