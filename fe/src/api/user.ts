import api from "./axios";
import type { ApiResponse } from "../types/api";
import type {
    UserProfileResponse,
    UpdateProfileRequest,
    ChangePasswordRequest,
    SetPasswordRequest
} from "../types/user";

export const userApi = {
    getProfile: () => api.get<any, ApiResponse<UserProfileResponse>>("/users/me"),
    updateProfile: (data: UpdateProfileRequest) => api.put<any, ApiResponse<void>>("/users/me", data),

    changePassword: (data: ChangePasswordRequest) => api.put<any, ApiResponse<void>>("/users/me/password", data),
    setupPassword: (data: SetPasswordRequest) => api.post<any, ApiResponse<void>>("/users/me/password/setup", data),

    linkGoogle: (data: { idToken: string }) => api.post<any, ApiResponse<void>>("/users/me/oauth/google/link", data),
    unlinkGoogle: () => api.delete<any, ApiResponse<void>>("/users/me/oauth/google/link"),

    withdraw: () => api.delete<any, ApiResponse<void>>("/users/me"),
};
