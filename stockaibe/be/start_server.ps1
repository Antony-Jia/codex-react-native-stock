# StockAI Backend Server Startup Script
# This script starts the FastAPI backend server using the stockai conda environment

Write-Host "Starting StockAI Backend Server..." -ForegroundColor Green
Write-Host "Environment: stockai" -ForegroundColor Cyan
Write-Host "Port: 8000" -ForegroundColor Cyan
Write-Host ""

# Change to src directory
Set-Location -Path "$PSScriptRoot\src"

# Start uvicorn with stockai environment
& "C:\Users\Admin\anaconda3\envs\stockai\Scripts\uvicorn.exe" stockaibe_be.main:app --reload --host 0.0.0.0 --port 8000

# Note: Press Ctrl+C to stop the server
