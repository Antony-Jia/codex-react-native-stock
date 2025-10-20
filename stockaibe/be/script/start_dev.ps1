# 开发环境启动脚本
# 使用方法: .\script\start_dev.ps1

Write-Host "正在启动 StockAI BE 开发服务器..." -ForegroundColor Green

# 设置 PYTHONPATH
$env:PYTHONPATH = "src"

# 启动 uvicorn
uvicorn stockaibe_be.main:app --reload --host 0.0.0.0 --port 8000
