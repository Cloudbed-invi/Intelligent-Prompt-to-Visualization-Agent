#!/bin/bash

# Terminate background processes on exit
cleanup() {
    echo -e "\n🛑 Stopping servers..."
    if [ ! -z "$BACKEND_PID" ]; then
        kill $BACKEND_PID 2>/dev/null
    fi
    exit 0
}

trap cleanup SIGINT SIGTERM EXIT

echo "===================================================================="
echo "  🚀 Welcome to the Intelligent Prompt-to-Visualization Agent! 🚀"
echo "===================================================================="
echo

# 1. Check Node.js
echo "[1/5] Checking Node.js installation..."
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is NOT installed. Please install Node.js (v18+) and try again."
    exit 1
fi
echo "✅ Found Node.js $(node -v)"

# 2. Check Python
echo "[2/5] Checking Python installation..."
PYTHON_CMD="python3"
if ! command -v python3 &> /dev/null; then
    if command -v python &> /dev/null; then
        PYTHON_CMD="python"
    else
        echo "❌ Python is NOT installed. Please install Python 3.10+ and try again."
        exit 1
    fi
fi
echo "✅ Found $($PYTHON_CMD --version)"

# 3. Setup Backend Environment Configuration
echo "[3/5] Checking Backend Environment Configuration..."
if [ ! -f "backend/.env" ]; then
    echo "⚠️  'backend/.env' not found. Creating from template..."
    cp backend/.env.example backend/.env
    echo
    echo "--------------------------------------------------------------------"
    echo "🔔 ACTION REQUIRED: We created a new 'backend/.env' file for you."
    echo "Please open 'backend/.env' and enter your Google Gemini API Key."
    echo "--------------------------------------------------------------------"
    echo
    read -p "Press Enter to continue after reviewing..."
else
    echo "✅ 'backend/.env' configuration file is ready."
fi

# 4. Sync dependencies
echo "[4/5] Syncing dependencies..."

echo "Installing/Verifying Python dependencies..."
$PYTHON_CMD -m pip install -r backend/requirements.txt || $PYTHON_CMD -m pip install --user -r backend/requirements.txt

if [ ! -d "frontend/node_modules" ]; then
    echo "Node modules not found in 'frontend/'. Running 'npm install'..."
    cd frontend && npm install && cd ..
else
    echo "✅ Node dependencies are already synced."
fi

# 5. Launch Servers Concurrent
echo
echo "[5/5] Launching Frontend & Backend servers..."
echo "--------------------------------------------------------------------"
echo "👉 Starting FastAPI Backend on http://127.0.0.1:8080"
echo "👉 Starting Next.js Frontend on http://localhost:3000"
echo "--------------------------------------------------------------------"
echo

# Start Backend in background
cd backend
$PYTHON_CMD -m uvicorn main:app --reload --port 8080 &
BACKEND_PID=$!
cd ..

# Start Frontend in foreground
cd frontend
npm run dev
