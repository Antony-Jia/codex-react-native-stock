"""修复数据库表结构"""

import sys
from pathlib import Path

# 添加 src 目录到 Python 路径
project_root = Path(__file__).parent
src_path = project_root / "src"
if str(src_path) not in sys.path:
    sys.path.insert(0, str(src_path))

from sqlalchemy import text
from stockaibe_be.core.database import engine
from stockaibe_be.core.logging_config import setup_logging, get_logger

# 初始化日志
setup_logging()
logger = get_logger(__name__)


def fix_database():
    """修复数据库表结构"""
    logger.info("=" * 60)
    logger.info("开始修复数据库表结构...")
    logger.info("=" * 60)
    
    try:
        with engine.connect() as conn:
            # 1. 备份现有数据
            logger.info("1. 备份现有数据...")
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS quotas_backup AS 
                SELECT * FROM quotas
            """))
            conn.commit()
            logger.info("✓ 数据备份完成")
            
            # 2. 删除外键约束
            logger.info("2. 删除外键约束...")
            conn.execute(text("""
                ALTER TABLE IF EXISTS metrics DROP CONSTRAINT IF EXISTS metrics_quota_id_fkey
            """))
            conn.execute(text("""
                ALTER TABLE IF EXISTS traces DROP CONSTRAINT IF EXISTS traces_quota_id_fkey
            """))
            conn.commit()
            logger.info("✓ 外键约束已删除")
            
            # 3. 删除旧表
            logger.info("3. 删除旧表...")
            conn.execute(text("DROP TABLE IF EXISTS quotas CASCADE"))
            conn.commit()
            logger.info("✓ 旧表已删除")
            
            # 4. 创建新表
            logger.info("4. 创建新表...")
            conn.execute(text("""
                CREATE TABLE quotas (
                    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    id VARCHAR(100) PRIMARY KEY,
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
                )
            """))
            conn.commit()
            logger.info("✓ 新表已创建")
            
            # 5. 创建索引
            logger.info("5. 创建索引...")
            conn.execute(text("""
                CREATE INDEX IF NOT EXISTS ix_quotas_id ON quotas(id)
            """))
            conn.commit()
            logger.info("✓ 索引已创建")
            
            # 6. 恢复数据
            logger.info("6. 恢复数据...")
            result = conn.execute(text("SELECT COUNT(*) FROM quotas_backup"))
            backup_count = result.scalar()
            
            if backup_count > 0:
                conn.execute(text("""
                    INSERT INTO quotas (created_at, updated_at, id, domain, name, endpoint, 
                                       algo, capacity, refill_rate, leak_rate, burst, enabled, notes)
                    SELECT created_at, updated_at, id, domain, name, endpoint, 
                           algo, capacity, refill_rate, leak_rate, burst, enabled, notes
                    FROM quotas_backup
                    ON CONFLICT (id) DO NOTHING
                """))
                conn.commit()
                logger.info(f"✓ 已恢复 {backup_count} 条数据")
            else:
                logger.info("✓ 无数据需要恢复")
            
            # 7. 重新创建外键约束
            logger.info("7. 重新创建外键约束...")
            conn.execute(text("""
                ALTER TABLE metrics 
                ADD CONSTRAINT metrics_quota_id_fkey 
                FOREIGN KEY (quota_id) REFERENCES quotas(id)
            """))
            conn.execute(text("""
                ALTER TABLE traces 
                ADD CONSTRAINT traces_quota_id_fkey 
                FOREIGN KEY (quota_id) REFERENCES quotas(id)
            """))
            conn.commit()
            logger.info("✓ 外键约束已重建")
            
            # 8. 清理备份表
            logger.info("8. 清理备份表...")
            conn.execute(text("DROP TABLE IF EXISTS quotas_backup"))
            conn.commit()
            logger.info("✓ 备份表已清理")
            
            # 9. 验证表结构
            logger.info("9. 验证表结构...")
            result = conn.execute(text("""
                SELECT 
                    column_name, 
                    data_type, 
                    character_maximum_length,
                    is_nullable
                FROM information_schema.columns 
                WHERE table_name = 'quotas'
                ORDER BY ordinal_position
            """))
            
            logger.info("\n表结构:")
            for row in result:
                logger.info(f"  {row.column_name}: {row.data_type}" + 
                          (f"({row.character_maximum_length})" if row.character_maximum_length else "") +
                          (" NULL" if row.is_nullable == 'YES' else " NOT NULL"))
            
        logger.info("\n" + "=" * 60)
        logger.info("✅ 数据库表结构修复完成！")
        logger.info("=" * 60)
        
    except Exception as e:
        logger.error(f"\n❌ 数据库修复失败: {e}", exc_info=True)
        sys.exit(1)


if __name__ == "__main__":
    fix_database()
