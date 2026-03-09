import { authApi } from "../api/auth";
import { userApi } from "../api/user";
import { useAuthStore, type User } from "../store/authStore";
import type { ApiResponse } from "../types/api";

export type LoginPayload = {
  email: string;
  password: string;
};

export type RegisterPayload = {
  name: string; // 원본 유지
  email: string;
  password: string;
};

function extractApiErrorMessage(error: unknown, fallback: string) {
  if (typeof error !== "object" || error === null) {
    return fallback;
  }

  const maybeApiError = error as {
    message?: string;
    error?: { message?: string };
  };

  return maybeApiError.error?.message || maybeApiError.message || fallback;
}

function assertSuccess<T>(response: ApiResponse<T>, fallback: string) {
  if (!response.success) {
    throw new Error(response.error?.message || response.message || fallback);
  }
}

export async function login(payload: LoginPayload) {
  const response = await authApi.login(payload);
  assertSuccess(response, "로그인에 실패했습니다.");

  if (!response.data) {
    throw new Error("로그인 응답 데이터가 비어 있습니다.");
  }

  const { accessToken, refreshToken } = response.data;

  useAuthStore.getState().setTokens(accessToken, refreshToken);

  // 현재 백엔드 로그인 응답에는 user 정보가 없으므로 입력 이메일만 우선 저장한다.
  useAuthStore.getState().setUser({ email: payload.email });

  return response.data;
}

export async function register(payload: RegisterPayload) {
  const response = await authApi.signup({
    email: payload.email,
    password: payload.password,
    nickname: payload.name,
  });

  assertSuccess(response, "회원가입에 실패했습니다.");
  return true;
}

export async function fetchMe() {
  const response = await userApi.getProfile();

  if (response.success && response.data) {
    const p = response.data;
    const mappedUser: User = { id: String(p.id), email: p.email, name: p.nickname };
    useAuthStore.getState().setUser(mappedUser);
    return mappedUser;
  }

  throw new Error(response.message || "서버에서 프로필을 불러오지 못했습니다.");
}

export async function logout() {
  try {
    await authApi.logout();
  } catch (e) {
    console.error("로그아웃 API 실패:", extractApiErrorMessage(e, "로그아웃에 실패했습니다."));
  } finally {
    useAuthStore.getState().clearAuth();
  }
}

