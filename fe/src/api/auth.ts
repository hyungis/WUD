import api from "./axios";
import type { ApiResponse } from "../types/api";
import type {
    SignupRequest,
    LoginRequest,
    LoginResponse,
} from "../types/auth";

export const authApi = {
    signup: (data: SignupRequest) => api.post<any, ApiResponse<void>>("/auth/signup", data),
    login: (data: LoginRequest) => api.post<any, ApiResponse<LoginResponse>>("/auth/login", data),
    logout: () => api.post<any, ApiResponse<void>>("/auth/logout"),
};
