import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import LoginPage from "./features/auth/LoginPage";
import DailyDetailView from "./features/daily/DailyDetailView";
import DailyContentView from "./features/daily/DailyContentView";
import DailyCompleteView from "./features/daily/DailyCompleteView";
import WeeklyPage from "./features/weekly/WeeklyPage";
import WeeklyDrawPage from "./features/weekly/WeeklyDrawPage";
import WeeklyColorPage from "./features/weekly/WeeklyColorPage";
import WeeklyJournalPage from "./features/weekly/WeeklyJournalPage";
import HomePage from "./features/home/HomePage";
import WelcomePage from "./features/home/WelcomePage";
import WeeklyContentView from "./features/deep/WeeklyContentView";
import WeeklyHtpView from "./features/deep/WeeklyHtpView";
import OAuthSuccessPage from "./features/auth/OAuthSuccessPage";
// import MyPage from "./features/user/MyPage";
import PrivateRoute from "./routes/PrivateRoute";
import PublicRoute from "./routes/PublicRoute";
import { useAuthStore } from "./store/authStore";

import { FloatingDock } from "./components/shared/floating-dock";

function DashboardGate() {
  const { isAuthenticated, authTransitioning } = useAuthStore();
  const [loginMounted, setLoginMounted] = useState(true);
  const [fadeLogin, setFadeLogin] = useState(false);
  const [warpFlash, setWarpFlash] = useState(false);

  useEffect(() => {
    if (isAuthenticated && !authTransitioning) {
      setLoginMounted(false);
      setFadeLogin(false);
      setWarpFlash(false);
    }
    if (!isAuthenticated) {
      setLoginMounted(true);
      setFadeLogin(false);
    }
  }, [isAuthenticated, authTransitioning]);

  // 전환 중: 1.2초 후 밝은 섬광 → 1.5초 후 로그인 씬 페이드아웃 시작
  useEffect(() => {
    if (!authTransitioning) return;
    const flashTimer = setTimeout(() => setWarpFlash(true), 1200);
    const fadeTimer = setTimeout(() => setFadeLogin(true), 1500);
    return () => { clearTimeout(flashTimer); clearTimeout(fadeTimer); };
  }, [authTransitioning]);

  return (
    <div className="relative min-h-screen bg-black">
      {isAuthenticated && (
        <div className="absolute inset-0 z-0">
          <HomePage />
        </div>
      )}
      {loginMounted && (
        <div
          className="absolute inset-0 z-10"
          style={{
            opacity: fadeLogin ? 0 : 1,
            transition: "opacity 1.5s ease-in-out",
          }}
        >
          <LoginPage />
        </div>
      )}
      {/* 워프 섬광: 블랙홀 통과 순간 밝은 빛 */}
      {warpFlash && (
        <div
          className="absolute inset-0 z-20 pointer-events-none"
          style={{
            background: "radial-gradient(circle, rgba(255,248,220,0.6) 0%, rgba(255,200,100,0.2) 40%, transparent 70%)",
            animation: "warpFlash 1.8s ease-out forwards",
          }}
        />
      )}
    </div>
  );
}

import refreshApi from "./api/refreshApi";
import { fetchMe } from "./services/auth";

function App() {
  const location = useLocation();
  const { isAuthenticated } = useAuthStore();
  const [isInitializing, setIsInitializing] = useState(true);
  const initCalledRef = useRef(false);

  useEffect(() => {
    // StrictMode 더블 마운트에서 두 번째 실행 방지
    // (동시에 /auth/refresh 두 번 호출 시 백엔드가 첫 요청에서 토큰 교체 → 두 번째 요청 실패)
    if (initCalledRef.current) return;
    initCalledRef.current = true;

    const initAuth = async () => {
      const { isAuthenticated: authed, setTokens, clearAuth } = useAuthStore.getState();

      if (authed) {
        setIsInitializing(false);
        return;
      }

      try {
        const response: any = await refreshApi.post("/auth/refresh");
        const payload = response?.data;
        const accessToken = payload?.data?.accessToken ?? payload?.accessToken;

        if (accessToken) {
          setTokens(accessToken);
          // 토큰 복원 후 유저 프로필도 함께 로드
          try {
            await fetchMe();
          } catch (e) {
            console.error("[initAuth] fetchMe failed:", e);
          }
        } else {
          clearAuth();
        }
      } catch (err) {
        console.debug("Silent refresh failed or no cookie:", err);
        clearAuth();
      } finally {
        setIsInitializing(false);
      }
    };

    initAuth();
  }, []);

  // 인증 상태 확인 중에는 로딩 표시
  if (isInitializing) {
    return <div className="min-h-screen bg-black" />;
  }

  return (
    <>
      <Routes>
        <Route
          path="/"
          element={
            <PublicRoute redirectIfAuthenticated={false}>
              <DashboardGate />
            </PublicRoute>
          }
        />
        <Route
          path="/oauth/success"
          element={
            <PublicRoute redirectIfAuthenticated={true}>
              <OAuthSuccessPage />
            </PublicRoute>
          }
        />
        <Route
          path="/daily"
          element={
            <PrivateRoute>
              <Navigate to="/daily/content" replace />
            </PrivateRoute>
          }
        />
        <Route
          path="/daily/detail"
          element={
            <PrivateRoute>
              <DailyDetailView />
            </PrivateRoute>
          }
        />
        <Route
          path="/daily/complete"
          element={
            <PrivateRoute>
              <DailyCompleteView />
            </PrivateRoute>
          }
        />
        <Route
          path="/daily/content"
          element={
            <PrivateRoute>
              <DailyContentView />
            </PrivateRoute>
          }
        />
        <Route
          path="/daily/plan"
          element={
            <PrivateRoute>
              <WeeklyPage />
            </PrivateRoute>
          }
        />
        <Route
          path="/daily/draw"
          element={
            <PrivateRoute>
              <WeeklyDrawPage />
            </PrivateRoute>
          }
        />
        <Route
          path="/daily/color"
          element={
            <PrivateRoute>
              <WeeklyColorPage />
            </PrivateRoute>
          }
        />
        <Route
          path="/daily/journal"
          element={
            <PrivateRoute>
              <WeeklyJournalPage />
            </PrivateRoute>
          }
        />
        <Route
          path="/welcome"
          element={
            <PrivateRoute>
              <WelcomePage />
            </PrivateRoute>
          }
        />
        <Route
          path="/deep/content"
          element={
            <PrivateRoute>
              <WeeklyContentView />
            </PrivateRoute>
          }
        />
        <Route
          path="/deep/htp"
          element={
            <PrivateRoute>
              <WeeklyHtpView />
            </PrivateRoute>
          }
        />
        {/* <Route
          path="/mypage"
          element={
            <PrivateRoute>
              <MyPage />
            </PrivateRoute>
          }
        /> */}
        <Route
          path="/login"
          element={
            <Navigate to="/" replace />
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      {isAuthenticated && location.pathname === "/" && <FloatingDock />}
    </>
  );
}

export default App;
