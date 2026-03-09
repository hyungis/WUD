// src/types/api.ts
export interface ApiResponse<T = any> {
    success: boolean;
    data?: T;
    timestamp?: string;
    message?: string; // image 등 글로벌 응답 형식 대응
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
