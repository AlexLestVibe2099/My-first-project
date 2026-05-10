import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

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
  } catch {
    // Игнорируем ошибки очистки localStorage.
  }
}

export function useAuth() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session || null);
      setLoading(false);
    });

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession || null);
      setLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  async function signOut() {
    let signOutError = null;
    try {
      const { error } = await supabase.auth.signOut({ scope: "local" });
      signOutError = error || null;
      if (error) {
        const fallback = await supabase.auth.signOut();
        if (fallback.error) {
          signOutError = fallback.error;
        } else {
          signOutError = null;
        }
      }
    } finally {
      clearSupabaseAuthStorage();
      setSession(null);
    }

    if (signOutError) throw signOutError;
  }

  return {
    session,
    user: session?.user || null,
    loading,
    signOut
  };
}
