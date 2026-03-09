import axios from "axios";
import type { AxiosInstance, AxiosError } from "axios";
import type { ApiErrorResponse } from "../types/api";
import { tokenStorage } from "../utils/tokenStorage";

const api: AxiosInstance = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:8081",
    timeout: 10000, // 10초 타임아웃
    headers: {
        "Content-Type": "application/json",
    },
});

// Request Interceptor: 토큰이 있다면 헤더에 추가
api.interceptors.request.use(
    (config) => {
        const token = tokenStorage.getAccessToken();
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Response Interceptor: 공통 에러 핸들링
api.interceptors.response.use(
    (response) => response.data,
    (error: AxiosError<ApiErrorResponse>) => {
        if (error.response) {
            const data = error.response.data;
            if (error.response.status === 401) {
                console.error("Unauthorized: Please login again.");
            }
            return Promise.reject(data ?? { success: false, message: "Request failed", status: error.response.status });
        } else if (error.request) {
            console.error("No response from server:", error.message);
            return Promise.reject({ success: false, message: "Server not responding", status: 0 });
        } else {
            console.error("Axios Error:", error.message);
            return Promise.reject({ success: false, message: error.message, status: 0 });
        }
    }
);

export default api;
