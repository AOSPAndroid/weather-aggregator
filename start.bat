@echo off
REM Weather Aggregator - Quick Start with Cloudflare Tunnel
REM 
REM Prerequisites:
REM 1. Install Node.js from https://nodejs.org
REM 2. Download cloudflared.exe from https://github.com/cloudflare/cloudflared/releases
REM
REM Usage:
REM 1. Install dependencies: npm install
REM 2. Run this script: double-click start.bat

echo Starting Weather Aggregator with Cloudflare Tunnel...
echo.

REM Check if cloudflared exists
if not exist cloudflared.exe (
    echo ERROR: cloudflared.exe not found!
    echo Please download from: https://github.com/cloudflare/cloudflared/releases
    pause
    exit /b 1
)

REM Install dependencies if needed
if not exist node_modules (
    echo Installing dependencies...
    call npm install
)

REM Start the weather aggregator
echo Starting Weather Aggregator on port 3000...
start "Weather Server" cmd /k "npm start"

REM Wait for server to start
timeout /t 3 /nobreak >nul

REM Start Cloudflare Tunnel
echo Starting Cloudflare Tunnel...
echo Your public URL will appear below:
echo.
.\cloudflared.exe tunnel --url http://localhost:3000

pause
