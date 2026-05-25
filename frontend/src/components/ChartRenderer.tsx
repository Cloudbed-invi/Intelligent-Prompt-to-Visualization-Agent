import {
    BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    ScatterChart, Scatter, PieChart, Pie, Cell, AreaChart, Area, ReferenceArea
} from 'recharts';
import { useState, useMemo, useEffect } from "react";
import { Filter, Eye, EyeOff, BarChart3, LineChart as LineIcon, PieChart as PieIcon, ScatterChart as ScatterIcon, AreaChart as AreaIcon, RotateCcw, ZoomIn } from "lucide-react";
import { cn } from "@/lib/utils";

interface ChartRendererProps {
    spec: any;
    data: any[]; // Raw data
}

const COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16', '#d946ef', '#f97316'];

export function ChartRenderer({ spec, data }: ChartRendererProps) {
    const [hiddenCategories, setHiddenCategories] = useState<Set<string>>(new Set());
    const [currentChartType, setCurrentChartType] = useState<string>("bar");

    // Zoom State
    const [zoomDomain, setZoomDomain] = useState<{ start: number; end: number } | null>(null);
    const [refAreaLeft, setRefAreaLeft] = useState<string | null>(null);
    const [refAreaRight, setRefAreaRight] = useState<string | null>(null);

    // Reset state when data/spec changes
    useEffect(() => {
        setHiddenCategories(new Set());
        setZoomDomain(null);
        setRefAreaLeft(null);
        setRefAreaRight(null);
        if (spec?.chart_type) {
            setCurrentChartType(spec.chart_type.toLowerCase());
        }
    }, [spec, data]);

    if (!spec || !data) return null;

    const { x_axis, y_axis, title, aggregation } = spec;

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

        // 4. Limit based on chart type if not specified
        if (spec.limit) {
            processed = processed.slice(0, spec.limit);
        } else {
            if (currentChartType === 'bar') processed = processed.slice(0, 50);
            else if (currentChartType === 'line' || currentChartType === 'area') processed = processed.slice(0, 2000);
            else processed = processed.slice(0, 1000);
        }

        return processed;
    };

    // Original processed data
    const baseChartData = useMemo(() => processData(), [spec, data, currentChartType]);

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

    // Filtered data (Legend)
    const filteredData = useMemo(() => {
        return baseChartData.filter(d => !hiddenCategories.has(String(d[x_axis])));
    }, [baseChartData, hiddenCategories, x_axis]);

    // Zoomed Data
    const currentData = useMemo(() => {
        if (!zoomDomain) return filteredData;
        return filteredData.slice(zoomDomain.start, zoomDomain.end + 1);
    }, [filteredData, zoomDomain]);


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

    // Zoom Handlers
    const zoom = () => {
        if (refAreaLeft === refAreaRight || refAreaRight === null || refAreaLeft === null) {
            setRefAreaLeft(null);
            setRefAreaRight(null);
            return;
        }

        // Find indices in global filtered data
        let startIndex = filteredData.findIndex(d => String(d[x_axis]) === refAreaLeft);
        let endIndex = filteredData.findIndex(d => String(d[x_axis]) === refAreaRight);

        if (startIndex === -1 || endIndex === -1) {
            setRefAreaLeft(null);
            setRefAreaRight(null);
            return;
        }

        if (startIndex > endIndex) [startIndex, endIndex] = [endIndex, startIndex];

        setZoomDomain({ start: startIndex, end: endIndex });
        setRefAreaLeft(null);
        setRefAreaRight(null);
    };

    const zoomOut = () => {
        setZoomDomain(null);
        setRefAreaLeft(null);
        setRefAreaRight(null);
    };

    const onMouseDown = (e: any) => {
        if (e && e.activeLabel) {
            setRefAreaLeft(e.activeLabel);
        }
    };

    const onMouseMove = (e: any) => {
        if (refAreaLeft && e && e.activeLabel) {
            setRefAreaRight(e.activeLabel);
        }
    };

    const onMouseUp = () => {
        zoom();
    };


    // Helper formatting
    const formatYAxis = (tick: any) => {
        if (typeof tick === 'number') {
            if (tick >= 1000000) return `${(tick / 1000000).toFixed(1)}M`;
            if (tick >= 1000) return `${(tick / 1000).toFixed(1)}K`;
        }
        return tick;
    };

    // X Axis Logic
    const xValues = currentData.map(d => d[x_axis]).filter(v => typeof v === 'number');
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
        // Increased left margin to 60 to prevent first label clip
        const commonMargin = { top: 10, right: 30, left: 60, bottom: 90 };
        const xAxisHeight = 70;

        // Props shared by all charts for zoom
        const zoomProps = {
            onMouseDown,
            onMouseMove,
            onMouseUp,
            data: currentData,
            margin: commonMargin,
        };

        const renderRefArea = () => (
            (refAreaLeft && refAreaRight) ? (
                <ReferenceArea x1={refAreaLeft} x2={refAreaRight} strokeOpacity={0.3} fill="#8884d8" fillOpacity={0.3} />
            ) : null
        );

        switch (currentChartType) {
            case 'bar':
            case 'histogram':
                return (
                    <BarChart {...zoomProps}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis
                            dataKey={x_axis}
                            tickFormatter={formatXAxis}
                            angle={-45}
                            textAnchor="end"
                            height={xAxisHeight}
                            tick={{ fontSize: 11 }}
                            interval={0}
                        />
                        <YAxis tickFormatter={formatYAxis} width={40} />
                        <Tooltip
                            contentStyle={{ backgroundColor: 'var(--color-background)', color: 'var(--color-foreground)', border: '1px solid #ccc' }}
                            itemStyle={{ color: 'var(--color-foreground)' }}
                        />
                        <Bar
                            dataKey={y_axis || x_axis}
                            name={formatLabel(aggregation ? `${aggregation} of ${y_axis || 'records'}` : y_axis)}
                            radius={[4, 4, 0, 0]}
                        >
                            {currentData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={colorMap[String(entry[x_axis])] || '#4f46e5'} />
                            ))}
                        </Bar>
                        {renderRefArea()}
                    </BarChart>
                );
            case 'line':
                return (
                    <LineChart {...zoomProps}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis
                            dataKey={x_axis}
                            tickFormatter={formatXAxis}
                            angle={-45}
                            textAnchor="end"
                            height={xAxisHeight}
                            tick={{ fontSize: 11 }}
                            interval={0}
                        />
                        <YAxis tickFormatter={formatYAxis} width={40} />
                        <Tooltip contentStyle={{ backgroundColor: 'var(--color-background)', color: 'var(--color-foreground)' }} />
                        <Line type="monotone" dataKey={y_axis} stroke="#4f46e5" strokeWidth={2} dot={false} />
                        {renderRefArea()}
                    </LineChart>
                );
            case 'area':
                return (
                    <AreaChart {...zoomProps}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis
                            dataKey={x_axis}
                            tickFormatter={formatXAxis}
                            angle={-45}
                            textAnchor="end"
                            height={xAxisHeight}
                            tick={{ fontSize: 11 }}
                            interval={0}
                        />
                        <YAxis tickFormatter={formatYAxis} width={40} />
                        <Tooltip contentStyle={{ backgroundColor: 'var(--color-background)', color: 'var(--color-foreground)' }} />
                        <Area type="monotone" dataKey={y_axis} stroke="#4f46e5" fill="#4f46e5" fillOpacity={0.3} />
                        {renderRefArea()}
                    </AreaChart>
                );
            // Pie and Scatter don't support X-axis zoom well in this implementation, keep standard
            case 'pie':
                return (
                    <PieChart margin={{ top: 10, right: 30, left: 60, bottom: 40 }}>
                        <Pie
                            data={currentData}
                            dataKey={y_axis || 'count'}
                            nameKey={x_axis}
                            cx="50%"
                            cy="50%"
                            outerRadius={140}
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
                    <ScatterChart margin={{ top: 10, right: 30, left: 60, bottom: 90 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis
                            type="number"
                            dataKey={x_axis}
                            name={x_axis}
                            height={xAxisHeight}
                            angle={-45}
                            textAnchor="end"
                        />
                        <YAxis type="number" dataKey={y_axis} name={y_axis} />
                        <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                        <Scatter name={title} data={currentData} fill="#4f46e5" />
                    </ScatterChart>
                );
            default:
                return <div className="p-10 text-center">Unsupported chart: {currentChartType}</div>;
        }
    };

    const chartOptions = [
        { id: 'bar', label: 'Bar', icon: BarChart3 },
        { id: 'line', label: 'Line', icon: LineIcon },
        { id: 'area', label: 'Area', icon: AreaIcon },
        { id: 'pie', label: 'Pie', icon: PieIcon },
        { id: 'scatter', label: 'Scatter', icon: ScatterIcon },
    ];

    return (
        <div className="w-full flex flex-col items-center">
            {/* Chart Type Selector Toolbar */}
            <div className="flex items-center gap-2 mb-4 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg relative">
                {chartOptions.map((opt) => (
                    <button
                        key={opt.id}
                        onClick={() => setCurrentChartType(opt.id)}
                        className={cn(
                            "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all",
                            currentChartType === opt.id
                                ? "bg-white dark:bg-gray-700 text-indigo-600 dark:text-indigo-400 shadow-sm"
                                : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700"
                        )}
                        title={`Switch to ${opt.label} Chart`}
                    >
                        <opt.icon className="w-3.5 h-3.5" />
                        {opt.label}
                    </button>
                ))}

                {/* Visual Reset Zoom Button */}
                {zoomDomain && (
                    <button
                        onClick={zoomOut}
                        className="ml-4 flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-indigo-50 text-indigo-600 hover:bg-indigo-100 dark:bg-indigo-900/30 dark:text-indigo-400 dark:hover:bg-indigo-900/50 transition-all border border-indigo-200 dark:border-indigo-800"
                        title="Right click on chart also resets zoom"
                    >
                        <RotateCcw className="w-3.5 h-3.5" />
                        Reset Zoom
                    </button>
                )}
            </div>

            <h3 className="text-center font-semibold text-gray-700 dark:text-gray-200 mb-2">{title}</h3>

            {/* Chart Container - Added onContextMenu for Right Click Reset */}
            <div
                className="w-full h-[550px] select-none"
                onContextMenu={(e) => {
                    e.preventDefault();
                    zoomOut();
                }}
            >
                <ResponsiveContainer width="100%" height="100%">
                    {renderChart()}
                </ResponsiveContainer>
            </div>

            {/* Instructions for Zoom */}
            <div className="text-[10px] text-gray-400 dark:text-gray-500 mt-[-10px] mb-4 text-center">
                {['bar', 'line', 'area'].includes(currentChartType) && (
                    <span>
                        <ZoomIn className="inline w-3 h-3 mr-1" />
                        Drag to zoom • Right-click to reset
                    </span>
                )}
            </div>

            {/* Custom Interactive Legend / Filter */}
            <div className="w-full bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 border border-gray-100 dark:border-gray-700">
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
