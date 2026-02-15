import { Send, Sparkles } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";

interface PromptInputProps {
    onSubmit: (prompt: string) => void;
    isProcessing: boolean;
    disabled: boolean;
}

const EXAMPLES = [
    "Show sales trend over time",
    "Compare revenue by region",
    "Distribution of age",
    "Top 5 products by profit"
];

export function PromptInput({ onSubmit, isProcessing, disabled }: PromptInputProps) {
    const [prompt, setPrompt] = useState("");
    const inputRef = useRef<HTMLTextAreaElement>(null);

    const handleSubmit = () => {
        if (!prompt.trim() || isProcessing) return;
        onSubmit(prompt);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSubmit();
        }
    };

    return (
        <div className={cn("mt-6 transition-opacity duration-300", disabled ? "opacity-50 pointer-events-none" : "opacity-100")}>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Describe your visualization
            </label>

            <div className="relative group">
                <textarea
                    ref={inputRef}
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="e.g., Show me the total sales per region as a bar chart..."
                    rows={3}
                    className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none transition-shadow text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500"
                    disabled={disabled || isProcessing}
                />
                <button
                    onClick={handleSubmit}
                    disabled={!prompt.trim() || isProcessing}
                    className="absolute bottom-3 right-3 p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95 shadow-md"
                >
                    {isProcessing ? (
                        <span className="w-5 h-5 block border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                        <Send className="w-4 h-4" />
                    )}
                </button>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
                <span className="text-xs font-medium text-gray-400 py-1">Try:</span>
                {EXAMPLES.map((ex) => (
                    <button
                        key={ex}
                        onClick={() => {
                            setPrompt(ex);
                            // Optional: auto-submit? No, let user confirm.
                            inputRef.current?.focus();
                        }}
                        className="text-xs bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 px-2.5 py-1 rounded-full hover:bg-indigo-50 dark:hover:bg-gray-700 hover:text-indigo-600 dark:hover:text-white hover:border-indigo-200 dark:hover:border-gray-600 transition-colors flex items-center gap-1"
                    >
                        <Sparkles className="w-3 h-3" />
                        {ex}
                    </button>
                ))}
            </div>
        </div>
    );
}
