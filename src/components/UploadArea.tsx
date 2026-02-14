import { UploadCloud, Loader2 } from "lucide-react";
import { useCallback, useState } from "react";
import { cn } from "@/lib/utils";

interface UploadAreaProps {
    onUpload: (file: File) => Promise<void>;
    isUploading: boolean;
}

export function UploadArea({ onUpload, isUploading }: UploadAreaProps) {
    const [isDragging, setIsDragging] = useState(false);

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            onUpload(e.dataTransfer.files[0]);
        }
    }, [onUpload]);

    const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            onUpload(e.target.files[0]);
        }
    }, [onUpload]);

    if (isUploading) {
        return (
            <div className="flex flex-col items-center justify-center p-12 mt-4 border-2 border-dashed border-gray-200 rounded-xl bg-gray-50/50">
                <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mb-3" />
                <p className="text-sm font-medium text-gray-500">Uploading dataset...</p>
            </div>
        )
    }

    return (
        <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={cn(
                "relative group flex flex-col items-center justify-center p-12 mt-4 transition-all duration-200 border-2 border-dashed rounded-xl cursor-pointer hover:border-indigo-400 hover:bg-indigo-50/30",
                isDragging ? "border-indigo-500 bg-indigo-50" : "border-gray-200 bg-white"
            )}
        >
            <input
                type="file"
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                onChange={handleChange}
                accept=".csv,.xlsx,.xls,.json"
            />

            <div className="p-4 mb-4 bg-indigo-50 rounded-full group-hover:scale-110 transition-transform duration-200">
                <UploadCloud className="w-8 h-8 text-indigo-600" />
            </div>

            <h3 className="text-lg font-semibold text-gray-900">
                Click to upload or drag & drop
            </h3>
            <p className="mt-1 text-sm text-gray-500 max-w-xs text-center">
                Supports CSV, Excel, or JSON. max 10MB.
            </p>
        </div>
    );
}
