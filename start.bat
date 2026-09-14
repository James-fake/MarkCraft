@echo off
chcp 65001 >nul 2>&1
title MarkCraft

set "NODE_PATH=E:\Node.js"
set "PATH=%NODE_PATH%;%PATH%"

cd /d "%~dp0"

echo.
echo   ╔══════════════════════════════════════╗
echo   ║       MarkCraft 启动中...           ║
echo   ╚══════════════════════════════════════╝
echo.

call npx vite --host --port 5173

pause
