import axios from "axios";

const API_BASE_URL = "http://localhost:8080";

export const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        "Content-Type": "application/json",
    },
});

export interface UploadResponse {
    file_id: string;
    filename: string;
    summary: any;
}

export interface QueryResponse {
    status: string;
    spec?: any;
    code?: string;
    insights?: string;
    warnings?: { type: string; message: string }[];
}


export const uploadDataset = async (file: File): Promise<UploadResponse> => {
    const formData = new FormData();
    formData.append("file", file);

    const response = await api.post<UploadResponse>("/upload", formData, {
        headers: {
            "Content-Type": "multipart/form-data",
        },
    });
    return response.data;
};

export const generateVisualization = async (fileId: string, prompt: string): Promise<QueryResponse> => {
    const response = await api.post<QueryResponse>("/query", {
        file_id: fileId,
        prompt: prompt,
    });
    return response.data;
};
