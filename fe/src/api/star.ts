import api from "./axios";
import type { ApiResponse } from "../types/api";
import type {
    StarMapResponse,
    StarDetailResponse,
    ConstellationResponse,
    StatisticsResponse
} from "../types/star";

export const starApi = {
    // 별 지도(우주 메인) 조회
    getStarMap: (params?: { from?: string; to?: string }) =>
        api.get<any, ApiResponse<StarMapResponse>>("/star-map", { params }),

    // 개별 행성/별 클릭 시 상세 데이터 반환
    getStarDetail: (starId: number) =>
        api.get<any, ApiResponse<StarDetailResponse>>(`/stars/${starId}`),

    // 주간 별자리 그룹핑 데이터 반환
    getWeeklyConstellation: (params?: { weekStartDate?: string }) =>
        api.get<any, ApiResponse<ConstellationResponse>>("/constellations/weekly", { params }),

    // 우주 통계 (주로 사용된 감정, 비율 등)
    getStatistics: (params?: { from?: string; to?: string }) =>
        api.get<any, ApiResponse<StatisticsResponse>>("/stars/statistics", { params }),
};
