"""
日志配置模块

提供统一的日志配置和初始化功能，支持同时输出到控制台和文件。
"""

import logging
import logging.config
import os
from pathlib import Path
import yaml


def setup_logging(
    config_path: str = None,
    default_level: int = logging.INFO,
    log_dir: str = "logs"
) -> None:
    """
    设置日志配置
    
    Args:
        config_path: 日志配置文件路径，默认为项目根目录下的 logging_config.yaml
        default_level: 默认日志级别
        log_dir: 日志文件目录
    """
    # 如果没有指定配置文件路径，则查找默认位置
    if config_path is None:
        # 从当前文件向上查找项目根目录
        current = Path(__file__).resolve().parent
        for _ in range(5):
            config_file = current / "logging_config.yaml"
            if config_file.exists():
                config_path = str(config_file)
                break
            current = current.parent
        
        # 如果还是没找到，尝试相对于 be 目录
        if config_path is None:
            be_root = Path(__file__).resolve().parent.parent.parent.parent
            config_file = be_root / "logging_config.yaml"
            if config_file.exists():
                config_path = str(config_file)
    
    # 确保日志目录存在
    log_path = Path(log_dir)
    if not log_path.is_absolute():
        # 如果是相对路径，相对于 be 目录
        be_root = Path(__file__).resolve().parent.parent.parent.parent
        log_path = be_root / log_dir
    
    log_path.mkdir(parents=True, exist_ok=True)
    
    # 加载配置文件
    if config_path and Path(config_path).exists():
        try:
            with open(config_path, 'r', encoding='utf-8') as f:
                config = yaml.safe_load(f)
            
            # 更新日志文件路径为绝对路径
            for handler_name, handler_config in config.get('handlers', {}).items():
                if 'filename' in handler_config:
                    filename = handler_config['filename']
                    if not Path(filename).is_absolute():
                        handler_config['filename'] = str(log_path / Path(filename).name)
            
            logging.config.dictConfig(config)
            logging.info(f"日志配置已从 {config_path} 加载")
        except Exception as e:
            # 如果加载配置文件失败，使用基本配置
            logging.basicConfig(
                level=default_level,
                format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
                datefmt='%Y-%m-%d %H:%M:%S'
            )
            logging.error(f"加载日志配置文件失败: {e}，使用默认配置")
    else:
        # 使用基本配置
        logging.basicConfig(
            level=default_level,
            format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
            datefmt='%Y-%m-%d %H:%M:%S',
            handlers=[
                logging.StreamHandler(),
                logging.FileHandler(
                    log_path / 'stockaibe.log',
                    encoding='utf-8'
                )
            ]
        )
        logging.warning(f"未找到日志配置文件 {config_path}，使用默认配置")


def get_logger(name: str = None) -> logging.Logger:
    """
    获取日志记录器
    
    Args:
        name: 日志记录器名称，默认为调用模块的名称
    
    Returns:
        logging.Logger: 日志记录器实例
    """
    if name is None:
        # 获取调用者的模块名
        import inspect
        frame = inspect.currentframe().f_back
        name = frame.f_globals.get('__name__', 'stockaibe_be')
    
    return logging.getLogger(name)
