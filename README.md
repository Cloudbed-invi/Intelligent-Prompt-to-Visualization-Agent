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
- Node.js & npm
- Python 3.10+ (Conda recommended)
- Google Gemini API Key

### 1. Backend Setup
```bash
cd backend
# Activate Conda environment
conda activate prompt-viz-agent
# Install dependencies
pip install -r requirements.txt
# Set API Key (PowerShell)
$env:GEMINI_API_KEY="your-api-key-here"
# Run Server
uvicorn main:app --reload --port 8080
```
Backend will run at `http://localhost:8080`.

### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
Frontend will run at `http://localhost:3000`.

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