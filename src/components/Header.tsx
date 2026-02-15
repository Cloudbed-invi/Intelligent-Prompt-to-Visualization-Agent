import { Sparkles } from "lucide-react";

export function Header() {
    return (
        <header className="flex items-center justify-between px-6 py-4 bg-white border-b border-gray-100 shadow-sm">
            <div className="flex items-center gap-2">
                <div className="p-2 bg-indigo-600 rounded-lg">
                    <Sparkles className="w-5 h-5 text-white" />
                </div>
                <div>
                    <h1 className="text-xl font-bold text-gray-900 tracking-tight">Prompt-to-Vis Agent</h1>
                    <p className="text-xs text-gray-500 font-medium">IEEE Hackathon MVP</p>
                </div>
            </div>
            <div className="flex items-center gap-4">
                <a
                    href="https://github.com/Cloudbed-invi/Intelligent-Prompt-to-Visualization-Agent"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors"
                >
                    View Source
                </a>
            </div>
        </header>
    );
}
