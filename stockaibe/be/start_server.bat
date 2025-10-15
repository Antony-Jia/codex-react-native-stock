@echo off
REM StockAI Backend Server Startup Script
REM This script starts the FastAPI backend server using the stockai conda environment

echo Starting StockAI Backend Server...
echo Environment: stockai
echo Port: 8000
echo.

cd /d "%~dp0\src"

C:\Users\Admin\anaconda3\envs\stockai\Scripts\uvicorn.exe stockaibe_be.main:app --reload --host 0.0.0.0 --port 8000

REM Note: Press Ctrl+C to stop the server
