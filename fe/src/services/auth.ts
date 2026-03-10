import { authApi } from "../api/auth";
import { userApi } from "../api/user";
import { useAuthStore, type User } from "../store/authStore";

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

export async function login(payload: LoginPayload, options: AuthOptions = {}) {
  // 실제 로그인 API 호출
  const response = await authApi.login(payload);

  // 에러 처리: success 필드가 false이거나 data가 없으면 예외 발생
  if (!response.success || !response.data) {
    throw new Error(response.message || "로그인에 실패했습니다.");
  }

  // 백엔드 login 응답: accessToken, refreshToken, expiresInSec
  const { accessToken, refreshToken } = response.data;
  void options;

  if (accessToken) {
    useAuthStore.getState().setTokens(accessToken, refreshToken);
  }

  useAuthStore.getState().setUser({ email: payload.email });

  return response.data; // LoginResponse 객체 반환
}

export async function register(payload: RegisterPayload) {
  // SignUpRequest 인터페이스에 맞게 필드 맵핑
  const response = await authApi.signup({
    email: payload.email,
    password: payload.password,
    name: payload.name,
    nickname: payload.nickname,
  });

  if (!response.success) {
    throw new Error(response.message || "회원가입에 실패했습니다.");
  }
  return response.data;
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
    console.error("로그아웃 API 실패:", e);
  } finally {
    // API 성공 여부와 관계없이 스토어 클리어
    useAuthStore.getState().clearAuth();
  }
}

