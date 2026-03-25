// src/types/daily.ts
export interface DailyCreateRequest {
    dailyType: "MANDALA" | "COLORING" | "FREE" | string;
    entryDate: string; // "YYYY-MM-DD"
    content: string;
    emotion: string;
    drawingImageId: number;
}

export interface DailyCreateResponse {
    dailyId: number;
    analysisStatus: "PENDING" | "ANALYZING" | "DONE" | "FAILED" | string;
}

export interface DailyDetailResponse {
    id?: number;
    dailyId?: number;
    dailyType: string;
    entryDate: string;
    content: string;
    emotionValue: number;
    emotionColor: string;
    analysisStatus?: "PENDING" | "ANALYZING" | "DONE" | "FAILED" | string;
    analysisResult?: string | null;
    analysisRaw?: any;
    drawing?: {
        imageId: number;
        imageKey: string;
    };
    drawingImageId?: number;
    drawingImageKey?: string;
    drawingImageUrl?: string;
    aiResult?: {
        exists?: boolean;
        result?: string;
        resultSummary?: string;
        raw?: any;
    };
    createdAt: string;
    updatedAt?: string;
}

export interface DailyListItemResponse {
    dailyId: number;
    dailyType: string;
    entryDate: string;
    emotion?: string;
    emotionValue?: number;
    emotionColor?: string;
    drawingImageId?: number;
    analysisStatus?: "PENDING" | "ANALYZING" | "DONE" | "FAILED" | string;
    resultSummary?: string | null;
}
