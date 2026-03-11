import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { login, register } from "../../services/auth";
import Button from "../../components/shared/Button";
import Input from "../../components/shared/Input";
import LoginStarScene from "../../components/shared/LoginStarScene";
import { useAuthStore } from "../../store/authStore";

export default function LoginPage() {
  const [isSignup, setIsSignup] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState("");
  const [nickname, setNickname] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [phase, setPhase] = useState<"idle" | "login" | "success">("idle");
  const navigate = useNavigate();

  const googleAuthUrl = import.meta.env.VITE_GOOGLE_AUTH_URL || "/#placeholder";
  const isMockEnabled =
    import.meta.env.VITE_AUTH_MOCK_LOGIN === "true" || import.meta.env.DEV;

  const handleStarClick = () => {
    if (phase === "idle") setPhase("login");
  };

  const handleClose = () => {
    setPhase("idle");
    setError(null);
    setIsSignup(false);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      if (isSignup) {
        if (password !== confirmPassword) {
          throw new Error("비밀번호가 일치하지 않습니다.");
        }
        await register({ name, nickname, email, password });
        // 회원가입 성공 후 자동으로 로그인 모드로 전환하거나 바로 로그인 처리
        // 여기서는 편의상 로그인 모드로 전환하고 안내 메시지 표시
        setIsSignup(false);
        setError("회원가입이 완료되었습니다. 로그인해 주세요.");
        setIsSubmitting(false);
      } else {
        // 전환 중 플래그를 먼저 설정하여 DashboardGate가 LoginPage를 언마운트하지 않도록 방지
        useAuthStore.getState().setAuthTransitioning(true);
        await login({ email, password }, { persist: true });
        setPhase("success");

        setTimeout(() => {
          useAuthStore.getState().setAuthTransitioning(false);
          navigate("/");
        }, 3000);
      }
    } catch (err: any) {
      setError(err.message || "오류가 발생했습니다.");
      setIsSubmitting(false);
      useAuthStore.getState().setAuthTransitioning(false);
    }
  };

  const handleMockLogin = () => {
    const authStore = useAuthStore.getState();
    authStore.setAuthTransitioning(true);
    setPhase("success");
    authStore.setTokens("mock-access-token");
    authStore.setUser({ email: "mock@local", name: "Mock User" });
    setTimeout(() => {
      authStore.setAuthTransitioning(false);
      navigate("/");
    }, 3000);
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-black text-white flex items-center justify-center">
      {/* 3D 배경 */}
      <div className="absolute inset-0 z-0">
        <LoginStarScene phase={phase} onStarClick={handleStarClick} />
      </div>

      {/* 로고 (idle 상태) */}
      {phase === "idle" && (
        <div className="relative z-10 text-center transition-opacity duration-700">
          <h1 className="text-4xl font-bold text-white tracking-wide drop-shadow-[0_0_30px_rgba(255,255,255,0.3)]">
            Would You Draw
          </h1>
          <p className="mt-3 text-sm text-white/40">Click here to log in</p>
        </div>
      )}

      {/* 로그인/회원가입 폼 */}
      {phase !== "idle" && (
        <div
          className={`relative z-10 w-full max-w-md mx-4 ${phase === "success" ? "animate-suckIn pointer-events-none" : "animate-[fadeIn_0.5s_ease-out]"
            }`}
        >
          <form
            onSubmit={handleSubmit}
            className="w-full rounded-2xl border border-white/10 bg-black/60 backdrop-blur-xl p-8 shadow-2xl relative"
          >
            {/* X 버튼 */}
            <button
              type="button"
              onClick={handleClose}
              className="absolute top-4 right-4 text-white/40 hover:text-white/80 transition-colors text-lg leading-none"
              aria-label="닫기"
            >
              ✕
            </button>

            <h1 className="text-2xl font-bold text-center text-white mb-1">
              Would You Draw
            </h1>
            <p className="text-sm text-white/40 text-center mb-8">
              {isSignup ? "회원가입" : "로그인"}
            </p>

            <div className="space-y-4">
              {isSignup && (
                <>
                  <div className="space-y-1.5">
                    <label className="block text-xs font-medium text-white/50" htmlFor="signup-name">
                      이름
                    </label>
                    <Input
                      id="signup-name"
                      type="text"
                      placeholder="이름을 입력하세요"
                      value={name}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
                      required
                      disabled={isSubmitting}
                      className="w-full bg-white/5 border-white/10 text-white placeholder-white/25 focus:border-white/30 focus:ring-1 focus:ring-white/20 rounded-xl h-11"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-xs font-medium text-white/50" htmlFor="signup-nickname">
                      닉네임
                    </label>
                    <Input
                      id="signup-nickname"
                      type="text"
                      placeholder="닉네임을 입력하세요"
                      value={nickname}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNickname(e.target.value)}
                      required
                      disabled={isSubmitting}
                      className="w-full bg-white/5 border-white/10 text-white placeholder-white/25 focus:border-white/30 focus:ring-1 focus:ring-white/20 rounded-xl h-11"
                    />
                  </div>
                </>
              )}

              <div className="space-y-1.5">
                <label
                  className="block text-xs font-medium text-white/50"
                  htmlFor="auth-email"
                >
                  이메일
                </label>
                <Input
                  id="auth-email"
                  type="email"
                  placeholder="email@example.com"
                  value={email}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setEmail(e.target.value)
                  }
                  required
                  disabled={isSubmitting}
                  className="w-full bg-white/5 border-white/10 text-white placeholder-white/25 focus:border-white/30 focus:ring-1 focus:ring-white/20 rounded-xl h-11"
                />
              </div>

              <div className="space-y-1.5">
                <label
                  className="block text-xs font-medium text-white/50"
                  htmlFor="auth-password"
                >
                  비밀번호
                </label>
                <Input
                  id="auth-password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setPassword(e.target.value)
                  }
                  required
                  disabled={isSubmitting}
                  className="w-full bg-white/5 border-white/10 text-white placeholder-white/25 focus:border-white/30 focus:ring-1 focus:ring-white/20 rounded-xl h-11"
                />
              </div>

              {isSignup && (
                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-white/50" htmlFor="auth-confirm-password">
                    비밀번호 확인
                  </label>
                  <Input
                    id="auth-confirm-password"
                    type="password"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setConfirmPassword(e.target.value)}
                    required
                    disabled={isSubmitting}
                    className="w-full bg-white/5 border-white/10 text-white placeholder-white/25 focus:border-white/30 focus:ring-1 focus:ring-white/20 rounded-xl h-11"
                  />
                </div>
              )}
            </div>

            {error && (
              <p className={`mt-4 rounded-xl border px-4 py-3 text-sm text-center ${error.includes("완료")
                  ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-300"
                  : "border-red-500/20 bg-red-500/10 text-red-300"
                }`}>
                {error}
              </p>
            )}

            <div className="mt-6">
              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full h-11 bg-white/10 hover:bg-white/20 text-white font-medium rounded-xl border border-white/15 transition-all"
              >
                {isSubmitting ? (isSignup ? "가입 중..." : "로그인 중...") : (isSignup ? "회원가입" : "로그인")}
              </Button>
              {isMockEnabled && !isSignup && (
                <Button
                  type="button"
                  disabled={isSubmitting}
                  onClick={handleMockLogin}
                  className="mt-2 w-full h-10 border border-white/10 text-white/60 rounded-xl bg-white/5 hover:bg-white/10 transition-all text-sm"
                >
                  테스트 로그인
                </Button>
              )}
            </div>

            <div className="mt-5 text-center">
              <button
                type="button"
                onClick={() => {
                  setIsSignup(!isSignup);
                  setError(null);
                }}
                className="text-xs text-white/40 hover:text-white/70 underline underline-offset-4 transition-colors"
              >
                {isSignup ? "이미 계정이 있으신가요? 로그인" : "계정이 없으신가요? 회원가입"}
              </button>
            </div>

            <div className="my-5 flex items-center gap-3 text-[10px] text-white/30">
              <span className="h-px flex-1 bg-white/10" />
              또는
              <span className="h-px flex-1 bg-white/10" />
            </div>

            <Button
              type="button"
              disabled={isSubmitting}
              onClick={() => {
                window.location.href = googleAuthUrl;
              }}
              className="flex items-center justify-center gap-3 w-full h-11 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white transition-all"
            >
              <svg
                className="w-4 h-4"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
              <span className="text-sm text-white/70">Google로 {isSignup ? "회원가입" : "로그인"}</span>
            </Button>
          </form>
        </div>
      )}
    </div>
  );
}
