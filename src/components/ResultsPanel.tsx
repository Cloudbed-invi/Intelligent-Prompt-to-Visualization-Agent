import { useState } from "react";
import { BarChart3, Code, Lightbulb, Copy, Check, Download } from "lucide-react";
import { ChartRenderer } from "./ChartRenderer";
import { cn } from "@/lib/utils";
import ReactMarkdown from 'react-markdown'; // Optional, but for now simple text

interface ResultsPanelProps {
    data: any[];
    result: any;
    isLoading: boolean;
}

export function ResultsPanel({ data, result, isLoading }: ResultsPanelProps) {
    const [activeTab, setActiveTab] = useState<"chart" | "code" | "insights">("chart");
    const [copied, setCopied] = useState(false);

    // Helper to copy code
    const copyCode = () => {
        if (result?.code) {
            navigator.clipboard.writeText(result.code);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    if (isLoading) {
        return (
            <div className="mt-8 space-y-4 animate-pulse">
                <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
                <div className="h-[300px] bg-gray-100 rounded-xl"></div>
                <div className="h-20 bg-gray-100 rounded-xl"></div>
            </div>
        );
    }

    if (!result) {
        return (
            <div className="mt-12 text-center text-gray-400 dark:text-gray-500">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-50 dark:bg-gray-800 mb-4">
                    <BarChart3 className="w-8 h-8 text-gray-300 dark:text-gray-600" />
                </div>
                <p className="text-lg font-medium text-gray-500 dark:text-gray-400">Upload a dataset and describe what you want to visualize.</p>
            </div>
        );
    }

    return (
        <div className="mt-8 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm overflow-hidden transition-colors">
            {/* Warnings */}
            {result.warnings && result.warnings.length > 0 && (
                <div className="bg-yellow-50 border-b border-yellow-100 px-4 py-2">
                    {result.warnings.map((w: any, i: number) => (
                        <div key={i} className="text-xs text-yellow-700 flex items-center gap-2">
                            <span className="font-bold uppercase tracking-wider text-[10px]">{w.type}</span>
                            {w.message}
                        </div>
                    ))}
                </div>
            )}

            {/* Tabs */}
            <div className="flex border-b border-gray-100 dark:border-gray-700">
                <button
                    onClick={() => setActiveTab("chart")}
                    className={cn(
                        "flex items-center gap-2 px-6 py-3 text-sm font-medium transition-colors border-b-2",
                        activeTab === "chart"
                            ? "border-indigo-600 text-indigo-600 bg-indigo-50/50 dark:bg-indigo-900/20 dark:text-indigo-400"
                            : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700"
                    )}
                >
                    <BarChart3 className="w-4 h-4" /> Chart
                </button>
                <button
                    onClick={() => setActiveTab("code")}
                    className={cn(
                        "flex items-center gap-2 px-6 py-3 text-sm font-medium transition-colors border-b-2",
                        activeTab === "code"
                            ? "border-indigo-600 text-indigo-600 bg-indigo-50/50 dark:bg-indigo-900/20 dark:text-indigo-400"
                            : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700"
                    )}
                >
                    <Code className="w-4 h-4" /> Code
                </button>
                <button
                    onClick={() => setActiveTab("insights")}
                    className={cn(
                        "flex items-center gap-2 px-6 py-3 text-sm font-medium transition-colors border-b-2",
                        activeTab === "insights"
                            ? "border-indigo-600 text-indigo-600 bg-indigo-50/50 dark:bg-indigo-900/20 dark:text-indigo-400"
                            : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700"
                    )}
                >
                    <Lightbulb className="w-4 h-4" /> Insights
                </button>
            </div>

            {/* Content */}
            <div className="p-6">
                {activeTab === "chart" && (
                    <ChartRenderer spec={result.spec} data={data} />
                )}

                {activeTab === "code" && (
                    <div className="relative">
                        <div className="absolute right-2 top-2 z-10">
                            <button onClick={copyCode} className="p-2 bg-white/90 dark:bg-gray-800/90 border border-gray-200 dark:border-gray-600 rounded-md shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-all">
                                {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4 text-gray-500 dark:text-gray-400" />}
                            </button>
                        </div>
                        <pre className="p-4 bg-gray-900 text-gray-100 rounded-lg overflow-x-auto text-sm font-mono">
                            {result.code}
                        </pre>
                    </div>
                )}

                {activeTab === "insights" && (
                    <div className="space-y-4">
                        <h3 className="text-gray-900 dark:text-gray-100 font-semibold mb-2 flex items-center gap-2">
                            <Lightbulb className="w-5 h-5 text-yellow-500" />
                            AI Analysis
                        </h3>

                        {result.spec?.key_insights && result.spec.key_insights.length > 0 ? (
                            <ul className="space-y-3">
                                {result.spec.key_insights.map((insight: string, i: number) => (
                                    <li key={i} className="flex gap-3 text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-700/50 p-3 rounded-lg border border-gray-100 dark:border-gray-700">
                                        <span className="text-indigo-500 dark:text-indigo-400 font-bold">•</span>
                                        {insight}
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="text-gray-600 dark:text-gray-400">{result.insights || result.spec?.insight_summary || "No specific insights generated."}</p>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
