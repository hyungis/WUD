import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import Button from "../../components/shared/Button";
import Input from "../../components/shared/Input";
import { login } from "../../services/auth";

function LoginPage() {
  const navigate = useNavigate();
  const googleAuthUrl = "https://www.google.com";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      await login({ email, password }, { persist: true });
      const shouldShowWelcome = localStorage.getItem("showWelcomeOnce") === "true";
      navigate(shouldShowWelcome ? "/welcome" : "/dashboard");
    } catch (submitError) {
      const message =
        submitError instanceof Error
          ? submitError.message
          : "로그인에 실패했습니다.";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-slate-100">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 starfield z-20" />
      </div>

      <div className="relative px-6 py-12">
        <div className="mx-auto flex min-h-screen w-full max-w-5xl items-center justify-center">
          <div className="grid w-full items-center gap-10 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="space-y-6">
              <p className="text-sm font-semibold uppercase tracking-[0.35em] text-slate-300">
                Account Access
              </p>
              <h1 className="text-4xl font-semibold leading-tight text-slate-100 [font-family:'Manrope',sans-serif]">
                계속 진행하려면 로그인하세요.
                <span className="block text-xs font-normal text-slate-400">
                  (현재 문구는 임시이며 추후 입력 필요)
                </span>
              </h1>
              <p className="max-w-md text-base text-slate-200">
                계정 정보를 입력하면 대시보드로 이동합니다.
                <span className="block text-xs text-slate-400">
                  (현재 문구는 임시이며 추후 입력 필요)
                </span>
              </p>
              <div className="flex items-center gap-3 text-sm text-slate-200">
                <span className="h-px w-10 bg-slate-500" />
                <span>계정이 없다면</span>
                <Link
                  to="/signup"
                  className="font-semibold text-white underline decoration-slate-400 underline-offset-4"
                >
                  회원가입
                </Link>
              </div>
            </div>

            <form
              onSubmit={handleSubmit}
              className="relative w-full rounded-3xl border border-white/25 bg-gradient-to-b from-white/15 via-white/10 to-white/5 p-8 shadow-[0_30px_80px_rgba(0,0,0,0.45)] ring-1 ring-white/20 backdrop-blur-3xl"
            >
              <div className="space-y-2">
                <h2 className="text-2xl font-semibold text-slate-100">로그인</h2>
                <p className="text-sm text-slate-300">업무 공간으로 이동합니다.</p>
              </div>

              <div className="mt-6 space-y-4">
                <label className="block text-sm font-medium text-slate-200" htmlFor="login-email">
                  이메일
                </label>
                <Input
                  id="login-email"
                  type="email"
                  placeholder="you@space.com"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                />

                <label className="block text-sm font-medium text-slate-200" htmlFor="login-password">
                  비밀번호
                </label>
                <Input
                  id="login-password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                />
              </div>

              {error && (
                <p className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-600">
                  {error}
                </p>
              )}

              <div className="mt-6 flex items-center justify-between">
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "로그인 중..." : "로그인"}
                </Button>
                <Link
                  to="/signup"
                  className="text-sm font-semibold text-slate-200"
                >
                  계정 만들기
                </Link>
              </div>

              <div className="my-6 flex items-center gap-3 text-xs text-slate-400">
                <span className="h-px flex-1 bg-white/20" />
                OR
                <span className="h-px flex-1 bg-white/20" />
              </div>

              <div className="flex items-center gap-3">
                <Button
                  type="button"
                  aria-label="Google로 로그인"
                  onClick={() => {
                    window.location.href = googleAuthUrl;
                  }}
                  className="h-11 w-11 rounded-full p-0"
                >
                  G
                </Button>
                <span className="text-xs text-slate-300">Google로 로그인</span>
              </div>

              <p className="mt-3 text-xs text-slate-400">
                현재 버튼은 임시이며 추후 OAuth URL로 변경 필요
              </p>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
