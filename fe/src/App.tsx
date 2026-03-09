import { Navigate, Route, Routes } from "react-router-dom";
import LoginPage from "./features/auth/LoginPage";
import SignupPage from "./features/auth/SignupPage";
import DailyDetailPage from "./features/daily/DailyDetailPage";
import DailyContentPage from "./features/daily/DailyContentPage";
import DailyCompletePage from "./features/daily/DailyCompletePage";
import WeeklyPage from "./features/weekly/WeeklyPage";
import WeeklyDrawPage from "./features/weekly/WeeklyDrawPage";
import WeeklyColorPage from "./features/weekly/WeeklyColorPage";
import WeeklyJournalPage from "./features/weekly/WeeklyJournalPage";
import HomePage from "./features/home/HomePage";
import LandingPage from "./features/home/LandingPage";
import WelcomePage from "./features/home/WelcomePage";
import DeepContentPage from "./features/deep/DeepContentPage";
import HTPPage from "./features/deep/HTPPage";
import PrivateRoute from "./routes/PrivateRoute";
import PublicRoute from "./routes/PublicRoute";

import { FloatingDock } from "./components/shared/floating-dock";

function App() {
  return (
    <>
      <Routes>
        <Route
          path="/"
          element={
            <PublicRoute redirectIfAuthenticated={false}>
              <LandingPage />
            </PublicRoute>
          }
        />
        <Route
          path="/dashboard"
          element={
            <PrivateRoute>
              <HomePage />
            </PrivateRoute>
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
            <PublicRoute redirectIfAuthenticated={false}>
              <LoginPage />
            </PublicRoute>
          }
        />
        <Route
          path="/signup"
          element={
            <PublicRoute redirectIfAuthenticated={false}>
              <SignupPage />
            </PublicRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <FloatingDock />
    </>
  );
}

export default App;
