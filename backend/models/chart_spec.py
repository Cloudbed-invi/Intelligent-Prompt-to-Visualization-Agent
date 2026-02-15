from typing import List, Optional, Literal
from pydantic import BaseModel, Field

class ChartSpec(BaseModel):
    chart_type: Literal["bar", "line", "scatter", "histogram", "pie"] = Field(..., description="The type of chart to generate.")
    x_axis: Optional[str] = Field(None, description="The column name for the x-axis.")
    y_axis: Optional[str] = Field(None, description="The column name for the y-axis.")
    group_by: Optional[str] = Field(None, description="The column name to group by.")
    aggregation: Optional[Literal["sum", "avg", "count", "min", "max"]] = Field(None, description="Aggregation method.")
    title: Optional[str] = Field(None, description="Title of the chart.")
    color: Optional[str] = Field(None, description="Column or color code for coloring.")
    filters: Optional[List[dict]] = Field(None, description="List of filters e.g. [{'column': 'status', 'value': 'Cancelled', 'operator': '=='}]")
    sort: Optional[dict] = Field(None, description="Sorting rules e.g. {'column': 'y_axis', 'order': 'desc'}")
    limit: Optional[int] = Field(None, description="Limit the number of results, e.g. 10 for top 10.")
    is_forecast: Optional[bool] = Field(False, description="If true, the chart should project future data points.")
    forecast_horizon: Optional[int] = Field(None, description="Number of future points to project (e.g. 5).")
    insight_summary: Optional[str] = Field(None, description="Short insight summary.")
    key_insights: Optional[List[str]] = Field(None, description="List of key insights.")

class APIResponse(BaseModel):
    status: str
    spec: Optional[ChartSpec] = None
    code: Optional[str] = None
    insights: Optional[str] = None
    warnings: List[dict] = []
