import { Sparkles, Sun, Moon } from "lucide-react";

interface HeaderProps {
    darkMode: boolean;
    toggleDarkMode: () => void;
}

export function Header({ darkMode, toggleDarkMode }: HeaderProps) {
    return (
        <header className="flex items-center justify-between px-6 py-4 bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 shadow-sm transition-colors duration-300 sticky top-0 z-50">
            <div className="flex items-center gap-2">
                <div className="p-2 bg-indigo-600 rounded-lg shadow-lg shadow-indigo-500/30">
                    <Sparkles className="w-5 h-5 text-white" />
                </div>
                <div>
                    <h1 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">Prompt-to-Vis Agent</h1>
                    <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">IEEE Hackathon MVP</p>
                </div>
            </div>
            <div className="flex items-center gap-4">
                <button
                    onClick={toggleDarkMode}
                    className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-gray-500 dark:text-gray-400"
                    title="Toggle Dark Mode"
                >
                    {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                </button>
                <a
                    href="https://github.com/Cloudbed-invi/Intelligent-Prompt-to-Visualization-Agent"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                >
                    View Source
                </a>
            </div>
        </header>
    );
}
