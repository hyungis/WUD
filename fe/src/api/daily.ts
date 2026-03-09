import api from "./axios";
import type { ApiResponse } from "../types/api";
import type { DailyCreateRequest, DailyCreateResponse, DailyDetailResponse } from "../types/daily";

export const dailyApi = {
    createDaily: (data: DailyCreateRequest) => api.post<any, ApiResponse<DailyCreateResponse>>("/dailies", data),

    // 리스트 조회의 경우 명세 상 별도 포맷이 주어지지 않았으나 동일하게 구성
    getDailyList: (params?: { year?: number; month?: number; week?: number }) =>
        api.get<any, ApiResponse<DailyDetailResponse[]>>("/dailies", { params }),

    getDailyDetail: (dailyId: number) => api.get<any, ApiResponse<DailyDetailResponse>>(`/dailies/${dailyId}`),

    updateDaily: (dailyId: number, data: Partial<DailyCreateRequest>) => api.put<any, ApiResponse<void>>(`/dailies/${dailyId}`, data),
    deleteDaily: (dailyId: number) => api.delete<any, ApiResponse<void>>(`/dailies/${dailyId}`),
};
