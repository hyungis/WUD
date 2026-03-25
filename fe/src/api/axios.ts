import axios, { type AxiosInstance, type AxiosError, type InternalAxiosRequestConfig } from "axios";
import type { ApiErrorResponse } from "../types/api";
import { useAuthStore } from "../store/authStore";

const baseURL = import.meta.env.VITE_API_URL ?? import.meta.env.VITE_API_BASE_URL ?? "/api";

const api: AxiosInstance = axios.create({
    baseURL,
    timeout: 20000,
    withCredentials: true, // HTTP-Only 쿠키 전송 활성화
    headers: {
        "Content-Type": "application/json",
    },
});

const refreshApi = axios.create({
    baseURL,
    timeout: 20000,
    withCredentials: true,
});

let isRefreshing = false;
let pendingRequests: Array<(token: string) => void> = [];

type RetryConfig = InternalAxiosRequestConfig & { _retry?: boolean };

const isAuthEndpoint = (url?: string) => {
    if (!url) return false;
    return /\/auth\/(login|signup|logout|refresh)\b/.test(url);
};

// Request Interceptor: 토큰이 있다면 헤더에 추가
api.interceptors.request.use(
    (config) => {
        const token = useAuthStore.getState().accessToken;
        if (token) {
            config.headers = config.headers ?? {};
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Response Interceptor: 공통 에러 핸들링 및 401 재요청 로직
api.interceptors.response.use(
    (response) => {
        // 기존은 response.data를 반환했으나 일부 API는 response 전체를 기대할 수 있습니다.
        // 현재 코드베이스에서 api.interceptors.response.use((response) => response.data, ...) 가 있었으므로 호환성을 유지합니다.
        return response.data;
    },
    async (error: AxiosError<ApiErrorResponse>) => {
        const originalConfig = error.config as RetryConfig | undefined;
        const response = error.response;

        if (response) {
            // 401 인증 에러 및 최초 시도일 경우
            if (response.status === 401 && originalConfig && !originalConfig._retry && !isAuthEndpoint(originalConfig.url)) {
                originalConfig._retry = true;

                if (isRefreshing) {
                    return new Promise((resolve) => {
                        pendingRequests.push((token: string) => {
                            originalConfig.headers = originalConfig.headers ?? {};
                            originalConfig.headers.Authorization = `Bearer ${token}`;
                            resolve(api(originalConfig));
                        });
                    });
                }

                isRefreshing = true;

                try {
                    // refresh 토큰 바디 없이 HTTP-Only 쿠키를 이용해 API 요청
                    const refreshRes = await refreshApi.post("/auth/refresh");
                    const { accessToken } = refreshRes.data?.data ?? refreshRes.data ?? {};

                    if (!accessToken) {
                        throw new Error("Failed to refresh access token");
                    }

                    useAuthStore.getState().setTokens(accessToken);

                    pendingRequests.forEach((callback) => callback(accessToken));
                    pendingRequests = [];
                    originalConfig.headers = originalConfig.headers ?? {};
                    originalConfig.headers.Authorization = `Bearer ${accessToken}`;

                    return api(originalConfig);
                } catch (refreshError) {
                    pendingRequests = [];
                    useAuthStore.getState().clearAuth();
                    console.error("Unauthorized: Please login again.", refreshError);
                    return Promise.reject(refreshError);
                } finally {
                    isRefreshing = false;
                }
            }

            // 그 외 서버 에러 반환
            return Promise.reject(response.data);
        } else if (error.request) {
            // 요청은 성공했으나 응답이 오지 않은 경우
            console.error("No response from server:", error.message);
            return Promise.reject({
                success: false,
                message: "Server not responding",
                status: 0,
                code: error.code,
                timedOut: error.code === "ECONNABORTED",
            });
        } else {
            console.error("Axios Error:", error.message);
            return Promise.reject({ success: false, message: error.message, status: 0, code: error.code });
        }
    }
);

export default api;
