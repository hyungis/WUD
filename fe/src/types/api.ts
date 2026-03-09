// src/types/api.ts
export interface ApiResponse<T = any> {
    success: boolean;
    data?: T;
    error?: {
        code?: string;
        message?: string;
        details?: unknown;
    };
    timestamp?: string;
    message?: string; // 일부 레거시 응답 형식 대응
}

export interface ApiErrorDetail {
    field: string;
    reason: string;
}

export interface ApiErrorResponse {
    success: boolean;
    code: string;
    message: string;
    details?: ApiErrorDetail[];
    timestamp: string;
}
