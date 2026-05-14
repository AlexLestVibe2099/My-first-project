import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

const ACCESS_TOKEN_STORAGE_KEY = "cyclecare_access_token";

function clearSupabaseAuthStorage() {
  if (typeof window === "undefined") return;
  try {
    Object.keys(window.localStorage).forEach((key) => {
      if (key.startsWith("sb-") && key.endsWith("-auth-token")) {
        window.localStorage.removeItem(key);
      }
      if (key.startsWith("cyclecare_app_data_v1:")) {
        window.localStorage.removeItem(key);
      }
    });
    window.localStorage.removeItem(ACCESS_TOKEN_STORAGE_KEY);
  } catch {
    // Игнорируем ошибки очистки localStorage.
  }
}

function persistAccessToken(session) {
  if (typeof window === "undefined") return;
  try {
    if (session?.access_token) {
      window.localStorage.setItem(ACCESS_TOKEN_STORAGE_KEY, session.access_token);
    } else {
      window.localStorage.removeItem(ACCESS_TOKEN_STORAGE_KEY);
    }
  } catch {
    // Игнорируем ошибки localStorage.
  }
}

function parseRecoveryParamsFromUrl() {
  if (typeof window === "undefined") return null;

  const href = window.location.href;
  const url = new URL(href);

  // Supabase recovery params могут оказаться в search, hash или после второго '#'
  // при использовании HashRouter: /#/auth/reset-password#access_token=...
  const candidates = [];
  if (url.search) candidates.push(url.search.replace(/^\?/, ""));
  if (url.hash) candidates.push(url.hash.replace(/^#/, ""));
  href.split("#").forEach((part) => {
    if (part.includes("access_token=") || part.includes("refresh_token=")) {
      candidates.push(part.replace(/^[^?]*\?/, ""));
    }
  });

  const merged = {};
  candidates.forEach((part) => {
    const normalized = part.includes("?") ? part.slice(part.indexOf("?") + 1) : part;
    const params = new URLSearchParams(normalized);
    params.forEach((value, key) => {
      merged[key] = value;
    });
  });

  const accessToken = merged.access_token;
  const refreshToken = merged.refresh_token;
  const type = merged.type;

  if (!accessToken || !refreshToken || type !== "recovery") return null;
  return { accessToken, refreshToken };
}

async function ensureRecoverySessionFromUrl() {
  const tokens = parseRecoveryParamsFromUrl();
  if (!tokens) return false;

  await supabase.auth.setSession({
    access_token: tokens.accessToken,
    refresh_token: tokens.refreshToken
  });

  const cleanUrl = `${window.location.origin}/#/auth/reset-password`;
  window.history.replaceState({}, document.title, cleanUrl);
  return true;
}

async function fetchUserRole(userId) {
  if (!userId) return null;
  const rolePromise = supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle();

  const timeoutPromise = new Promise((resolve) => {
    setTimeout(() => resolve({ data: null, error: new Error("timeout") }), 7000);
  });

  const { data, error } = await Promise.race([rolePromise, timeoutPromise]);

  // Не блокируем приложение, если роль не удалось прочитать (RLS/нет профиля и т.п.).
  if (error) return "user";
  return data?.role || "user";
}

export function useAuth() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState(null);

  useEffect(() => {
    let mounted = true;

    async function initAuth() {
      if (!mounted) return;
      try {
        await ensureRecoverySessionFromUrl();
        const { data } = await supabase.auth.getSession();
        if (!mounted) return;
        const sess = data?.session || null;
        setSession(sess);
        persistAccessToken(sess);
        const userRole = await fetchUserRole(sess?.user?.id);
        if (mounted) setRole(userRole);
      } catch {
        if (!mounted) return;
        setSession(null);
        setRole(null);
        persistAccessToken(null);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    initAuth();

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange(async (_event, nextSession) => {
      if (!mounted) return;
      try {
        setSession(nextSession || null);
        persistAccessToken(nextSession || null);
        const userRole = await fetchUserRole(nextSession?.user?.id);
        if (mounted) setRole(userRole);
      } finally {
        if (mounted) setLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  async function signOut() {
    // Мгновенно очищаем локальную сессию, чтобы ProtectedRoute сразу перенаправил на /auth/login.
    clearSupabaseAuthStorage();
    setSession(null);
    setRole(null);

    let signOutError = null;
    try {
      const { error } = await supabase.auth.signOut({ scope: "local" });
      signOutError = error || null;
      if (error) {
        const fallback = await supabase.auth.signOut();
        signOutError = fallback.error || null;
      }
    } catch (error) {
      signOutError = error || signOutError;
    }
    if (signOutError) throw signOutError;
  }

  return {
    session,
    user: session?.user || null,
    role,
    isAdmin: role === "admin",
    loading,
    signOut
  };
}
