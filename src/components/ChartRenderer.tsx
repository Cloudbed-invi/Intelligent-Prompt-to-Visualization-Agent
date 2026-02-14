import {
    BarChart, Bar, LineChart, Line, XAxis, YAxis, Cartwright, Tooltip, Legend, ResponsiveContainer,
    ScatterChart, Scatter, PieChart, Pie, Cell
} from 'recharts';
import { AlertTriangle } from 'lucide-react';

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
        if (spec.aggregation && x_axis && y_axis) {
            // Simple GroupBy & Sum/Count/Avg
            const groups: Record<string, any> = {};
            data.forEach(row => {
                const key = row[x_axis];
                if (!groups[key]) {
                    groups[key] = { [x_axis]: key, [y_axis]: 0, count: 0 };
                    // Preserve other cols? No, just needed ones.
                }
                const val = parseFloat(row[y_axis]) || 0;

                if (spec.aggregation === 'sum') groups[key][y_axis] += val;
                if (spec.aggregation === 'count') groups[key][y_axis] += 1;
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

            return Object.values(groups);
        }
        return data.slice(0, 500); // Limit points for scatter/raw
    };

    const chartData = processData();

    const renderChart = () => {
        switch (chart_type.toLowerCase()) {
            case 'bar':
                return (
                    <BarChart data={chartData}>
                        <XAxis dataKey={x_axis} />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey={y_axis || 'count'} fill="#4f46e5" radius={[4, 4, 0, 0]} />
                    </BarChart>
                );
            case 'line':
                return (
                    <LineChart data={chartData}>
                        <XAxis dataKey={x_axis} />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Line type="monotone" dataKey={y_axis} stroke="#4f46e5" strokeWidth={2} dot={false} />
                    </LineChart>
                );
            case 'scatter':
                return (
                    <ScatterChart>
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
                        <AlertTriangle className="w-8 h-8 mb-2" />
                        <p>Unsupported chart type: {chart_type}</p>
                    </div>
                );
        }
    };

    return (
        <div className="w-full h-[400px] mt-4">
            <h3 className="text-center font-semibold text-gray-700 mb-2">{title}</h3>
            <ResponsiveContainer width="100%" height="100%">
                {renderChart()}
            </ResponsiveContainer>
        </div>
    );
}
