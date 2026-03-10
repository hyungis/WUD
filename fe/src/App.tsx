import { Navigate, Route, Routes } from "react-router-dom";
import { useState, useEffect } from "react";
import LoginPage from "./features/auth/LoginPage";
import DailyDetailPage from "./features/daily/DailyDetailPage";
import DailyContentPage from "./features/daily/DailyContentPage";
import DailyCompletePage from "./features/daily/DailyCompletePage";
import WeeklyPage from "./features/weekly/WeeklyPage";
import WeeklyDrawPage from "./features/weekly/WeeklyDrawPage";
import WeeklyColorPage from "./features/weekly/WeeklyColorPage";
import WeeklyJournalPage from "./features/weekly/WeeklyJournalPage";
import HomePage from "./features/home/HomePage";
import WelcomePage from "./features/home/WelcomePage";
import DeepContentPage from "./features/deep/DeepContentPage";
import HTPPage from "./features/deep/HTPPage";
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

function App() {
  const { isAuthenticated } = useAuthStore();
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
              <DailyDetailPage />
            </PrivateRoute>
          }
        />
        <Route
          path="/daily/complete"
          element={
            <PrivateRoute>
              <DailyCompletePage />
            </PrivateRoute>
          }
        />
        <Route
          path="/daily/content"
          element={
            <PrivateRoute>
              <DailyContentPage />
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
              <DeepContentPage />
            </PrivateRoute>
          }
        />
        <Route
          path="/deep/htp"
          element={
            <PrivateRoute>
              <HTPPage />
            </PrivateRoute>
          }
        />
        <Route
          path="/login"
          element={
            <Navigate to="/" replace />
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      {isAuthenticated && <FloatingDock />}
    </>
  );
}

export default App;
