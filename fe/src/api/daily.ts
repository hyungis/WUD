import api from "./axios";
import type { ApiResponse } from "../types/api";
import type { DailyCreateRequest, DailyCreateResponse, DailyDetailResponse } from "../types/daily";

type DailyListParams = {
    period?: "DAY" | "WEEK" | "MONTH";
    date?: string;
};

export const dailyApi = {
    createDaily: (data: DailyCreateRequest) => api.post<any, ApiResponse<DailyCreateResponse>>("/dailies", data),

    getDailyList: (params?: DailyListParams) =>
        api.get<any, ApiResponse<DailyDetailResponse[]>>("/dailies", { params }),

    getDailyDetail: (dailyId: number) => api.get<any, ApiResponse<DailyDetailResponse>>(`/dailies/${dailyId}`),

    updateDaily: (dailyId: number, data: Partial<DailyCreateRequest>) => api.put<any, ApiResponse<void>>(`/dailies/${dailyId}`, data),
    deleteDaily: (dailyId: number) => api.delete<any, ApiResponse<void>>(`/dailies/${dailyId}`),
};
