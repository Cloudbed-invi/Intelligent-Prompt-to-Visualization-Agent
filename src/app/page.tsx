"use client";

import { useState } from "react";
import { Header } from "@/components/Header";
import { UploadArea } from "@/components/UploadArea";
import { DatasetSummary } from "@/components/DatasetSummary";
import { PromptInput } from "@/components/PromptInput";
import { ResultsPanel } from "@/components/ResultsPanel";
import { uploadDataset, generateVisualization, UploadResponse, QueryResponse } from "@/lib/api";

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [uploadInfo, setUploadInfo] = useState<UploadResponse | null>(null);
  const [datasetData, setDatasetData] = useState<any[]>([]);
  const [queryResult, setQueryResult] = useState<QueryResponse | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

    } catch (err: any) {
      const msg = err.response?.data?.detail || err.message || "Unknown error";
      setError("Failed to upload dataset. " + msg);
    } finally {
      setIsUploading(false);
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

  return (
    <div className="min-h-screen bg-gray-50 pb-20 font-sans">
      <Header />

      <main className="max-w-4xl mx-auto px-6 py-10">
        <div className="space-y-2 mb-8 text-center sm:text-left">
          <h2 className="text-3xl font-bold text-gray-900 tracking-tight">Visualize data in seconds</h2>
          <p className="text-gray-500 text-lg">Upload your dataset and ask questions in plain English.</p>
        </div>

        {/* Upload Section */}
        <UploadArea onUpload={handleUpload} isUploading={isUploading} />

        {/* Error Banner */}
        {error && (
          <div className="mt-4 p-4 bg-red-50 text-red-700 border border-red-200 rounded-lg flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
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

      </main>
    </div>
  );
}
