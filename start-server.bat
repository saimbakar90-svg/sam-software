@echo off
title USMAN PHARMACY ERP - Local Server
cd /d "%~dp0"
echo ========================================================
echo   USMAN PHARMACY & COSMETICS ERP
echo   Starting local web server on http://localhost:8080/
echo ========================================================
timeout /t 1 >nul
start "" "http://localhost:8080/"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0server.ps1" -port 8080
if %errorlevel% neq 0 (
    echo.
    echo Server stopped or encountered an error.
    pause
)
