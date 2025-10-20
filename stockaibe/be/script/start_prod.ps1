# 生产环境启动脚本
# 使用方法: .\script\start_prod.ps1

Write-Host "正在启动 StockAI BE 生产服务器..." -ForegroundColor Green

# 设置 PYTHONPATH
$env:PYTHONPATH = "src"

# 启动 uvicorn (无 reload，多 worker)
uvicorn stockaibe_be.main:app --host 0.0.0.0 --port 8000 --workers 4
