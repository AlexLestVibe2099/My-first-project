import React from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import {
  AnalyticsPage,
  CalendarPage,
  LogPage,
  ProfilePage,
  SettingsPage,
  TodayPage
} from "./pages";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<TodayPage />} />
      <Route path="/calendar" element={<CalendarPage />} />
      <Route path="/log" element={<LogPage />} />
      <Route path="/analytics" element={<AnalyticsPage />} />
      <Route path="/profile" element={<ProfilePage />} />
      <Route path="/settings" element={<SettingsPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
