"""
日志系统测试脚本

运行此脚本测试日志系统是否正常工作
"""

import sys
from pathlib import Path

# 添加 src 目录到 Python 路径
src_path = Path(__file__).parent / "src"
sys.path.insert(0, str(src_path))

from stockaibe_be.core import setup_logging, get_logger

# 初始化日志系统
setup_logging()

# 获取日志记录器
logger = get_logger(__name__)

def test_logging():
    """测试各种日志级别"""
    print("=" * 60)
    print("开始测试日志系统...")
    print("=" * 60)
    
    # 测试不同级别的日志
    logger.debug("这是一条 DEBUG 级别的日志 - 用于调试信息")
    logger.info("这是一条 INFO 级别的日志 - 用于一般信息")
    logger.warning("这是一条 WARNING 级别的日志 - 用于警告信息")
    logger.error("这是一条 ERROR 级别的日志 - 用于错误信息")
    
    # 测试中文日志
    logger.info("测试中文日志：你好，世界！")
    logger.info(f"测试格式化：数字={123}, 字符串={'测试'}")
    
    # 测试异常日志
    try:
        result = 1 / 0
    except Exception as e:
        logger.error(f"捕获到异常: {e}", exc_info=True)
    
    # 测试长日志
    long_message = "这是一条很长的日志消息 " * 10
    logger.info(long_message)
    
    print("\n" + "=" * 60)
    print("日志测试完成！")
    print("=" * 60)
    print("\n请检查以下位置的日志文件：")
    print("  - logs/stockaibe.log  (主日志文件)")
    print("  - logs/error.log      (错误日志文件)")
    print("\n控制台应该显示 INFO 及以上级别的日志")
    print("文件中应该包含 DEBUG 及以上级别的日志")
    print("=" * 60)

if __name__ == "__main__":
    test_logging()
