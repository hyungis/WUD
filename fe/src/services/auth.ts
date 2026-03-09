import { authApi } from "../api/auth";
import { userApi } from "../api/user";
import { useAuthStore, type User } from "../store/authStore";

export type LoginPayload = {
  email?: string;
  password?: string;
};

export type AuthOptions = {
  persist?: boolean;
};

export type RegisterPayload = {
  name: string; // 원본 유지
  email: string;
  password?: string;
};

export async function login(payload: LoginPayload, options: AuthOptions = {}) {
  // 실제 로그인 API 호출
  const response = await authApi.login(payload);

  // 에러 처리: success 필드가 false이거나 data가 없으면 예외 발생
  if (!response.success || !response.data) {
    throw new Error(response.message || "로그인에 실패했습니다.");
  }

  // 최신 JSON 명세 반영: tokens, user
  const { tokens, user } = response.data;
  const shouldPersist = options.persist ?? false;

  // 토큰 저장 로직
  if (tokens?.accessToken && shouldPersist) {
    useAuthStore.getState().setTokens(tokens.accessToken, tokens.refreshToken);
  }

  // 유저 정보 저장 (userStore User 타입과 매핑)
  if (user) {
    useAuthStore.getState().setUser({
      id: String(user.id),
      email: user.email,
      name: user.nickname,
    });
  }

  return response.data; // LoginResponse 객체 반환
}

export async function register(payload: RegisterPayload) {
  // SignUpRequest 인터페이스에 맞게 필드 맵핑 (name -> nickname)
  const response = await authApi.signup({
    email: payload.email,
    password: payload.password,
    nickname: payload.name,
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
  const currentRefreshToken = useAuthStore.getState().refreshToken;

  try {
    if (currentRefreshToken) {
      await authApi.logout({ refreshToken: currentRefreshToken });
    }
  } catch (e) {
    console.error("로그아웃 API 실패:", e);
  } finally {
    // API 성공 여부와 관계없이 스토어 클리어
    useAuthStore.getState().clearAuth();
  }
}

