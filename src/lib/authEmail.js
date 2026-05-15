import { supabase } from "./supabaseClient";
import { AppError, toAppError } from "./errors";
import { validateEmail, validatePassword } from "./validation";

function getBaseAuthUrl() {
  const envUrl = import.meta.env.VITE_APP_URL;
  if (typeof envUrl === "string" && envUrl.trim()) {
    return envUrl.trim().replace(/\/+$/, "");
  }

  if (typeof window !== "undefined") {
    return window.location.origin;
  }

  return undefined;
}

function getSignUpRedirectUrl() {
  const baseUrl = getBaseAuthUrl();
  return baseUrl ? `${baseUrl}/#/auth/login` : undefined;
}

function getPasswordRecoveryRedirectUrl() {
  const baseUrl = getBaseAuthUrl();
  return baseUrl ? `${baseUrl}/#/auth/reset-password` : undefined;
}

export function validateSignIn(email, password) {
  const errors = {};
  const emailErr = validateEmail(email);
  if (emailErr) errors.email = emailErr;
  if (!password) errors.password = "Пароль обязателен.";
  return errors;
}

export function validateSignUp(email, password, confirmPassword) {
  const errors = {};
  const emailErr = validateEmail(email);
  if (emailErr) errors.email = emailErr;
  const passwordErr = validatePassword(password);
  if (passwordErr) errors.password = passwordErr;
  if (password && confirmPassword !== password) {
    errors.confirmPassword = "Пароли не совпадают.";
  }
  return errors;
}

// ── Supabase Auth операции ───────────────────────────────────────────────────

export async function signUpWithEmail(email, password) {
  const { data, error } = await supabase.auth.signUp({
    email: email.trim().toLowerCase(),
    password,
    options: {
      emailRedirectTo: getSignUpRedirectUrl()
    }
  });
  if (error) throw new AppError(400, error.message || "Не удалось создать аккаунт.");
  return data;
}

export async function signInWithEmail(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim().toLowerCase(),
    password
  });
  if (error) throw new AppError(400, error.message || "Не удалось выполнить вход.");
  return data;
}

export async function resetPassword(email) {
  const emailErr = validateEmail(email);
  if (emailErr) throw new AppError(400, emailErr);
  const redirectTo = getPasswordRecoveryRedirectUrl();

  const { error } = await supabase.auth.resetPasswordForEmail(
    email.trim().toLowerCase(),
    { redirectTo }
  );
  if (error) throw new AppError(400, error.message || "Не удалось отправить письмо для сброса.");
}

export async function updatePassword(newPassword) {
  const passwordErr = validatePassword(newPassword);
  if (passwordErr) throw new AppError(400, passwordErr);

  const { data, error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw new AppError(400, error.message || "Не удалось обновить пароль.");
  return data;
}

// ── Создание профиля при первом входе ────────────────────────────────────────

export async function ensureUserProfile(userId) {
  const { data: existing, error: readErr } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", userId)
    .maybeSingle();

  if (readErr) throw toAppError(readErr, 400, "Не удалось проверить профиль.");

  if (!existing) {
    const { error: insertErr } = await supabase.from("profiles").insert({
      id: userId,
      display_name: "Пользователь",
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
      notes_private: JSON.stringify({ city: "", age: null })
    });
    if (insertErr) throw toAppError(insertErr, 400, "Не удалось создать профиль.");
  }

  const { error: settingsErr } = await supabase.from("user_settings").upsert(
    {
      user_id: userId,
      language: "ru",
      theme: "light",
      date_format: "DD.MM.YYYY",
      notifications_enabled: true,
      security_mode: "none"
    },
    { onConflict: "user_id" }
  );
  if (settingsErr) throw toAppError(settingsErr, 400, "Не удалось создать настройки пользователя.");
}
