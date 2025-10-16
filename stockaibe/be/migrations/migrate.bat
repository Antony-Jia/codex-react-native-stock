@echo off
chcp 65001 >nul
echo ========================================
echo 数据库迁移：添加 task_type 列
echo ========================================
echo.

REM 激活 conda 环境
call conda activate stockai
if errorlevel 1 (
    echo 错误: 无法激活 stockai 环境
    pause
    exit /b 1
)

echo 已激活 stockai 环境
echo.

REM 执行迁移脚本
cd /d "%~dp0.."
python add_task_type_column.py

if errorlevel 1 (
    echo.
    echo 迁移失败！请检查错误信息。
    pause
    exit /b 1
)

echo.
echo ========================================
echo 迁移成功！现在可以重启应用了。
echo ========================================
pause
