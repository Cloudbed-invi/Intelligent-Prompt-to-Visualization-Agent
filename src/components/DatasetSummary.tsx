import { FileText, Smartphone, Hash, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";

interface DatasetSummaryProps {
    summary: any;
    filename: string;
}

export function DatasetSummary({ summary, filename }: DatasetSummaryProps) {
    if (!summary) return null;

    const getIcon = (type: string) => {
        switch (type) {
            case "numeric": return <Hash className="w-3 h-3" />;
            case "datetime": return <Calendar className="w-3 h-3" />;
            default: return <FileText className="w-3 h-3" />;
        }
    };

    return (
        <div className="mt-4 p-4 bg-white rounded-xl border border-gray-200 shadow-sm animate-in fade-in slide-in-from-bottom-2">
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-green-100 rounded-md">
                        <FileText className="w-4 h-4 text-green-700" />
                    </div>
                    <span className="font-semibold text-gray-800 text-sm truncate max-w-[200px]">{filename}</span>
                </div>
                <div className="text-xs font-medium px-2 py-1 bg-gray-100 rounded-full text-gray-600">
                    {summary.row_count} rows
                </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
                {Object.entries(summary.columns).slice(0, 6).map(([col, meta]: [string, any]) => (
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
                    <div className="col-span-2 text-center text-xs text-gray-400 italic mt-1">
                        + {Object.keys(summary.columns).length - 6} more columns
                    </div>
                )}
            </div>
        </div>
    );
}
