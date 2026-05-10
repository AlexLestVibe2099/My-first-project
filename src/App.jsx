import React from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute";
import { useAppData } from "./hooks/useAppData";
import { useAuth } from "./hooks/useAuth";
import {
  AnalyticsPage,
  AuthPage,
  CalendarPage,
  LogPage,
  ProfilePage,
  ResetPasswordPage,
  SettingsPage,
  TodayPage
} from "./pages";

export default function App() {
  const authState = useAuth();
  const appDataState = useAppData(authState.user);
  const sharedState = {
    ...authState,
    ...appDataState,
    authLoading: authState.loading
  };

  return (
    <Routes>
      <Route
        path="/auth"
        element={
          authState.user && !authState.loading
            ? <Navigate to="/" replace />
            : <Navigate to="/auth/login" replace />
        }
      />
      <Route
        path="/auth/login"
        element={
          authState.user && !authState.loading
            ? <Navigate to="/" replace />
            : <AuthPage {...sharedState} initialMode="signin" />
        }
      />
      <Route
        path="/auth/register"
        element={
          authState.user && !authState.loading
            ? <Navigate to="/" replace />
            : <AuthPage {...sharedState} initialMode="signup" />
        }
      />
      <Route
        path="/auth/reset-password"
        element={<ResetPasswordPage {...sharedState} />}
      />
      <Route
        path="/"
        element={
          <ProtectedRoute user={authState.user} authLoading={authState.loading}>
            <TodayPage {...sharedState} />
          </ProtectedRoute>
        }
      />
      <Route
        path="/calendar"
        element={
          <ProtectedRoute user={authState.user} authLoading={authState.loading}>
            <CalendarPage {...sharedState} />
          </ProtectedRoute>
        }
      />
      <Route
        path="/log"
        element={
          <ProtectedRoute user={authState.user} authLoading={authState.loading}>
            <LogPage {...sharedState} />
          </ProtectedRoute>
        }
      />
      <Route
        path="/analytics"
        element={
          <ProtectedRoute user={authState.user} authLoading={authState.loading}>
            <AnalyticsPage {...sharedState} />
          </ProtectedRoute>
        }
      />
      <Route
        path="/profile"
        element={
          <ProtectedRoute user={authState.user} authLoading={authState.loading}>
            <ProfilePage {...sharedState} />
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings"
        element={
          <ProtectedRoute user={authState.user} authLoading={authState.loading}>
            <SettingsPage {...sharedState} />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
