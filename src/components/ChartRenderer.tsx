import {
    BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    ScatterChart, Scatter, PieChart, Pie, Cell, Brush
} from 'recharts';
// import { AlertTriangle } from 'lucide-react';

interface ChartRendererProps {
    spec: any;
    data: any[]; // Raw data
}

const COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export function ChartRenderer({ spec, data }: ChartRendererProps) {
    if (!spec || !data) return null;

    const { chart_type, x_axis, y_axis, title, aggregation, category_col } = spec;

    // Pre-process data if needed (e.g. for histogram or specific aggregations if backend didn't do it)
    // For MVP, we assume backend might have sent raw data and frontend *could* aggregate, 
    // BUT the plan assumes AI sends a spec that maps to the *current* dataframe structure.
    // Ideally, the backend should return the *aggregated* data for the chart if the chart requires it.
    // However, `data_processor` just returns the raw file. 
    // Recharts doesn't auto-aggregate. 
    // CRITICAL: The prompt to AI asked for a spec. 
    // If the user asks for "Total sales by region", the AI might say "x=region, y=sales, agg=sum".
    // We need to perform this aggregation here OR in backend.
    // Given the complexity, let's do simple aggregation here in JS if needed, or assume raw data is small enough.
    // Let's implement a simple aggregator.

    const processData = () => {
        let processed = [...data];

        // 1. Filter Data
        if (spec.filters && Array.isArray(spec.filters)) {
            spec.filters.forEach((f: any) => {
                const { column, value, operator } = f;
                if (!column) return;
                processed = processed.filter(row => {
                    const rowVal = row[column];
                    // Simple weak comparison to handle number/string differences
                    if (operator === '==') return rowVal == value;
                    if (operator === '!=') return rowVal != value;
                    if (operator === '>') return rowVal > value;
                    if (operator === '<') return rowVal < value;
                    return true;
                });
            });
        }

        // 2. Aggregate if needed
        // If aggregation is requested via spec OR if we assume implicit aggregation for Bar charts with duplicates
        if (spec.aggregation && x_axis && y_axis) {
            const groups: Record<string, any> = {};
            processed.forEach(row => {
                let key = row[x_axis];

                // Handle Time Granularity
                if (spec.time_granularity && key !== null && key !== undefined) {
                    const numKey = Number(key);
                    const isNum = !isNaN(numKey);

                    if (isNum && numKey < 1000000) { // Heuristic: Small number = relative index (Day 1, 2...)
                        if (spec.time_granularity === 'month') {
                            // Group by 30-day blocks
                            key = `Month ${Math.ceil(numKey / 30)}`;
                        } else if (spec.time_granularity === 'year') {
                            // Group by 365-day blocks
                            key = `Year ${Math.ceil(numKey / 365)}`;
                        }
                    } else {
                        // Standard Date parsing
                        const date = new Date(key);
                        if (!isNaN(date.getTime())) {
                            if (spec.time_granularity === 'month') {
                                // Format: YYYY-MM
                                key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                            } else if (spec.time_granularity === 'year') {
                                key = `${date.getFullYear()}`;
                            }
                        }
                    }
                }

                if (!groups[key]) {
                    groups[key] = { [x_axis]: key, [y_axis]: 0, count: 0 };
                }
                const val = parseFloat(row[y_axis]) || 0;

                if (spec.aggregation === 'sum') groups[key][y_axis] += val;
                if (spec.aggregation === 'count') groups[key][y_axis] += 1; // Count rows
                if (spec.aggregation === 'avg') {
                    groups[key][y_axis] += val;
                    groups[key].count += 1;
                }
                if (spec.aggregation === 'max') groups[key][y_axis] = Math.max(groups[key][y_axis], val);
                if (spec.aggregation === 'min') groups[key][y_axis] = Math.min(groups[key][y_axis], val);
            });

            if (spec.aggregation === 'avg') {
                Object.values(groups).forEach((g: any) => {
                    g[y_axis] = g[y_axis] / g.count;
                });
            }

            processed = Object.values(groups);
        }

        // 3. Sort (Applied to both raw and aggregated data)
        if (spec.sort) {
            const { column, order } = spec.sort;
            const sortKey = column === 'x_axis' ? x_axis : (column === 'y_axis' ? y_axis : column);
            if (sortKey) {
                processed.sort((a: any, b: any) => {
                    const valA = a[sortKey];
                    const valB = b[sortKey];
                    if (valA < valB) return order === 'asc' ? -1 : 1;
                    if (valA > valB) return order === 'asc' ? 1 : -1;
                    return 0;
                });
            }
        } else if (spec.time_granularity) {
            // Default sort for time series if not specified
            processed.sort((a: any, b: any) => {
                // Simple string comparison for YYYY-MM works
                return a[x_axis] < b[x_axis] ? -1 : 1;
            });
        }

        // 4. Limit (Applied to both)
        if (spec.limit) {
            processed = processed.slice(0, spec.limit);
        } else {
            // Default safe limits
            if (chart_type === 'bar') {
                processed = processed.slice(0, 50); // Bars get messy fast
            } else if (chart_type === 'line') {
                processed = processed.slice(0, 2000); // Lines can handle more data (e.g. timeseries)
            } else {
                processed = processed.slice(0, 1000); // Scatter/others
            }
        }

        return processed;
    };

    const chartData = processData();

    // Helper for large numbers
    const formatYAxis = (tick: any) => {
        if (typeof tick === 'number') {
            if (tick >= 1000000) return `${(tick / 1000000).toFixed(1)}M`;
            if (tick >= 1000) return `${(tick / 1000).toFixed(1)}K`;
        }
        return tick;
    };

    // Helper for X Axis (Month check)
    // We only apply this if the MAX value in the data is <= 12. 
    // Otherwise, we get the "sweet bug" (Jan...Dec, 13, 14...)
    const xValues = chartData.map(d => d[x_axis]).filter(v => typeof v === 'number');
    const maxX = xValues.length > 0 ? Math.max(...xValues) : 0;
    const isLikelyMonth = maxX > 0 && maxX <= 12;

    const formatXAxis = (tick: any) => {
        // Check if it looks like a month number (1-12) and we are grouping by date/month
        if (isLikelyMonth && typeof tick === 'number' && tick >= 1 && tick <= 12) {
            const months = ["", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
            return months[tick] || tick;
        }
        return tick;
    };

    // Helper for labels (Tooltip & Legend)
    const formatLabel = (key: string) => {
        if (!key) return '';
        if (key.startsWith('sum of ')) return `Total ${toTitleCase(key.replace('sum of ', ''))}`;
        if (key.startsWith('avg of ')) return `Avg ${toTitleCase(key.replace('avg of ', ''))}`;
        if (key.startsWith('count of ')) return `Count of ${toTitleCase(key.replace('count of ', ''))}`;
        return toTitleCase(key);
    };

    const toTitleCase = (str: string) => {
        return str.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    };

    const renderChart = () => {
        switch (chart_type.toLowerCase()) {
            case 'bar':
            case 'histogram':
                return (
                    <BarChart data={chartData} margin={{ bottom: 180, left: 20, right: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis
                            dataKey={x_axis}
                            tickFormatter={(val) => {
                                if (val === null || val === undefined || val === '') return 'Unknown';
                                const formatted = formatXAxis(val);
                                return typeof formatted === 'string' && formatted.length > 45
                                    ? formatted.substring(0, 45) + '...'
                                    : formatted;
                            }}
                            angle={-90}
                            interval={0}
                            height={180}
                            tick={{ fontSize: 11, textAnchor: 'end', dx: -5 }}
                        />
                        <YAxis tickFormatter={formatYAxis} width={40} />
                        <Tooltip
                            formatter={(value: any, name: any) => [
                                value,
                                `${toTitleCase(spec.y_axis || 'Value')}`
                            ]}
                            labelFormatter={(label) => `${toTitleCase(spec.x_axis || 'Category')}: ${label}`}
                            contentStyle={{ backgroundColor: '#fff', color: '#000', border: '1px solid #ccc' }}
                            itemStyle={{ color: '#000' }}
                            cursor={{ fill: 'transparent' }}
                        />
                        <Legend verticalAlign="top" />
                        <Brush dataKey={x_axis} height={30} stroke="#8884d8" y={550} />
                        <Bar
                            dataKey={y_axis || x_axis}
                            name={formatLabel(aggregation ? `${aggregation} of ${y_axis || 'records'}` : y_axis)}
                            radius={[4, 4, 0, 0]}
                        >
                            {chartData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                        </Bar>
                    </BarChart>
                );
            case 'line':
                return (
                    <LineChart data={chartData} margin={{ bottom: 180, left: 20, right: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis
                            dataKey={x_axis}
                            tickFormatter={(val) => {
                                if (val === null || val === undefined || val === '') return 'Unknown';
                                const formatted = formatXAxis(val);
                                return typeof formatted === 'string' && formatted.length > 45
                                    ? formatted.substring(0, 45) + '...'
                                    : formatted;
                            }}
                            angle={-90}
                            height={180}
                            tick={{ fontSize: 11, textAnchor: 'end', dx: -5 }}
                        />
                        <YAxis tickFormatter={formatYAxis} width={40} />
                        <Tooltip
                            formatter={(value: any, name: any) => [value, formatLabel(String(name))]}
                            labelFormatter={(label) => ` ${label}`}
                            contentStyle={{ backgroundColor: '#fff', color: '#000', border: '1px solid #ccc' }}
                            itemStyle={{ color: '#000' }}
                        />
                        <Legend verticalAlign="top" />
                        <Brush dataKey={x_axis} height={30} stroke="#8884d8" y={550} />
                        <Line
                            type="monotone"
                            dataKey={y_axis}
                            name={formatLabel(aggregation ? `${aggregation} of ${y_axis}` : y_axis)}
                            stroke="#4f46e5"
                            strokeWidth={2}
                            dot={false}
                        />
                    </LineChart>
                );
            case 'scatter':
                return (
                    <ScatterChart>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" dataKey={x_axis} name={x_axis} />
                        <YAxis type="number" dataKey={y_axis} name={y_axis} />
                        <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                        <Legend />
                        <Scatter name={title} data={chartData} fill="#4f46e5" />
                    </ScatterChart>
                );
            case 'pie':
                return (
                    <PieChart>
                        <Pie
                            data={chartData}
                            dataKey={y_axis || 'count'}
                            nameKey={x_axis}
                            cx="50%"
                            cy="50%"
                            outerRadius={100}
                            fill="#4f46e5"
                            label
                        >
                            {chartData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                    </PieChart>
                );
            default:
                return (
                    <div className="flex flex-col items-center justify-center h-full text-gray-400">
                        <div className="text-4xl mb-2">⚠️</div>
                        <p>Unsupported chart type: {chart_type}</p>
                    </div>
                );
        }
    };

    return (
        <div className="w-full h-[600px] mt-4">
            <h3 className="text-center font-semibold text-gray-700 mb-2">{title}</h3>
            <ResponsiveContainer width="100%" height="100%">
                {renderChart()}
            </ResponsiveContainer>
        </div>
    );
}
