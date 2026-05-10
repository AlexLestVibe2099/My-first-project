import React from "react";
import { Navigate } from "react-router-dom";

export default function ProtectedRoute({ user, authLoading, children }) {
  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <p className="text-slate-400">Загрузка...</p>
      </div>
    );
  }
  if (!user) {
    return <Navigate to="/auth/login" replace />;
  }
  return children;
}
