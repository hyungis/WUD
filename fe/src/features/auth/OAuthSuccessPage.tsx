import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../../store/authStore";

export default function OAuthSuccessPage() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();

  useEffect(() => {
    // App.tsx의 initAuth가 성공하여 isAuthenticated가 true가 되면 홈으로 이동
    if (isAuthenticated) {
      navigate("/", { replace: true });
    }
  }, [isAuthenticated, navigate]);

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center text-white">
      <div className="w-16 h-16 border-4 border-white/20 border-t-white rounded-full animate-spin mb-6" />
      <h1 className="text-xl font-medium tracking-wide animate-pulse">
        은하계로 접속 중...
      </h1>
      <p className="mt-2 text-sm text-white/40">잠시만 기다려 주세요.</p>
    </div>
  );
}
