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
    analysisStatus: "PENDING" | "DONE" | "FAIL";
}

export interface DailyDetailResponse {
    id: number;
    dailyType: string;
    entryDate: string;
    content: string;
    emotionValue: number;
    emotionColor: string;
    drawing: {
        imageId: number;
        imageKey: string;
    };
    aiResult: {
        exists: boolean;
        result: string;
        raw: any;
    };
    createdAt: string;
}
