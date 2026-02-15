import pandas as pd
import io

def clean_column_name(col: str) -> str:
    """Sanitize column names: trim, lowercase, replace spaces with underscore."""
    return col.strip().lower().replace(" ", "_")

def get_simplified_dtype(dtype) -> str:
    """Map pandas dtype to simplified types for AI."""
    if pd.api.types.is_numeric_dtype(dtype):
        return "numeric"
    elif pd.api.types.is_datetime64_any_dtype(dtype):
        return "datetime"
    else:
        return "categorical"

def load_data(file_path: str) -> tuple[pd.DataFrame, dict]:
    """
    Load data from file path (CSV, Excel, JSON).
    Returns:
        DataFrame, dict (original_col -> clean_col)
    """
    ext = file_path.split(".")[-1].lower()
    if ext == "csv":
        try:
            df = pd.read_csv(file_path, encoding='utf-8')
        except UnicodeDecodeError:
            # Fallback for Excel-generated CSVs or other encodings
            df = pd.read_csv(file_path, encoding='latin1')
    elif ext in ["xls", "xlsx"]:
        df = pd.read_excel(file_path, engine='openpyxl')
    elif ext == "json":
        df = pd.read_json(file_path)
    else:
        raise ValueError(f"Unsupported file format: {ext}")

    # Create mapping
    original_cols = df.columns.tolist()
    clean_cols = [clean_column_name(c) for c in original_cols]
    col_map = dict(zip(clean_cols, original_cols)) # clean -> original (for display if needed, or reverse?)
    
    # Actually, we want to work with clean cols in backend
    df.columns = clean_cols
    
    # Simple reverse map to show user original names if needed
    # But for AI, we send clean names.
    
    return df, col_map

def get_dataset_summary(df: pd.DataFrame) -> dict:
    """
    Generate summary for AI context.
    """
    columns_summary = {}
    for col in df.columns:
        dtype = get_simplified_dtype(df[col].dtype)
        
        col_info = {
            "type": dtype,
            "samples": df[col].dropna().head(3).tolist()
        }
        
        # Add basic stats for numeric
        if dtype == "numeric":
            try:
                desc = df[col].describe()
                col_info["min"] = float(desc["min"])
                col_info["max"] = float(desc["max"])
                col_info["mean"] = float(desc["mean"])
            except:
                pass
        
        # Add value counts (top 5) for categorical OR low-cardinality numeric (like Store IDs)
        # This helps AI known actual entity IDs
        try:
            if dtype == "categorical" or (dtype == "numeric" and df[col].nunique() < 50):
                vc = df[col].value_counts().head(5).to_dict()
                # Convert keys to string to ensure JSON serializable
                col_info["top_values"] = {str(k): int(v) for k, v in vc.items()}
        except:
            pass
            
        columns_summary[col] = col_info
    
    return {
        "columns": columns_summary,
        "row_count": len(df),
        "column_names": list(columns_summary.keys())
    }
