// src/types/auth.ts
export interface SignupRequest {
    email: string;
    password: string;
    name: string;
    nickname: string;
}

export interface LoginRequest {
    email: string;
    password: string;
}

export interface GoogleLoginRequest {
    idToken: string; // auth-code OR idToken
}

export interface AuthTokens {
    accessToken: string;
    refreshToken: string;
    expiresInSec: number;
}

export interface AuthUser {
    id: number;
    email: string;
    nickname: string;
}

export interface LoginResponse {
    accessToken: string;
    refreshToken: string;
    expiresInSec: number;
}

export interface SignupResponse {
    success: boolean;
}

export interface RefreshRequest {
    refreshToken: string;
}

export interface RefreshResponse {
    accessToken: string;
    refreshToken: string;
    expiresInSec: number;
}

export interface LogoutRequest {
    refreshToken: string;
}

export interface LogoutResponse {
    revoked: boolean;
}

export interface ProviderItem {
    provider: string;
    enabled: boolean;
}

export type OAuthProviderResponse = unknown;
