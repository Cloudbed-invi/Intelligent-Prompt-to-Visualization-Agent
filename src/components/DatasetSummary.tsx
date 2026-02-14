// import { FileText, Smartphone, Hash, Calendar } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface DatasetSummaryProps {
    summary: any;
    filename: string;
}

export function DatasetSummary({ summary, filename }: DatasetSummaryProps) {
    const [isExpanded, setIsExpanded] = useState(false);
    if (!summary) return null;

    const getIcon = (type: string) => {
        switch (type) {
            case "numeric": return <span className="text-xs">#</span>;
            case "datetime": return <span className="text-xs">📅</span>;
            default: return <span className="text-xs">Aa</span>;
        }
    };

    return (
        <div className="mt-4 p-4 bg-white rounded-xl border border-gray-200 shadow-sm animate-in fade-in slide-in-from-bottom-2">
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-green-100 rounded-md">
                        <span className="text-green-700 text-xs">📄</span>
                    </div>
                    <span className="font-semibold text-gray-800 text-sm truncate max-w-[200px]">{filename}</span>
                </div>
                <div className="text-xs font-medium px-2 py-1 bg-gray-100 rounded-full text-gray-600">
                    {summary.row_count} rows
                </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
                {/* Show only first 6 if not expanded */}
                {(isExpanded ? Object.entries(summary.columns) : Object.entries(summary.columns).slice(0, 6)).map(([col, meta]: [string, any]) => (
                    <div key={col} className="flex items-center justify-between text-xs p-2 bg-gray-50 rounded-md border border-gray-100">
                        <span className="font-medium text-gray-700 truncate max-w-[80px]" title={col}>{col}</span>
                        <span className={cn(
                            "flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider",
                            meta.type === "numeric" ? "bg-blue-100 text-blue-700" :
                                meta.type === "datetime" ? "bg-purple-100 text-purple-700" :
                                    "bg-orange-100 text-orange-700"
                        )}>
                            {getIcon(meta.type)}
                            {meta.type.slice(0, 3)}
                        </span>
                    </div>
                ))}
                {Object.keys(summary.columns).length > 6 && (
                    <button
                        onClick={() => setIsExpanded(!isExpanded)}
                        className="col-span-2 text-center text-xs text-blue-600 hover:text-blue-800 hover:underline mt-1 cursor-pointer transition-colors"
                    >
                        {isExpanded ? "Show Less" : `+ ${Object.keys(summary.columns).length - 6} more columns`}
                    </button>
                )}
            </div>
        </div>
    );
}
