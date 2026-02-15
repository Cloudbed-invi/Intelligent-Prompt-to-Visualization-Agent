import google.generativeai as genai
import os
import json
import time
from dotenv import load_dotenv
from models.chart_spec import ChartSpec

# Load environment variables
load_dotenv()

# Configure Gemini
# User needs to set GEMINI_API_KEY in environment or .env
api_key = os.getenv("GEMINI_API_KEY")
if api_key:
    genai.configure(api_key=api_key)

def generate_spec(df_summary: dict, prompt: str, preferred_chart_type: str = None) -> dict:
    print(f"DEBUG: AI Agent generating spec. Preferred Type: {preferred_chart_type}")
    """
    Generate chart spec using Gemini with retry and timeout policy.
    """
    if not api_key:
        raise ValueError("GEMINI_API_KEY not found.")

    model = genai.GenerativeModel('gemini-flash-lite-latest')
    
    # Dynamic instructions based on preference
    chart_preference_instruction = ""
    if preferred_chart_type:
        chart_preference_instruction = f"""11. USER PREFERENCE: The user has explicitly requested the chart type: "{preferred_chart_type}". You MUST set "chart_type" to "{preferred_chart_type}" and choose axes compatible with it."""

    # Construct strictly typed prompt
    system_prompt = f"""
    You are a data visualization expert. 
    User Prompt: "{prompt}"
    
    Dataset Schema:
    {json.dumps(df_summary, indent=2)}
    
    Task: Generation a JSON specification for a chart.
    
    Rules:
    1. Output MUST be valid JSON matching this schema:
    {{
        "chart_type": "bar" | "line" | "scatter" | "histogram" | "pie",
        "x_axis": "column_name",
        "y_axis": "column_name" (optional),
        "group_by": "column_name" (optional),
        "aggregation": "sum" | "avg" | "count" | "min" | "max" (optional),
        "filters": [{{ "column": "col_name", "value": "val", "operator": "==" | "!=" | ">" | "<" }}] (optional),
        "sort": {{ "column": "x_axis" | "y_axis", "order": "asc" | "desc" }} (optional),
        "limit": int (optional),
        "time_granularity": "day" | "month" | "year" (optional),
        "is_forecast": boolean (optional),
        "forecast_horizon": int (optional),
        "title": "string",
        "key_insights": ["string", "string", "string"]
    }}
    2. Use ONLY column names from the schema.
    3. Choose the best chart type for the data and prompt.
    4. IF the user asks for a specific subset (e.g. "cancelled orders"), USE the "filters" field.
    5. IF the user asks to sort (e.g. "high to low"), USE the "sort" field.
    6. IF the user asks for "top N" or "bottom N", USE the "limit" field (and "sort").
    7. IF the user asks for "monthly" or "yearly" trends on a Date column, SET "time_granularity".
    8. IF the user asks for "future", "prediction", "forecast", "next N months", SET "is_forecast": true AND "forecast_horizon": N.
    9. GENERATE "key_insights": A list of 3-5 short, bullet-point style observations about the data or the chart (e.g. "Sales trend is upward", "Region X has highest profit").
    10. Return ONLY the JSON, no markdown formatting.
    {chart_preference_instruction}

    Examples:
    User: "Show me the trend of sales over time"
    Schema: {{ "columns": {{ "date": "datetime", "sales": "numeric" }} }}
    Output: {{ "chart_type": "line", "x_axis": "date", "y_axis": "sales", "title": "Sales Trend Over Time" }}

    User: "Compare profit by region"
    Schema: {{ "columns": {{ "region": "categorical", "profit": "numeric" }} }}
    Output: {{ "chart_type": "bar", "x_axis": "region", "y_axis": "profit", "aggregation": "sum", "title": "Total Profit by Region" }}

    User: "How many orders are cancelled?"
    Schema: {{ "columns": {{ "status": "categorical", "order_id": "numeric" }} }}
    Output: {{ "chart_type": "bar", "x_axis": "status", "aggregation": "count", "filters": [{{ "column": "status", "value": "Cancelled", "operator": "==" }}], "title": "Cancelled Orders Count" }}
    
    10. INTENT MAPPING:
    - "Distribution" -> Histogram
    - "Relationship" / "Correlation" -> Scatter
    - "Composition" -> Pie
    - "Trend" / "Over time" -> Line
    - "Compare" -> Bar
    
    11. FUZZY MATCHING: If user says "revenue" but column is "sales_amt", USE "sales_amt". Infer synonyms contextually.
    """
    
    max_retries = 1
    timeout = 12 # seconds
    
    for attempt in range(max_retries + 1):
        try:
            # We can't strictly enforce timeout on the library call easily without threads/async, 
            # but Gemini is usually fast. We'll rely on the model response.
            response = model.generate_content(system_prompt)
            
            # Clean up response (remove markdown if present)
            text = response.text.replace("```json", "").replace("```", "").strip()
            spec = json.loads(text)
            
            # FORCE OVERRIDE: If explicit preference, ensure it's set
            if preferred_chart_type:
                spec['chart_type'] = preferred_chart_type
                
            return spec
            
        except Exception as e:
            print(f"AI Attempt {attempt+1} failed: {e}")
            if attempt < max_retries:
                time.sleep(1) # Backoff
            else:
                raise e # Propagate error to trigger fallback
    
    raise TimeoutError("AI generation timed out.")
