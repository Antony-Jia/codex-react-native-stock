# 日志系统快速开始

## 快速测试

运行测试脚本验证日志系统：

```bash
# 使用 conda 环境
conda activate stockai
python test_logging.py
```

测试完成后，检查以下文件：
- `logs/stockaibe.log` - 应包含所有级别的日志
- `logs/error.log` - 应只包含 ERROR 级别的日志

## 在代码中使用

### 1. 基本使用

```python
from stockaibe_be.core import get_logger

logger = get_logger(__name__)

logger.info("应用启动")
logger.error("发生错误", exc_info=True)
```

### 2. 在新模块中使用

在任何新的 Python 模块中：

```python
# 在文件顶部导入
from ..core import get_logger

# 创建模块级别的日志记录器
logger = get_logger(__name__)

# 在函数中使用
def my_function():
    logger.info("函数开始执行")
    try:
        # 你的代码
        pass
    except Exception as e:
        logger.error(f"函数执行失败: {e}", exc_info=True)
```

### 3. 日志级别使用建议

```python
# DEBUG - 详细的调试信息（仅开发环境）
logger.debug(f"变量值: x={x}, y={y}")

# INFO - 重要的业务流程信息
logger.info("用户登录成功")
logger.info(f"处理了 {count} 条记录")

# WARNING - 警告但不影响运行
logger.warning("配置项缺失，使用默认值")
logger.warning(f"API 调用超时，将重试")

# ERROR - 错误但程序可以继续
logger.error(f"数据保存失败: {e}", exc_info=True)

# CRITICAL - 严重错误，程序可能崩溃
logger.critical("数据库连接失败，程序无法继续")
```

## 配置说明

### 修改日志级别

编辑 `logging_config.yaml`：

```yaml
handlers:
  console:
    level: INFO    # 控制台显示 INFO 及以上
  file:
    level: DEBUG   # 文件记录 DEBUG 及以上
```

### 修改日志文件大小

```yaml
handlers:
  file:
    maxBytes: 10485760    # 10MB (10 * 1024 * 1024)
    backupCount: 5        # 保留 5 个备份
```

## 查看日志

### Windows PowerShell

```powershell
# 实时查看主日志
Get-Content logs\stockaibe.log -Wait -Tail 50

# 实时查看错误日志
Get-Content logs\error.log -Wait -Tail 50

# 搜索特定内容
Select-String -Path logs\stockaibe.log -Pattern "错误"
```

### Linux/Mac

```bash
# 实时查看主日志
tail -f logs/stockaibe.log

# 实时查看错误日志
tail -f logs/error.log

# 搜索特定内容
grep "错误" logs/stockaibe.log
```

## 已集成日志的模块

以下模块已经集成了日志系统：

- ✅ `main.py` - 主应用入口
- ✅ `services/limiter.py` - 限流服务
- ✅ `services/scheduler.py` - 调度服务

## 注意事项

1. **首次运行**：确保已安装 `pyyaml` 依赖
   ```bash
   conda activate stockai
   pip install pyyaml
   ```

2. **日志目录**：`logs/` 目录会自动创建

3. **中文支持**：所有日志文件使用 UTF-8 编码

4. **性能考虑**：生产环境建议将 DEBUG 日志关闭

## 故障排查

### 问题：找不到 pyyaml 模块

```bash
pip install pyyaml
```

### 问题：日志文件没有生成

检查权限和目录：
```python
import os
print(os.path.exists('logs'))  # 应该返回 True
```

### 问题：中文乱码

Windows 终端设置 UTF-8：
```powershell
chcp 65001
```

## 更多信息

详细文档请参考 `LOGGING.md`
