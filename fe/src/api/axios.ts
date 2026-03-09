import axios from "axios";
import type { AxiosInstance, AxiosError } from "axios";
import type { ApiErrorResponse } from "../types/api";

const api: AxiosInstance = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:8080/api",
    timeout: 10000, // 10초 타임아웃
    headers: {
        "Content-Type": "application/json",
    },
});

// Request Interceptor: 토큰이 있다면 헤더에 추가
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem("accessToken");
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
            // 서버에서 응답을 반환한 경우 (4xx, 5xx)
            const data = error.response.data;
            if (error.response.status === 401) {
                // 인증 에러 시 처리 (예: 토큰 삭제, 로그인 페이지 이동)
                // localStorage.removeItem("accessToken");
                // window.location.href = "/login";
                console.error("Unauthorized: Please login again.");
            }
            return Promise.reject(data);
        } else if (error.request) {
            // 요청은 성공했으나 응답이 오지 않은 경우
            console.error("No response from server:", error.message);
            return Promise.reject({ success: false, message: "Server not responding", status: 0 });
        } else {
            console.error("Axios Error:", error.message);
            return Promise.reject({ success: false, message: error.message, status: 0 });
        }
    }
);

export default api;
