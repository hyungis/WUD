// src/types/star.ts
export interface StarItem {
    id: number;
    dailyEntryId: number;
    kind: "DAILY" | "DEEP" | string;
    weekStartDate?: string;
    starColor: string;
    x: number;
    y: number;
    size: number;
    shapeType: "CIRCLE" | "OCTAHEDRON" | string;
}

export interface StarMapResponse {
    stars: StarItem[];
}

export interface StarDetailResponse {
    star: {
        id: number;
        x: number;
        y: number;
        starColor: string;
    };
    daily?: {
        id: number;
        content: string;
        emotionColor: string;
    };
    deep?: {
        id: number;
        summary: string;
        toneColor: string;
    };
}

export interface ConstellationEdge {
    fromStarId: number;
    toStarId: number;
    weight: number;
}

export interface ConstellationResponse {
    constellation: {
        id: number;
        weekStartDate: string;
        weekEndDate: string;
    };
    stars: { id: number; x: number; y: number }[];
    edges: ConstellationEdge[];
}

export interface StatisticsResponse {
    emotionColorRatio: { color: string; ratio: number }[];
    emotionValueAvg: number;
    totalDailies: number;
    totalDeeps?: number;
}
