# Intelligent Prompt-to-Visualization Agent 🚀

A production-style AI agent that converts natural language prompts and datasets into beautiful, interactive visualizations.

## 🌟 Features

### 🧠 Core Capabilities
- **Drag & Drop Upload**: Supports CSV, Excel, JSON files.
- **Natural Language Query**: Ask "Show sales trend" and get a chart instantly.
- **AI-Powered**: Uses **Google Gemini** to understand data structure and user intent.
- **Robust Fallback**: Deterministic chart generation ensures you always get a result, even if the AI falters.

### 📊 Visualization & Interaction
- **Chart Type Priority**: Force a specific chart type (Bar, Line, Scatter, etc.) directly from the prompt input.
- **Interactive Zoom**: **Click and drag** to zoom into any region. **Right-click** to reset the view.
- **Dynamic Filtering**: Toggle data series visibility by clicking the **interactive legend**.
- **Manual Switching**: Instantly switch between Bar, Line, Area, Pie, and Scatter charts via the toolbar.
- **Dark Mode**: Fully supported dark theme for low-light environments.
- **Code Export**: View and copy the Python/Plotly code used to generate the visualization.

## 🛠️ Tech Stack
- **Frontend**: Next.js 14, Tailwind CSS, Recharts, Lucide Icons.
- **Backend**: FastAPI, Pandas, Google Gemini API.
- **State Management**: React Hooks & Local Storage for persistence.

## 🚀 Setup & Run

### Prerequisites
- **Node.js** (v18+ recommended) & **npm**
- **Python 3.10+** (Conda recommended)
- **Google Gemini API Key** (from [Google AI Studio](https://aistudio.google.com/))

---

### ⚡ Option A: Single-Command Quickstart (Recommended)

We have created unified, cross-platform orchestrator scripts that automatically check requirements, install missing dependencies, and launch both servers simultaneously!

#### On Windows:
Double-click `run.bat` or run in PowerShell:
```powershell
.\run.bat
```

#### On macOS / Linux:
Run in your terminal:
```bash
chmod +x run.sh
./run.sh
```

---

### 🛠️ Option B: Manual Setup

If you prefer to start the servers manually in separate terminals, follow these steps:

#### 1. Backend Setup (FastAPI)
```bash
cd backend
# Create environment or activate your conda environment
conda activate prompt-viz-agent
# Install backend dependencies
pip install -r requirements.txt
# Copy environment file and add your GEMINI_API_KEY
cp .env.example .env
# Start the FastAPI server
uvicorn main:app --reload --port 8080
```
The backend server runs at `http://localhost:8080`.

#### 2. Frontend Setup (Next.js)
```bash
cd frontend
# Install frontend dependencies
npm install
# Start the Next.js development server
npm run dev
```
The frontend application runs at `http://localhost:3000`.


## 🧪 Testing the Agent
1. Open `http://localhost:3000`.
2. Upload a dataset (e.g., `sales_data.csv`).
3. **Select a Priority** (Optional): Choose "Line" from the dropdown next to the input.
4. Type a prompt:
   - "Show profit trend over time"
   - "Compare sales by region"
   - "Scatter plot of discount vs profit"
5. **Interact**:
   - Drag to zoom in on interesting data points.
   - Click legend items to hide/show categories.
   - Switch chart types using the toolbar buttons.

## 📂 Project Structure
- `backend/services`: Core logic (AI Agent, Data Processor, Spec Validator).
- `frontend/components`: React UI components (ChartRenderer, PromptInput, etc.).
- `frontend/lib/api.ts`: API client for backend communication.

---
*Built for the IEEE Hackathon 2026*
.