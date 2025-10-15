# 日志系统使用说明

## 概述

本项目使用 Python 标准库的 `logging` 模块实现了完整的日志系统，支持同时输出到控制台和文件。

## 特性

- ✅ **双输出**：同时输出到终端（控制台）和日志文件
- ✅ **日志轮转**：自动轮转日志文件，单个文件最大 10MB，保留 5 个备份
- ✅ **分级日志**：支持 DEBUG、INFO、WARNING、ERROR、CRITICAL 五个级别
- ✅ **错误分离**：ERROR 及以上级别的日志会额外写入 `error.log`
- ✅ **中文支持**：使用 UTF-8 编码，完美支持中文日志
- ✅ **详细格式**：文件日志包含时间、模块名、级别、文件位置、函数名等详细信息

## 日志文件位置

所有日志文件存储在 `logs/` 目录下：

- `logs/stockaibe.log` - 主日志文件（DEBUG 及以上级别）
- `logs/error.log` - 错误日志文件（ERROR 及以上级别）

## 配置文件

日志配置文件为 `logging_config.yaml`，包含以下配置：

### 日志级别
- **控制台**：INFO 及以上
- **文件**：DEBUG 及以上
- **错误文件**：ERROR 及以上

### 日志格式

**控制台格式**（简洁）：
```
2025-01-15 17:30:00 - stockaibe_be.main - INFO - 应用启动中...
```

**文件格式**（详细）：
```
2025-01-15 17:30:00 - stockaibe_be.main - INFO - [main.py:59] - startup_event - 应用启动中...
```

## 使用方法

### 1. 在模块中使用日志

```python
from ..core import get_logger

# 获取日志记录器
logger = get_logger(__name__)

# 记录不同级别的日志
logger.debug("调试信息")
logger.info("一般信息")
logger.warning("警告信息")
logger.error("错误信息")
logger.critical("严重错误")

# 记录异常信息（包含堆栈跟踪）
try:
    # 一些可能出错的代码
    pass
except Exception as e:
    logger.error(f"操作失败: {e}", exc_info=True)
```

### 2. 日志记录器命名

推荐使用 `__name__` 作为日志记录器名称，这样可以自动使用模块的完整路径：

```python
logger = get_logger(__name__)  # 推荐
# 例如：stockaibe_be.services.limiter
```

### 3. 日志级别选择指南

- **DEBUG**：详细的调试信息，仅在开发时使用
  - 示例：`logger.debug(f"加载配额: {quota.name}")`
  
- **INFO**：一般信息，记录程序的正常运行状态
  - 示例：`logger.info("应用启动完成")`
  
- **WARNING**：警告信息，程序可以继续运行但需要注意
  - 示例：`logger.warning(f"Redis 连接失败，回退到内存模式")`
  
- **ERROR**：错误信息，某个功能无法正常执行
  - 示例：`logger.error(f"数据库操作失败: {e}", exc_info=True)`
  
- **CRITICAL**：严重错误，程序可能无法继续运行
  - 示例：`logger.critical("数据库连接完全失败，程序即将退出")`

## 日志轮转

日志文件会自动轮转：
- 单个日志文件最大 10MB
- 保留最近 5 个备份文件
- 文件命名：`stockaibe.log`, `stockaibe.log.1`, `stockaibe.log.2`, ...

## 自定义配置

如需修改日志配置，编辑 `logging_config.yaml` 文件：

```yaml
handlers:
  file:
    level: DEBUG              # 修改文件日志级别
    maxBytes: 10485760        # 修改文件大小限制（字节）
    backupCount: 5            # 修改备份文件数量
```

## 依赖

日志系统需要以下依赖：
- `pyyaml` - 用于解析 YAML 配置文件

已添加到 `pyproject.toml` 中：
```toml
pyyaml = "^6.0.0"
```

## 安装依赖

如果是首次使用，请安装依赖：

```bash
# 使用 poetry
poetry install

# 或使用 conda（根据项目配置）
conda activate stockai
pip install pyyaml
```

## 查看日志

### 实时查看日志（Linux/Mac）
```bash
tail -f logs/stockaibe.log
```

### 实时查看日志（Windows PowerShell）
```powershell
Get-Content logs\stockaibe.log -Wait -Tail 50
```

### 查看错误日志
```bash
# Linux/Mac
tail -f logs/error.log

# Windows PowerShell
Get-Content logs\error.log -Wait -Tail 50
```

## 注意事项

1. **编码问题**：所有日志文件使用 UTF-8 编码，确保中文正常显示
2. **权限问题**：确保应用有权限在 `logs/` 目录创建和写入文件
3. **磁盘空间**：定期检查日志文件大小，避免占用过多磁盘空间
4. **生产环境**：生产环境建议将控制台日志级别设置为 WARNING 或 ERROR

## 故障排查

### 问题：日志文件没有生成

**解决方案**：
1. 检查 `logs/` 目录是否存在且有写入权限
2. 检查 `logging_config.yaml` 文件是否存在
3. 查看控制台是否有错误提示

### 问题：中文乱码

**解决方案**：
1. 确保 `logging_config.yaml` 中设置了 `encoding: utf-8`
2. 使用支持 UTF-8 的文本编辑器查看日志文件
3. Windows 系统可能需要设置终端编码：`chcp 65001`

### 问题：日志文件过大

**解决方案**：
1. 调整 `maxBytes` 参数减小单个文件大小
2. 减少 `backupCount` 参数减少备份文件数量
3. 提高日志级别，减少日志输出量

## 示例

完整的日志使用示例：

```python
from ..core import get_logger

logger = get_logger(__name__)

def process_data(data):
    logger.info(f"开始处理数据，数据量: {len(data)}")
    
    try:
        # 处理数据
        for i, item in enumerate(data):
            logger.debug(f"处理第 {i+1} 项: {item}")
            
            if not validate(item):
                logger.warning(f"数据验证失败: {item}")
                continue
            
            process_item(item)
        
        logger.info("数据处理完成")
        
    except Exception as e:
        logger.error(f"数据处理失败: {e}", exc_info=True)
        raise
```
