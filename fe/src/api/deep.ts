import api from "./axios";
import type { ApiResponse } from "../types/api";
import type {
    DeepSessionResponse,
    PsyTestRequest,
    PsyTestResponse,
    DeepTestInfo,
    DeepTestGuide,
    SubmitDrawingRequest,
    SubmitDrawingResponse,
    AnalysisStatusResponse,
    DeepDetailResponse,
    DeepHistoryItem,
    QuestionAnswerRequest,
    QuestionAnswerResponse
} from "../types/deep";

export const deepApi = {
    createSession: (data: { type: string }) => api.post<any, ApiResponse<DeepSessionResponse>>("/deep-sessions", data),
    getPastSessions: () => api.get<any, ApiResponse<DeepHistoryItem[]>>("/deep-sessions"),

    submitWho5Assessment: (sessionId: number, data: PsyTestRequest) => api.post<any, ApiResponse<PsyTestResponse>>(`/deep-sessions/${sessionId}/psych-assessments/who5`, data),
    submitSubmissions: (sessionId: number, data: SubmitDrawingRequest) => api.post<any, ApiResponse<SubmitDrawingResponse>>(`/deep-sessions/${sessionId}/submissions`, data),
    saveAnswers: (sessionId: number, data: QuestionAnswerRequest) => api.post<any, ApiResponse<QuestionAnswerResponse>>(`/deep-sessions/${sessionId}/answers`, data),

    getAnalysisStatus: (sessionId: number) => api.get<any, ApiResponse<AnalysisStatusResponse>>(`/deep-sessions/${sessionId}/status`),
    getDeepResult: (sessionId: number) => api.get<any, ApiResponse<DeepDetailResponse>>(`/deep-sessions/${sessionId}/result`),

    getTestTypes: () => api.get<any, ApiResponse<DeepTestInfo[]>>("/deep-tests"),
    getTestGuide: (type: string) => api.get<any, ApiResponse<DeepTestGuide>>(`/deep-tests/${type}/guide`),
};
