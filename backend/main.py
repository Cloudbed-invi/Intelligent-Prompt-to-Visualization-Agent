from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import shutil
import uuid
import os
import pandas as pd
from typing import List

# Import services
from services.data_processor import load_data, get_dataset_summary
from services.spec_validator import validate_spec
from services.fallback_engine import generate_fallback_spec
from services.ai_agent import generate_spec
from models.chart_spec import APIResponse, ChartSpec

app = FastAPI()

# CORS configuration
origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_DIR = "backend/tmp_uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

import json

# In-memory registry mapping ID -> {path, original_filename, summary}
REGISTRY_FILE = "backend/registry.json"

def load_registry():
    if os.path.exists(REGISTRY_FILE):
        try:
            with open(REGISTRY_FILE, "r") as f:
                return json.load(f)
        except Exception as e:
            print(f"Failed to load registry: {e}")
    return {}

def save_registry(registry):
    try:
        with open(REGISTRY_FILE, "w") as f:
            json.dump(registry, f)
    except Exception as e:
        print(f"Failed to save registry: {e}")

file_registry = load_registry()

@app.get("/")
def read_root():
    return {"message": "Prompt-to-Visualization Agent API is running."}

@app.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    # 1. Enforce specific file size limit (approx 10MB)
    file_size = 0  # In a real app we'd stream and count, for specific demo:
    # content = await file.read() check len(content)
    
    file_id = str(uuid.uuid4())
    file_path = os.path.join(UPLOAD_DIR, f"{file_id}_{file.filename}")
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    # Check size validation here (if we want to be strict after upload)
    if os.path.getsize(file_path) > 10 * 1024 * 1024:
        os.remove(file_path)
        raise HTTPException(status_code=413, detail="Dataset too large for demo version")

    try:
        # Load and verify
        df, col_map = load_data(file_path)
        summary = get_dataset_summary(df)
        
        # Store in registry
        file_registry[file_id] = {
            "path": file_path,
            "filename": file.filename,
            "summary": summary,
            "col_map": col_map
        }
        save_registry(file_registry)
        
        return {
            "file_id": file_id,
            "filename": file.filename,
            "summary": summary
        }
    except Exception as e:
        if os.path.exists(file_path):
            os.remove(file_path)
        raise HTTPException(status_code=400, detail=f"Error processing file: {str(e)}")

class QueryRequest(pd.BaseModel if hasattr(pd, 'BaseModel') else object): 
    # Quick fix for pydantic model definition inside fastapi
    pass

# We need a Pydantic model for the body
from pydantic import BaseModel
class QueryRequest(BaseModel):
    file_id: str
    prompt: str
    chart_type: str = "auto"  # Default to auto

@app.post("/query", response_model=APIResponse)
async def process_query(request: QueryRequest):
    file_id = request.file_id
    prompt = request.prompt
    chart_type = request.chart_type if request.chart_type != "auto" else None
    
    print(f"DEBUG: Received query. Prompt: '{prompt}', Chart Type: '{chart_type}' (Raw: '{request.chart_type}')")
    
    if file_id not in file_registry:
        raise HTTPException(status_code=404, detail="File ID not found.")
    
    file_info = file_registry[file_id]
    summary = file_info["summary"]
    warnings = []
    
    spec = {}
    status = "success"
    
    # 1. Attempt AI Generation
    try:
        spec = generate_spec(summary, prompt, chart_type)
    except Exception as e:
        print(f"AI Error: {e}")
        warnings.append({"type": "ai_error", "message": f"AI Generation failed: {str(e)}"})
        status = "fallback"
    
    # 2. Validate/Fix Spec (if AI succeeded)
    if status == "success":
        spec, val_warnings = validate_spec(spec, summary["column_names"])
        warnings.extend(val_warnings)
        
        # If validator invalidated crucial fields, might need fallback?
        # For now, let's assume validator fixes are enough or it leaves potential holes Recharts will ignore.
    
    # 3. Fallback Logic (if AI failed or prompt ambiguous/empty)
    # Detect ambiguous prompt? "Show something" -> might come from AI as generic.
    
    if status == "fallback" or not spec:
        spec = generate_fallback_spec(summary, prompt)
        warnings.append({"type": "fallback_used", "message": "Generated deterministic fallback chart."})
    
    # 4. Generate Code Snippet (Logic moved here for simplicity)
    # Simple template based on spec
    code = f"""
import pandas as pd
import plotly.express as px

# Data loaded as 'df'
# Spec: {spec}

fig = px.{spec.get('chart_type', 'bar')}(
    df, 
    x='{spec.get('x_axis')}', 
    y='{spec.get('y_axis', '')}', 
    title='{spec.get('title', 'Chart')}'
)
fig.show()
    """

    return APIResponse(
        status=status,
        spec=spec,
        code=code,
        insights=spec.get("insight_summary", "No insights available."),
        warnings=warnings
    )
