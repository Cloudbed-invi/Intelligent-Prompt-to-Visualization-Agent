"use client";

import { useState, useEffect } from "react";
import { Header } from "@/components/Header";
import { UploadArea } from "@/components/UploadArea";
import { DatasetSummary } from "@/components/DatasetSummary";
import { PromptInput } from "@/components/PromptInput";
import { ResultsPanel } from "@/components/ResultsPanel";
import { HistoryPanel } from "@/components/HistoryPanel";
import { uploadDataset, generateVisualization, UploadResponse, QueryResponse } from "@/lib/api";

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [uploadInfo, setUploadInfo] = useState<UploadResponse | null>(null);
  const [datasetData, setDatasetData] = useState<any[]>([]);
  const [queryResult, setQueryResult] = useState<QueryResponse | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // History State
  const [history, setHistory] = useState<any[]>([]);
  // Dataset Cache (filename -> data[]) to support switching
  const [datasetsCache, setDatasetsCache] = useState<Record<string, any[]>>({});

  const [chartType, setChartType] = useState('bar');

  // Load state from localStorage on mount
  useEffect(() => {
    try {
      const savedHistory = localStorage.getItem("chartHistory");
      if (savedHistory) setHistory(JSON.parse(savedHistory));

      const savedUploadInfo = localStorage.getItem("uploadInfo");
      if (savedUploadInfo) setUploadInfo(JSON.parse(savedUploadInfo));

      const savedDataset = localStorage.getItem("datasetData");
      if (savedDataset) setDatasetData(JSON.parse(savedDataset));

      // Load Dataset Cache
      const savedCache = localStorage.getItem("datasetsCache");
      if (savedCache) setDatasetsCache(JSON.parse(savedCache));

    } catch (e) {
      console.error("Failed to load session", e);
    }
  }, []);

  // Save history
  useEffect(() => {
    localStorage.setItem("chartHistory", JSON.stringify(history));
  }, [history]);

  // Save session & Cache
  useEffect(() => {
    if (uploadInfo) localStorage.setItem("uploadInfo", JSON.stringify(uploadInfo));

    // Save current active dataset
    if (datasetData.length > 0) {
      localStorage.setItem("datasetData", JSON.stringify(datasetData));

      // Sync to cache if not present (ensures switching works even for pre-cache feature datasets)
      if (uploadInfo && (!datasetsCache[uploadInfo.filename] || datasetsCache[uploadInfo.filename].length !== datasetData.length)) {
        setDatasetsCache(prev => {
          const newCache = { ...prev, [uploadInfo.filename]: datasetData };
          // Also persist cache immediately here to avoid race? No, let the effect below handle it or just rely on state.
          return newCache;
        });
      }
    }

    // Save cache (debounced slightly by React render cycle, but good enough)
    // We only save if there are keys to avoid wiping on empty load
    if (Object.keys(datasetsCache).length > 0) {
      try {
        localStorage.setItem("datasetsCache", JSON.stringify(datasetsCache));
      } catch (e) {
        console.warn("Cache limit reached", e);
        // Optional: Implement LRU or clear old items here if needed
      }
    }
  }, [uploadInfo, datasetData, datasetsCache, history]); // Added history just in case

  const addToHistory = (prompt: string, result: any) => {
    const newItem = {
      id: Date.now().toString(),
      prompt,
      timestamp: Date.now(),
      datasetName: uploadInfo?.filename, // Save dataset context
      result
    };
    setHistory(prev => [newItem, ...prev]);
  };

  // Helper to parse file on frontend for the chart (Simple CSV/JSON parser)
  const parseFrontendFile = async (f: File) => {
    const text = await f.text();
    if (f.name.endsWith('.json')) return JSON.parse(text);
    if (f.name.endsWith('.csv')) {
      const lines = text.split('\n').filter(l => l.trim());
      if (lines.length === 0) return [];
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/ /g, '_'));
      return lines.slice(1).map(line => {
        const values = line.split(',');
        const obj: any = {};
        headers.forEach((h, i) => {
          let val: string | number | undefined = values[i]?.trim();
          // Try number conversion
          if (val && !isNaN(Number(val))) val = Number(val);
          obj[h] = val;
        });
        return obj;
      });
    }
    return [];
  };

  const handleUpload = async (uploadedFile: File) => {
    setIsUploading(true);
    setError(null);
    setQueryResult(null);
    try {
      // 1. Upload to backend
      const response = await uploadDataset(uploadedFile);
      setUploadInfo(response);
      setFile(uploadedFile);

      // 2. Parse for frontend state (chart data)
      const data = await parseFrontendFile(uploadedFile);
      setDatasetData(data);

      // 3. Update Cache
      setDatasetsCache(prev => ({
        ...prev,
        [response.filename]: data
      }));

    } catch (err: any) {
      const msg = err.response?.data?.detail || err.message || "Unknown error";
      setError("Failed to upload dataset. " + msg);
    } finally {
      setIsUploading(false);
    }
  };

  const handleHistorySelect = (item: any) => {
    console.log("History selected:", item);
    console.log("Current filename:", uploadInfo?.filename);
    console.log("Cache keys:", Object.keys(datasetsCache));

    // Check if we need to switch dataset
    if (item.datasetName && item.datasetName !== uploadInfo?.filename) {
      const cachedData = datasetsCache[item.datasetName];
      if (cachedData) {
        console.log("Switching to cached dataset:", item.datasetName);
        // Switch!
        setDatasetData(cachedData);
        // Mock update uploadInfo to reflect filename change (ID might be wrong but needed for viewing)
        // Note: file_id is mocked because we don't have it unless we stored it in cache too. 
        // But for visualization 'datasetData' is key. For NEW prompts, we need file_id.
        // This is a limitation: We can't query AI on old dataset unless we persist file_id too.
        // Let's assume user just wants to VIEW history.
        // IF they want to prompt, they might need to re-upload.
        // Or we can save file_id in cache.
        setUploadInfo(prev => ({
          ...prev!,
          filename: item.datasetName,
          file_id: "cached_view_only", // Placeholder
          summary: { row_count: cachedData.length, columns: {} }
        }));
        setQueryResult(item.result);
      } else {
        console.warn("Dataset not found in cache:", item.datasetName);
        alert(`Dataset "${item.datasetName}" is not in cache (Size limit or cleared). Please re-upload it.`);
      }
    } else {
      setQueryResult(item.result);
    }
  };

  const handlePromptSubmit = async (prompt: string) => {
    if (!uploadInfo) return;

    setIsProcessing(true);
    setQueryResult(null);
    setError(null);

    try {
      const response = await generateVisualization(uploadInfo.file_id, prompt);

      if (response.status === 'error') {
        setError("AI generation failed.");
      } else {
        setQueryResult(response);
        addToHistory(prompt, response);
      }

    } catch (err: any) {
      // Mock fallback if API fails completely (e.g. backend down)
      console.error(err);
      const msg = err.response?.data?.detail || err.message || "Unknown error";
      setError("Failed to generate visualization. " + msg);
    } finally {
      setIsProcessing(false);
    }
  };

  const clearHistory = () => {
    if (confirm("Clear all history?")) {
      setHistory([]);
    }
  };

  const deleteHistoryItem = (id: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering selection
    setHistory(prev => prev.filter(item => item.id !== id));
  };


  return (
    <div className="min-h-screen bg-gray-50 pb-20 font-sans">
      <Header />

      <main className="max-w-6xl mx-auto px-6 py-10 grid grid-cols-1 lg:grid-cols-4 gap-8">

        {/* Main Content Area */}
        <div className="lg:col-span-3 space-y-6">
          <div className="space-y-2 text-center sm:text-left">
            <h2 className="text-3xl font-bold text-gray-900 tracking-tight">Visualize data in seconds</h2>
            <p className="text-gray-500 text-lg">Upload your dataset and ask questions in plain English.</p>
          </div>

          {/* Upload Section */}
          <UploadArea onUpload={handleUpload} isUploading={isUploading} />

          {/* Error Banner */}
          {error && (
            <div className="p-4 bg-red-50 text-red-700 border border-red-200 rounded-lg flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
              <span className="font-bold">Error:</span> {error}
            </div>
          )}

          {/* Summary */}
          {uploadInfo && (
            <DatasetSummary summary={uploadInfo.summary} filename={uploadInfo.filename} />
          )}

          {/* Prompt Section */}
          <PromptInput
            onSubmit={handlePromptSubmit}
            isProcessing={isProcessing}
            disabled={!uploadInfo}
          />

          {/* Results */}
          <ResultsPanel
            data={datasetData}
            result={queryResult}
            isLoading={isProcessing}
          />
        </div>

        {/* Sidebar (History) */}
        <div className="lg:col-span-1 hidden lg:block">
          <div className="sticky top-6">
            <HistoryPanel
              history={history}
              currentDatasetName={uploadInfo?.filename}
              availableDatasets={Object.keys(datasetsCache)}
              onSelect={handleHistorySelect}
              onClear={clearHistory}
              onDelete={deleteHistoryItem}
            />

            {history.length === 0 && uploadInfo && (
              <div className="bg-white border border-gray-200 rounded-xl p-6 text-center text-gray-400 border-dashed">
                <p className="text-sm">History will appear here</p>
              </div>
            )}
          </div>
        </div>

      </main>
    </div>
  );
}
