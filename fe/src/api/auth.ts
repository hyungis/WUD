import api from "./axios";
import type { ApiResponse } from "../types/api";
import type {
    SignupRequest, LoginRequest, GoogleLoginRequest,
    LoginResponse, SignupResponse, RefreshRequest, RefreshResponse,
    LogoutRequest, LogoutResponse, ProviderItem
} from "../types/auth";

export const authApi = {
    signup: (data: SignupRequest) => api.post<any, ApiResponse<SignupResponse>>("/auth/signup", data),
    login: (data: LoginRequest) => api.post<any, ApiResponse<LoginResponse>>("/auth/login", data),
    googleLogin: (data: GoogleLoginRequest) => api.post<any, ApiResponse<LoginResponse>>("/auth/oauth/google/token", data),
    refresh: (data: RefreshRequest) => api.post<any, ApiResponse<RefreshResponse>>("/auth/refresh", data),
    logout: (data: LogoutRequest) => api.post<any, ApiResponse<LogoutResponse>>("/auth/logout", data),
    getProviders: () => api.get<any, ApiResponse<ProviderItem[]>>("/auth/oauth/providers"),
};
