import { Trash2, History, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";

interface HistoryItem {
    id: string;
    prompt: string;
    timestamp: number;
    datasetName?: string; // Optional for backward compatibility
    result: any;
}

interface HistoryPanelProps {
    history: HistoryItem[];
    currentDatasetName?: string; // To highlight or filter
    availableDatasets?: string[]; // New prop
    onSelect: (item: HistoryItem) => void;
    onClear: () => void;
    onDelete: (id: string, e: React.MouseEvent) => void;
}

export function HistoryPanel({ history, currentDatasetName, availableDatasets = [], onSelect, onClear, onDelete }: HistoryPanelProps) {
    if (history.length === 0) return null;

    return (
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-4 h-full flex flex-col">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                    <History className="w-4 h-4" /> History
                </h3>
                <button
                    onClick={onClear}
                    className="text-xs text-red-500 hover:text-red-700 hover:underline"
                >
                    Clear All
                </button>
            </div>

            <div className="space-y-2 overflow-y-auto max-h-[400px] pr-1 scrollbar-thin scrollbar-thumb-gray-200">
                {history.map((item) => {
                    const isDifferentDataset = item.datasetName && item.datasetName !== currentDatasetName;
                    const isAvailable = item.datasetName && availableDatasets.includes(item.datasetName);

                    // Allow click if it's the current dataset OR if we have it cached
                    const isClickable = !isDifferentDataset || isAvailable;

                    return (
                        <div
                            key={item.id}
                            onClick={() => isClickable && onSelect(item)}
                            className={cn(
                                "group flex flex-col gap-1 p-3 rounded-lg border border-gray-100 transition-all",
                                isClickable
                                    ? "bg-white hover:bg-indigo-50 hover:border-indigo-100 cursor-pointer active:scale-[0.98] shadow-sm"
                                    : "bg-gray-50 opacity-60 cursor-not-allowed"
                            )}
                            title={!isClickable ? `Dataset missing: ${item.datasetName}. Re-upload to view.` : ""}
                        >
                            <div className="flex justify-between items-start w-full">
                                <span className={cn(
                                    "text-xs font-medium line-clamp-2 pr-6",
                                    !isClickable ? "text-gray-400" : "text-gray-700"
                                )}>
                                    "{item.prompt}"
                                </span>
                                <button
                                    onClick={(e) => onDelete(item.id, e)}
                                    className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-1 -mr-2 -mt-2"
                                >
                                    <Trash2 className="w-3 h-3" />
                                </button>
                            </div>

                            <div className="flex items-center justify-between mt-1.5">
                                <div className="flex flex-col">
                                    <span className="text-[10px] text-gray-400">
                                        {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                    {isDifferentDataset && (
                                        <span className={cn(
                                            "text-[9px] font-medium truncate max-w-[100px]",
                                            isAvailable ? "text-green-600" : "text-orange-500"
                                        )}>
                                            {isAvailable ? "🔄 Switch to " : "⚠️ Missing "}{item.datasetName}
                                        </span>
                                    )}
                                </div>
                                <span className={cn(
                                    "text-[10px] px-1.5 py-0.5 rounded-full font-medium",
                                    !isClickable ? "bg-gray-100 text-gray-400" : "bg-indigo-100 text-indigo-700"
                                )}>
                                    {item.result.spec.chart_type}
                                </span>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
