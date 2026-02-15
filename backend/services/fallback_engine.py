from models.chart_spec import ChartSpec

def generate_fallback_spec(df_summary: dict, prompt: str = "") -> dict:
    """
    Generate a deterministic chart spec based on available data types.
    Priority:
    1. Keyword Match: If prompt contains column names, use them.
    2. Heuristic: 
       - datetime + numeric -> Line
       - categorical + numeric -> Bar
       - two numeric -> Scatter
       - single numeric -> Histogram
       - categorical -> Bar (Count)
    """
    cols = df_summary["columns"]
    col_names = list(cols.keys())
    
    # helper to find col in prompt
    def find_col_in_prompt(c_list):
        for c in c_list:
            # simple substring match, case insensitive
            if c.lower() in prompt.lower():
                return c
        return None

    numeric_cols = [c for c, meta in cols.items() if meta["type"] == "numeric"]
    datetime_cols = [c for c, meta in cols.items() if meta["type"] == "datetime"]
    categorical_cols = [c for c, meta in cols.items() if meta["type"] == "categorical"]
    
    # Attempt to find mentioned columns
    mentioned_num = find_col_in_prompt(numeric_cols)
    mentioned_cat = find_col_in_prompt(categorical_cols)
    mentioned_date = find_col_in_prompt(datetime_cols)
    
    # Overwrite default choices if mentioned
    target_num = mentioned_num if mentioned_num else (numeric_cols[0] if numeric_cols else None)
    target_cat = mentioned_cat if mentioned_cat else (categorical_cols[0] if categorical_cols else None)
    target_date = mentioned_date if mentioned_date else (datetime_cols[0] if datetime_cols else None)

    spec = {
        "title": "Data Overview",
        "insight_summary": "Auto-generated visualization based on data structure."
    }

    # 1. Line Chart (Date + Numeric)
    if target_date and target_num:
        spec.update({
            "chart_type": "line",
            "x_axis": target_date,
            "y_axis": target_num,
            "title": f"{target_num} over Time"
        })
        return spec

    # 2. Bar Chart (Cat + Numeric)
    if target_cat and target_num:
        spec.update({
            "chart_type": "bar",
            "x_axis": target_cat,
            "y_axis": target_num,
            "aggregation": "sum",
            "title": f"Total {target_num} by {target_cat}"
        })
        return spec

    # 3. Scatter (Num + Num)
    # If 2 numeric mentioned, use them. Else if 1 mentioned + 1 default
    if len(numeric_cols) >= 2:
        x_col = target_num
        y_col = numeric_cols[1] if numeric_cols[1] != x_col else numeric_cols[0]
        # If user mentioned two different ones, try to find them (simplified)
        
        spec.update({
            "chart_type": "scatter",
            "x_axis": x_col,
            "y_axis": y_col,
            "title": f"{y_col} vs {x_col}"
        })
        return spec

    # 4. Histogram (Single Num)
    if target_num:
        spec.update({
            "chart_type": "histogram",
            "x_axis": target_num,
            "title": f"Distribution of {target_num}"
        })
        return spec

    # 5. Count Bar (Categorical)
    if target_cat:
        spec.update({
            "chart_type": "bar",
            "x_axis": target_cat,
            "aggregation": "count",
            "title": f"Count of {target_cat}"
        })
        return spec

    return {} # Should not happen if data exists
