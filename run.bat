@echo off
title Prompt-to-Visualization Agent - Orchestrator
setlocal enabledelayedexpansion

echo ====================================================================
echo   🚀 Welcome to the Intelligent Prompt-to-Visualization Agent! 🚀
echo ====================================================================
echo.

:: 1. Check Node.js
echo [1/5] Checking Node.js installation...
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ Node.js is NOT installed or not in your PATH.
    echo Please install Node.js (v18+) from https://nodejs.org/ and try again.
    pause
    exit /b 1
)
for /f "tokens=*" %%i in ('node -v') do set NODE_VER=%%i
echo ✅ Found Node.js %NODE_VER%

:: 2. Check Python
echo [2/5] Checking Python installation...
where python >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ Python is NOT installed or not in your PATH.
    echo Please install Python 3.10+ and try again.
    pause
    exit /b 1
)
for /f "tokens=*" %%i in ('python --version') do set PY_VER=%%i
echo ✅ Found %PY_VER%

:: 3. Setup Backend Environment Configuration
echo [3/5] Checking Backend Environment Configuration...
if not exist "backend\.env" (
    echo ⚠️  'backend\.env' not found. Creating from template...
    copy "backend\.env.example" "backend\.env" >nul
    echo.
    echo --------------------------------------------------------------------
    echo 🔔 ACTION REQUIRED: We created a new 'backend\.env' file for you.
    echo Please open 'backend\.env' and enter your Google Gemini API Key.
    echo --------------------------------------------------------------------
    echo.
    pause
) else (
    echo ✅ 'backend\.env' configuration file is ready.
)

:: 4. Install Dependencies
echo [4/5] Syncing dependencies...

:: Backend Python dependencies
echo Installing/Verifying Python dependencies...
python -m pip install -r backend\requirements.txt
if %errorlevel% neq 0 (
    echo ⚠️  Standard pip installation encountered issues. Let's try --user option...
    python -m pip install --user -r backend\requirements.txt
)

:: Frontend Node dependencies
if not exist "frontend\node_modules\" (
    echo Node modules not found in 'frontend\'. Running 'npm install'...
    cd frontend
    call npm install
    cd ..
) else (
    echo ✅ Node dependencies are already synced.
)

:: 5. Launch Servers Concurrent
echo.
echo [5/5] Launching Frontend & Backend servers...
echo --------------------------------------------------------------------
echo 👉 The FastAPI Backend will launch in a dedicated command window.
echo 👉 The Next.js Frontend will run in this current window.
echo --------------------------------------------------------------------
echo.
pause

:: Start Backend in a separate window
start "Agent Backend Server" cmd /k "title Agent Backend Server (Port 8080) && cd backend && python -m uvicorn main:app --reload --port 8080"

:: Start Frontend in current window
echo Starting Next.js Frontend on http://localhost:3000...
cd frontend
call npm run dev

cd ..
pause
