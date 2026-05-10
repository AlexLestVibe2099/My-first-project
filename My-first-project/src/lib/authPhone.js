import { supabase } from "./supabaseClient";

const KNOWN_PHONES_STORAGE_KEY = "known_phone_auth_accounts";

function normalizePhone(phone) {
  let digits = String(phone || "").replace(/\D/g, "");

  if (digits.length === 10) {
    digits = `7${digits}`;
  } else if (digits.length === 11 && digits.startsWith("8")) {
    digits = `7${digits.slice(1)}`;
  }

  if (digits.length !== 11 || !digits.startsWith("7")) {
    throw new Error("Укажи номер в формате +7XXXXXXXXXX.");
  }

  return `+${digits}`;
}

function phoneToEmail(phone) {
  return `${phone.replace(/\D/g, "")}@phone-user.example.com`;
}

function getKnownPhones() {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KNOWN_PHONES_STORAGE_KEY);
    const parsed = JSON.parse(raw || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveKnownPhone(phone) {
  if (typeof window === "undefined") return;
  const current = getKnownPhones();
  if (current.includes(phone)) return;
  window.localStorage.setItem(KNOWN_PHONES_STORAGE_KEY, JSON.stringify([...current, phone]));
}

function isRateLimitError(message) {
  if (!message) return false;
  return message.toLowerCase().includes("rate limit");
}

function isAlreadyRegisteredError(message) {
  if (!message) return false;
  const text = message.toLowerCase();
  return text.includes("already registered") || text.includes("already been registered");
}

function isInvalidCredentialsError(message) {
  if (!message) return false;
  const text = message.toLowerCase();
  return text.includes("invalid login credentials") || text.includes("user not found");
}

export async function signInOrSignUpByPhone(phone, pin) {
  const normalizedPhone = normalizePhone(phone);
  const normalizedPin = String(pin || "").trim();

  if (normalizedPin.length < 6) {
    throw new Error("PIN должен содержать минимум 6 символов.");
  }

  const email = phoneToEmail(normalizedPhone);

  const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password: normalizedPin
  });

  if (!signInError && signInData?.user) {
    saveKnownPhone(normalizedPhone);
    return { user: signInData.user, phone: normalizedPhone, isNewUser: false };
  }

  if (!isInvalidCredentialsError(signInError?.message)) {
    throw signInError || new Error("Не удалось выполнить вход.");
  }

  if (getKnownPhones().includes(normalizedPhone)) {
    throw new Error("Неверный PIN для этого номера телефона.");
  }

  const { error: signUpError } = await supabase.auth.signUp({
    email,
    password: normalizedPin,
    options: {
      data: {
        phone: normalizedPhone
      }
    }
  });

  if (signUpError) {
    if (isRateLimitError(signUpError.message)) {
      throw new Error("Слишком много попыток. Подожди 1-2 минуты и попробуй снова.");
    }
    if (isAlreadyRegisteredError(signUpError.message)) {
      saveKnownPhone(normalizedPhone);
      throw new Error("Аккаунт уже существует. Введи корректный PIN.");
    }
    throw signUpError;
  }

  const { data: retryData, error: retryError } = await supabase.auth.signInWithPassword({
    email,
    password: normalizedPin
  });

  if (retryError || !retryData?.user) {
    throw new Error(
      "Не удалось завершить вход после регистрации. Проверь, что в Supabase отключено обязательное подтверждение email."
    );
  }

  saveKnownPhone(normalizedPhone);
  return { user: retryData.user, phone: normalizedPhone, isNewUser: true };
}

export async function ensureUserRecords(userId, phone) {
  const { data: existingProfile, error: profileReadError } = await supabase
    .from("profiles")
    .select("id, notes_private")
    .eq("id", userId)
    .maybeSingle();

  if (profileReadError) throw profileReadError;

  if (!existingProfile) {
    const { error: profileCreateError } = await supabase.from("profiles").insert({
      id: userId,
      display_name: `Пользователь (${phone.slice(-4)})`,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
      notes_private: JSON.stringify({
        city: "",
        age: null,
        phone
      })
    });

    if (profileCreateError) throw profileCreateError;
  } else {
    let privateData = {};
    try {
      privateData = existingProfile.notes_private ? JSON.parse(existingProfile.notes_private) : {};
    } catch {
      privateData = {};
    }

    if (!privateData.phone) {
      const { error: profileUpdateError } = await supabase
        .from("profiles")
        .update({
          notes_private: JSON.stringify({
            ...privateData,
            phone
          })
        })
        .eq("id", userId);

      if (profileUpdateError) throw profileUpdateError;
    }
  }

  const { error: settingsError } = await supabase.from("user_settings").upsert(
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

  if (settingsError) throw settingsError;
}
