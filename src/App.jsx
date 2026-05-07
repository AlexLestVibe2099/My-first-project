import React from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { useAppData } from "./hooks/useAppData";
import { useAuth } from "./hooks/useAuth";
import {
  AnalyticsPage,
  CalendarPage,
  LogPage,
  ProfilePage,
  SettingsPage,
  TodayPage
} from "./pages";

export default function App() {
  const authState = useAuth();
  const appDataState = useAppData(authState.user);
  const sharedState = { ...appDataState, ...authState };

  return (
    <Routes>
      <Route path="/" element={<TodayPage {...sharedState} />} />
      <Route path="/calendar" element={<CalendarPage {...sharedState} />} />
      <Route path="/log" element={<LogPage {...sharedState} />} />
      <Route path="/analytics" element={<AnalyticsPage {...sharedState} />} />
      <Route path="/profile" element={<ProfilePage {...sharedState} />} />
      <Route path="/settings" element={<SettingsPage {...sharedState} />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
