// src/types/user.ts
export interface UserProfileResponse {
    id: number;
    email: string;
    nickname: string;
    status: string; // "ACTIVE" 등
    joinedAt: string;
    lastLoginAt: string;
    tutorialCompleted: boolean;
}

export interface UpdateProfileRequest {
    nickname: string;
}

export interface ChangePasswordRequest {
    currentPassword?: string;
    newPassword?: string;
}

export interface SetPasswordRequest {
    newPassword: string;
}
