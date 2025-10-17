"""批量处理示例：结合 @SchedulerTask 和 @LimitCallTask

演示如何在周期性任务中调用受限流保护的函数
"""

import time
import sys
from pathlib import Path
from typing import List, Dict, Any
from sqlmodel import Session

# 添加 src 目录到 Python 路径
project_root = Path(__file__).parent.parent
src_path = project_root / "src"
if str(src_path) not in sys.path:
    sys.path.insert(0, str(src_path))

from stockaibe_be.services.task_decorators import SchedulerTask, LimitCallTask
from stockaibe_be.core.logging_config import get_logger

logger = get_logger(__name__)


# ==================== 函数级别限流示例 ====================

@LimitCallTask(
    id="api_call_external_001",
    name="调用外部API",
    quota_name="external_api",
    description="调用外部 API，每次调用受限流保护"
)
def call_external_api(item_id: int, data: Dict[str, Any]) -> Dict[str, Any]:
    """
    调用外部 API（模拟）
    
    注意：需要先在配额管理中创建 'external_api' 配额
    推荐配置：capacity=10, refill_rate=1.0 (每秒补充1个令牌)
    """
    logger.info(f"调用外部 API: item_id={item_id}")
    
    # 模拟 API 调用
    time.sleep(0.05)  # 模拟网络延迟
    
    return {
        "item_id": item_id,
        "status": "success",
        "result": f"处理完成: {data.get('name', 'unknown')}"
    }


@LimitCallTask(
    id="send_email_001",
    name="发送邮件",
    quota_name="email_service",
    description="发送邮件通知，防止邮件服务过载"
)
def send_email(recipient: str, subject: str, body: str) -> bool:
    """
    发送邮件（模拟）
    
    注意：需要先创建 'email_service' 配额
    推荐配置：capacity=20, refill_rate=0.1 (每10秒补充1个令牌)
    """
    logger.info(f"发送邮件: {recipient} - {subject}")
    
    # 模拟邮件发送
    time.sleep(0.02)
    
    return True


@LimitCallTask(
    id="database_write_001",
    name="数据库写入",
    quota_name="db_write",
    description="批量写入数据库，防止数据库过载"
)
def write_to_database(records: List[Dict[str, Any]]) -> int:
    """
    批量写入数据库（模拟）
    
    注意：需要先创建 'db_write' 配额
    推荐配置：capacity=50, refill_rate=5.0 (每秒补充5个令牌)
    """
    logger.info(f"写入数据库: {len(records)} 条记录")
    
    # 模拟数据库写入
    time.sleep(0.01 * len(records))
    
    return len(records)


# ==================== 调度任务：使用限流函数 ====================

@SchedulerTask(
    id="batch_api_call_001",
    name="批量API调用",
    cron="*/5 * * * *",  # 每 5 分钟执行一次
    description="批量调用外部 API，自动应用限流保护"
)
def batch_api_call_task(session: Session) -> None:
    """
    批量调用外部 API
    
    这个任务会循环调用 call_external_api 函数，
    每次调用都会自动应用 'external_api' 配额的限流策略
    """
    logger.info("=" * 60)
    logger.info("开始批量 API 调用任务...")
    
    # 模拟要处理的数据
    items = [
        {"id": i, "name": f"Item_{i}", "value": i * 100}
        for i in range(1, 21)  # 20 个项目
    ]
    
    success_count = 0
    failed_count = 0
    
    for item in items:
        try:
            # 调用受限流保护的函数
            # 如果配额耗尽，函数会自动等待并重试
            result = call_external_api(item["id"], item)
            success_count += 1
            logger.info(f"✓ 处理成功: {result['result']}")
        except Exception as e:
            failed_count += 1
            logger.error(f"✗ 处理失败 item_id={item['id']}: {e}")
    
    logger.info(
        f"批量 API 调用完成: 成功 {success_count} 个, "
        f"失败 {failed_count} 个"
    )
    logger.info("=" * 60)


@SchedulerTask(
    id="batch_email_notification_001",
    name="批量邮件通知",
    cron="0 9 * * *",  # 每天早上 9 点
    description="批量发送邮件通知，受限流保护"
)
def batch_email_notification_task(session: Session) -> None:
    """
    批量发送邮件通知
    
    每次调用 send_email 都会自动应用 'email_service' 配额限流
    """
    logger.info("=" * 60)
    logger.info("开始批量邮件通知任务...")
    
    # 模拟收件人列表
    recipients = [
        {"email": f"user{i}@example.com", "name": f"User {i}"}
        for i in range(1, 11)  # 10 个收件人
    ]
    
    sent_count = 0
    
    for recipient in recipients:
        try:
            # 调用受限流保护的函数
            success = send_email(
                recipient=recipient["email"],
                subject="每日数据报告",
                body=f"您好 {recipient['name']}，这是您的每日报告..."
            )
            if success:
                sent_count += 1
                logger.info(f"✓ 邮件已发送: {recipient['email']}")
        except Exception as e:
            logger.error(f"✗ 邮件发送失败 {recipient['email']}: {e}")
    
    logger.info(f"批量邮件发送完成: 成功 {sent_count}/{len(recipients)} 封")
    logger.info("=" * 60)


@SchedulerTask(
    id="batch_data_sync_001",
    name="批量数据同步",
    cron="0 */2 * * *",  # 每 2 小时
    description="批量同步数据到数据库，受限流保护"
)
def batch_data_sync_task(session: Session) -> None:
    """
    批量数据同步
    
    演示如何在循环中使用限流函数处理大量数据
    """
    logger.info("=" * 60)
    logger.info("开始批量数据同步任务...")
    
    # 模拟大量数据
    total_records = 100
    batch_size = 10
    
    total_written = 0
    
    for batch_num in range(0, total_records, batch_size):
        batch_records = [
            {
                "id": i,
                "timestamp": time.time(),
                "value": i * 10
            }
            for i in range(batch_num, min(batch_num + batch_size, total_records))
        ]
        
        try:
            # 调用受限流保护的函数
            written = write_to_database(batch_records)
            total_written += written
            logger.info(
                f"✓ 批次 {batch_num // batch_size + 1}: "
                f"写入 {written} 条记录"
            )
        except Exception as e:
            logger.error(f"✗ 批次写入失败: {e}")
    
    logger.info(f"批量数据同步完成: 共写入 {total_written} 条记录")
    logger.info("=" * 60)


# ==================== 高级示例：动态限流 ====================

@LimitCallTask(
    id="dynamic_api_call_001",
    name="动态API调用",
    quota_name="dynamic_api",
    description="支持动态调整限流参数的 API 调用"
)
def dynamic_api_call(endpoint: str, params: Dict[str, Any]) -> Dict[str, Any]:
    """
    动态 API 调用
    
    配额 'dynamic_api' 可以在后台动态调整：
    - 高峰期：降低 refill_rate，减少调用频率
    - 低峰期：提高 refill_rate，加快处理速度
    
    多个任务可以共享同一个配额，实现统一限流
    """
    logger.info(f"调用动态 API: {endpoint}")
    time.sleep(0.03)
    return {"endpoint": endpoint, "status": "ok"}


@SchedulerTask(
    id="smart_batch_process_001",
    name="智能批量处理",
    cron="*/10 * * * *",  # 每 10 分钟
    description="根据配额状态智能调整处理速度"
)
def smart_batch_process_task(session: Session) -> None:
    """
    智能批量处理
    
    演示如何根据限流情况动态调整处理策略
    """
    logger.info("=" * 60)
    logger.info("开始智能批量处理...")
    
    endpoints = [
        "/api/data/fetch",
        "/api/data/process",
        "/api/data/export",
    ]
    
    for endpoint in endpoints:
        for i in range(5):
            try:
                result = dynamic_api_call(
                    endpoint=endpoint,
                    params={"batch": i}
                )
                logger.info(f"✓ {endpoint} 批次 {i}: {result['status']}")
            except RuntimeError as e:
                # 限流超时，跳过剩余请求
                logger.warning(f"⚠️ 限流超时，跳过剩余请求: {e}")
                break
            except Exception as e:
                logger.error(f"✗ 请求失败: {e}")
    
    logger.info("智能批量处理完成")
    logger.info("=" * 60)


# ==================== 使用说明 ====================
"""
使用步骤：

1. 创建配额（在前端"配额管理"或通过 API）：

   POST /api/quotas
   {
     "id": "external_api",
     "capacity": 10,
     "refill_rate": 1.0,
     "enabled": true
   }
   
   POST /api/quotas
   {
     "id": "email_service",
     "capacity": 20,
     "refill_rate": 0.1,
     "enabled": true
   }
   
   POST /api/quotas
   {
     "id": "db_write",
     "capacity": 50,
     "refill_rate": 5.0,
     "enabled": true
   }

2. 启动应用：
   python -m src.stockaibe_be.main

3. 任务会自动注册并开始执行

4. 监控：
   - 前端"任务调度"页面：查看任务状态
   - 前端"请求追踪"页面：查看函数调用记录
   - 前端"配额管理"页面：动态调整限流参数

5. 动态调整：
   - 修改配额的 capacity 或 refill_rate
   - 所有使用该配额的函数立即生效
   - 无需重启应用

优势：
✅ 一对多映射：多个函数共享一个配额
✅ 动态调整：后台修改配额参数全体生效
✅ 自动重试：被限流时自动等待并重试
✅ 完整追踪：所有调用记录到数据库
✅ 灵活组合：调度任务 + 限流函数 = 完美搭配
"""
