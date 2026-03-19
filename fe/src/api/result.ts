import api from "./axios";
import type { ApiResponse } from "../types/api";
import type { DailyDetailResponse } from "../types/daily";
import type { DeepDetailResponse, DeepHistoryItem } from "../types/deep";

export const resultApi = {
    getDailyResult: (dailyId: number) => api.get<any, ApiResponse<DailyDetailResponse>>(`/dailies/${dailyId}`),
    getDeepResult: (sessionId: number) => api.get<any, ApiResponse<DeepDetailResponse>>(`/deep-sessions/${sessionId}/result`),
    getDeepResultList: () => api.get<any, ApiResponse<DeepHistoryItem[]>>("/deep-sessions"),
};
