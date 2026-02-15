from models.chart_spec import ChartSpec

def normalize_chart_type(chart_type: str) -> str:
    """Fix common LLM misnomers."""
    ct = chart_type.lower().strip()
    mapping = {
        "barchart": "bar",
        "linechart": "line",
        "scatterplot": "scatter",
        "piechart": "pie",
        "histogram": "histogram"
    }
    return mapping.get(ct, ct)

def validate_spec(spec: dict, df_columns: list) -> tuple[dict, list]:
    """
    Validate and fix spec.
    Returns: fixed_spec (dict), warnings (list)
    """
    warnings = []
    
    # 1. Normalize chart type
    if "chart_type" in spec:
        spec["chart_type"] = normalize_chart_type(spec["chart_type"])
    
    # 2. Check columns existence
    # Fields that verify against columns
    col_fields = ["x_axis", "y_axis", "group_by", "color"]
    
    for field in col_fields:
        if field in spec and spec[field]:
            col = spec[field]
            if col not in df_columns:
                warnings.append({
                    "type": "column_not_found",
                    "message": f"Column '{col}' not found in dataset. Removed from spec."
                })
                spec[field] = None # Invalidate field
    
    # 3. Validation Logic (Simple)
    # E.g. Histogram needs numerical x_axis
    
    # Return as dict to be Pydantic-validated later or just used
    return spec, warnings
