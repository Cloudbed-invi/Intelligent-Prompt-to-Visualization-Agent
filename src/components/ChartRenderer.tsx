import {
    BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    ScatterChart, Scatter, PieChart, Pie, Cell, Brush
} from 'recharts';
import { useState, useMemo, useEffect } from "react";
import { Filter, Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";

interface ChartRendererProps {
    spec: any;
    data: any[]; // Raw data
}

const COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16', '#d946ef', '#f97316'];

export function ChartRenderer({ spec, data }: ChartRendererProps) {
    const [hiddenCategories, setHiddenCategories] = useState<Set<string>>(new Set());
    // Reset filter when data/spec changes
    useEffect(() => {
        setHiddenCategories(new Set());
    }, [spec, data]);

    if (!spec || !data) return null;

    const { chart_type, x_axis, y_axis, title, aggregation } = spec;

    // --- Data Processing ---
    const processData = () => {
        let processed = [...data];

        // 1. Filter Data (Spec filters)
        if (spec.filters && Array.isArray(spec.filters)) {
            spec.filters.forEach((f: any) => {
                const { column, value, operator } = f;
                if (!column) return;
                processed = processed.filter(row => {
                    const rowVal = row[column];
                    if (operator === '==') return rowVal == value;
                    if (operator === '!=') return rowVal != value;
                    if (operator === '>') return rowVal > value;
                    if (operator === '<') return rowVal < value;
                    return true;
                });
            });
        }

        // 2. Aggregate
        if (spec.aggregation && x_axis && y_axis) {
            const groups: Record<string, any> = {};
            processed.forEach(row => {
                let key = row[x_axis];

                // Time Granularity Logic
                if (spec.time_granularity && key !== null && key !== undefined) {
                    const numKey = Number(key);
                    const isNum = !isNaN(numKey);
                    if (isNum && numKey < 1000000) {
                        if (spec.time_granularity === 'month') key = `Month ${Math.ceil(numKey / 30)}`;
                        else if (spec.time_granularity === 'year') key = `Year ${Math.ceil(numKey / 365)}`;
                    } else {
                        const date = new Date(key);
                        if (!isNaN(date.getTime())) {
                            if (spec.time_granularity === 'month') key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                            else if (spec.time_granularity === 'year') key = `${date.getFullYear()}`;
                        }
                    }
                }

                if (!groups[key]) groups[key] = { [x_axis]: key, [y_axis]: 0, count: 0 };
                const val = parseFloat(row[y_axis]) || 0;

                if (spec.aggregation === 'sum') groups[key][y_axis] += val;
                if (spec.aggregation === 'count') groups[key][y_axis] += 1;
                if (spec.aggregation === 'avg') { groups[key][y_axis] += val; groups[key].count += 1; }
                if (spec.aggregation === 'max') groups[key][y_axis] = Math.max(groups[key][y_axis], val);
                if (spec.aggregation === 'min') groups[key][y_axis] = Math.min(groups[key][y_axis], val);
            });

            if (spec.aggregation === 'avg') {
                Object.values(groups).forEach((g: any) => { g[y_axis] = g[y_axis] / g.count; });
            }
            processed = Object.values(groups);
        }

        // 3. Sort
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
            processed.sort((a: any, b: any) => a[x_axis] < b[x_axis] ? -1 : 1);
        }

        // 4. Limit
        if (spec.limit) {
            processed = processed.slice(0, spec.limit);
        } else {
            if (chart_type === 'bar') processed = processed.slice(0, 50);
            else if (chart_type === 'line') processed = processed.slice(0, 2000);
            else processed = processed.slice(0, 1000);
        }

        return processed;
    };

    // Original processed data
    const baseChartData = useMemo(() => processData(), [spec, data]);

    // Extract Categories
    const categories = useMemo(() => {
        return baseChartData.map(d => String(d[x_axis]));
    }, [baseChartData, x_axis]);

    // Map category -> color
    const colorMap = useMemo(() => {
        const map: Record<string, string> = {};
        categories.forEach((cat, i) => {
            map[cat] = COLORS[i % COLORS.length];
        });
        return map;
    }, [categories]);

    // Filtered data
    const filteredData = useMemo(() => {
        return baseChartData.filter(d => !hiddenCategories.has(String(d[x_axis])));
    }, [baseChartData, hiddenCategories, x_axis]);


    // --- Interaction Handlers ---
    const toggleCategory = (cat: string) => {
        const newHidden = new Set(hiddenCategories);
        if (newHidden.has(cat)) {
            newHidden.delete(cat);
        } else {
            newHidden.add(cat);
        }
        setHiddenCategories(newHidden);
    };

    const toggleAll = () => {
        if (hiddenCategories.size > 0) {
            setHiddenCategories(new Set()); // Show all
        } else {
            const all = new Set(categories);
            setHiddenCategories(all);
        }
    };

    // Helper formatting
    const formatYAxis = (tick: any) => {
        if (typeof tick === 'number') {
            if (tick >= 1000000) return `${(tick / 1000000).toFixed(1)}M`;
            if (tick >= 1000) return `${(tick / 1000).toFixed(1)}K`;
        }
        return tick;
    };

    const xValues = filteredData.map(d => d[x_axis]).filter(v => typeof v === 'number');
    const maxX = xValues.length > 0 ? Math.max(...xValues) : 0;
    const isLikelyMonth = maxX > 0 && maxX <= 12;

    const formatXAxis = (tick: any) => {
        if (isLikelyMonth && typeof tick === 'number' && tick >= 1 && tick <= 12) {
            const months = ["", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
            return months[tick] || tick;
        }
        return tick;
    };

    const toTitleCase = (str: string) => str.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    const formatLabel = (key: string) => {
        if (!key) return '';
        if (key.startsWith('sum of ')) return `Total ${toTitleCase(key.replace('sum of ', ''))}`;
        if (key.startsWith('avg of ')) return `Avg ${toTitleCase(key.replace('avg of ', ''))}`;
        return toTitleCase(key);
    };

    const renderChart = () => {
        const currentData = filteredData;

        switch (chart_type.toLowerCase()) {
            case 'bar':
            case 'histogram':
                return (
                    <BarChart data={currentData} margin={{ bottom: 20, left: 20, right: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis
                            dataKey={x_axis}
                            tickFormatter={formatXAxis}
                            angle={-45}
                            textAnchor="end"
                            height={60}
                            tick={{ fontSize: 11 }}
                            interval={0}
                        />
                        <YAxis tickFormatter={formatYAxis} width={40} />
                        <Tooltip
                            contentStyle={{ backgroundColor: 'var(--color-background)', color: 'var(--color-foreground)', border: '1px solid #ccc' }}
                            itemStyle={{ color: 'var(--color-foreground)' }}
                        />
                        <Brush dataKey={x_axis} height={30} stroke="#8884d8" y={350} />
                        <Bar
                            dataKey={y_axis || x_axis}
                            name={formatLabel(aggregation ? `${aggregation} of ${y_axis || 'records'}` : y_axis)}
                            radius={[4, 4, 0, 0]}
                        >
                            {currentData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={colorMap[String(entry[x_axis])] || '#4f46e5'} />
                            ))}
                        </Bar>
                    </BarChart>
                );
            case 'line':
                return (
                    <LineChart data={currentData} margin={{ bottom: 20, left: 20, right: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey={x_axis} tickFormatter={formatXAxis} />
                        <YAxis tickFormatter={formatYAxis} width={40} />
                        <Tooltip contentStyle={{ backgroundColor: 'var(--color-background)', color: 'var(--color-foreground)' }} />
                        <Brush dataKey={x_axis} height={30} stroke="#8884d8" />
                        <Line type="monotone" dataKey={y_axis} stroke="#4f46e5" strokeWidth={2} dot={false} />
                    </LineChart>
                );
            case 'pie':
                return (
                    <PieChart>
                        <Pie
                            data={currentData}
                            dataKey={y_axis || 'count'}
                            nameKey={x_axis}
                            cx="50%"
                            cy="50%"
                            outerRadius={100}
                            fill="#4f46e5"
                            label
                        >
                            {currentData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={colorMap[String(entry[x_axis])] || COLORS[index % COLORS.length]} />
                            ))}
                        </Pie>
                        <Tooltip contentStyle={{ backgroundColor: 'var(--color-background)', color: 'var(--color-foreground)' }} />
                    </PieChart>
                );
            case 'scatter':
                return (
                    <ScatterChart>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" dataKey={x_axis} name={x_axis} />
                        <YAxis type="number" dataKey={y_axis} name={y_axis} />
                        <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                        <Scatter name={title} data={currentData} fill="#4f46e5" />
                    </ScatterChart>
                );
            default:
                return <div className="p-10 text-center">Unsupported chart: {chart_type}</div>;
        }
    };

    return (
        <div className="w-full flex flex-col items-center">
            <h3 className="text-center font-semibold text-gray-700 dark:text-gray-200 mb-4">{title}</h3>

            {/* Chart Container */}
            <div className="w-full h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                    {renderChart()}
                </ResponsiveContainer>
            </div>

            {/* Custom Interactive Legend / Filter */}
            <div className="w-full mt-6 bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 border border-gray-100 dark:border-gray-700">
                <div className="flex items-center justify-between mb-3 border-b border-gray-200 dark:border-gray-700 pb-2">
                    <div className="flex items-center gap-2">
                        <Filter className="w-4 h-4 text-indigo-500" />
                        <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">Interactive Legend</span>
                        <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
                            ({filteredData.length} visible)
                        </span>
                    </div>
                    <button
                        onClick={toggleAll}
                        className="text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 font-medium px-2 py-1 rounded hover:bg-indigo-50 dark:hover:bg-gray-700"
                    >
                        {hiddenCategories.size === 0 ? "Hide All" : "Show All"}
                    </button>
                </div>

                <div className="flex flex-wrap gap-2 max-h-[120px] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-200 dark:scrollbar-thumb-gray-600 pr-2">
                    {categories.map((cat, i) => {
                        const isHidden = hiddenCategories.has(cat);
                        const color = colorMap[cat] || COLORS[i % COLORS.length];

                        return (
                            <button
                                key={cat}
                                onClick={() => toggleCategory(cat)}
                                className={cn(
                                    "flex items-center gap-2 px-2.5 py-1.5 rounded-full border text-xs font-medium transition-all duration-200",
                                    isHidden
                                        ? "bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-400 dark:text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700"
                                        : "bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-200 shadow-sm hover:border-indigo-300 dark:hover:border-indigo-500"
                                )}
                                title={cat}
                            >
                                <span
                                    className={cn("w-2.5 h-2.5 rounded-full shadow-sm", isHidden && "grayscale opacity-50")}
                                    style={{ backgroundColor: color }}
                                />
                                <span className={cn("truncate max-w-[150px]", isHidden && "line-through opacity-70")}>
                                    {cat || "Unknown"}
                                </span>
                                {isHidden ? <EyeOff className="w-3 h-3 text-gray-400" /> : <Eye className="w-3 h-3 text-gray-400 opacity-0 group-hover:opacity-100" />}
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
