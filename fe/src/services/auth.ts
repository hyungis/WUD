import { authApi } from "../api/auth";
import { userApi } from "../api/user";
import { useAuthStore, type User } from "../store/authStore";

import { useCustomStarStore } from "../store/customStarStore";

export type LoginPayload = {
  email: string;
  password: string;
};

export type AuthOptions = {
  persist?: boolean;
};

export type RegisterPayload = {
  name: string;
  nickname: string;
  email: string;
  password: string;
};

function extractErrorMessage(err: any, fallback: string): string {
  if (err instanceof Error) return err.message || fallback;

  // error.details가 있으면 그 중 첫 번째 상세 에러 메시지를 반환하도록 수정
  const details = err?.error?.details;
  if (details && typeof details === "object") {
    const messages = Object.values(details);
    if (messages.length > 0 && typeof messages[0] === "string") {
      return messages[0];
    }
  }

  const serverMsg = err?.error?.message || err?.message;
  if (serverMsg && typeof serverMsg === "string") return serverMsg;
  return fallback;
}

export async function login(payload: LoginPayload, options: AuthOptions = {}) {
  let response;
  try {
    response = await authApi.login(payload);
  } catch (err: any) {
    throw new Error(extractErrorMessage(err, "로그인에 실패했습니다."));
  }

  // 에러 처리: success 필드가 false이거나 data가 없으면 예외 발생
  if (!response.success || !response.data) {
    throw new Error(response.error?.message || response.message || "로그인에 실패했습니다.");
  }

  // 백엔드 login 응답: accessToken, expiresInSec
  const { accessToken } = response.data;
  void options;

  if (accessToken) {
    useAuthStore.getState().setTokens(accessToken);
    try {
      // 로그인 직후에도 닉네임/프로필을 즉시 반영한다.
      await fetchMe();
    } catch {
      // 프로필 조회 실패 시에만 이메일 fallback 유지
      useAuthStore.getState().setUser({ email: payload.email });
    }
  } else {
    useAuthStore.getState().setUser({ email: payload.email });
  }

  return response.data; // LoginResponse 객체 반환
}

export async function register(payload: RegisterPayload) {
  let response;
  try {
    response = await authApi.signup({
      email: payload.email,
      password: payload.password,
      name: payload.name,
      nickname: payload.nickname,
    });
  } catch (err: any) {
    throw new Error(extractErrorMessage(err, "회원가입에 실패했습니다."));
  }

  if (!response.success) {
    throw new Error(response.error?.message || response.message || "회원가입에 실패했습니다.");
  }
  return response.data;
}

export async function fetchMe() {
  const response = await userApi.getProfile();

  if (response.success && response.data) {
    const p = response.data;
    const mappedUser: User = { id: String(p.id), email: p.email, name: p.nickname, nickname: p.nickname, tutorialCompleted: p.tutorialCompleted };
    useAuthStore.getState().setUser(mappedUser);
    return mappedUser;
  }

  throw new Error(response.message || "서버에서 프로필을 불러오지 못했습니다.");
}

export async function logout() {
  try {
    await authApi.logout();
  } catch (e) {
    console.error("로그아웃 API 실패:", e);
  } finally {
    // 중심별 커스텀 정보 초기화 (계정 간 간섭 방지)
    useCustomStarStore.getState().clearStore();
    useAuthStore.getState().clearAuth();
  }
}

