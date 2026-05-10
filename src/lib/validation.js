const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

function isBlank(value) {
  return String(value ?? "").trim() === "";
}

export function validateEmail(email) {
  if (isBlank(email)) return "Email обязателен.";
  if (!EMAIL_RE.test(String(email).trim())) return "Укажи корректный email-адрес.";
  return null;
}

export function validatePassword(password) {
  if (isBlank(password)) return "Пароль обязателен.";
  if (String(password).length < 8) return "Пароль должен содержать минимум 8 символов.";
  return null;
}

export function validateDisplayName(name) {
  const normalized = String(name ?? "").trim();
  if (!normalized) return "Имя обязательно.";
  if (normalized.length > 50) return "Имя не должно превышать 50 символов.";
  return null;
}

export function validateAge(age) {
  if (age === null || age === undefined || String(age).trim() === "") return null;
  const numericAge = Number(age);
  if (!Number.isFinite(numericAge)) return "Возраст должен быть числом.";
  if (numericAge < 10 || numericAge > 100) return "Возраст должен быть от 10 до 100.";
  return null;
}

export function validateCity(city) {
  const normalized = String(city ?? "").trim();
  if (normalized.length > 100) return "Город не должен превышать 100 символов.";
  return null;
}

export function validatePainLevel(value) {
  if (isBlank(value)) return "Укажи уровень боли.";
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric < 0 || numeric > 10) {
    return "Боль должна быть числом от 0 до 10.";
  }
  return null;
}

export function validateSleepHours(value) {
  if (isBlank(value)) return "Укажи количество часов сна.";
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric < 0 || numeric > 24) {
    return "Сон должен быть числом от 0 до 24.";
  }
  return null;
}

export function validateMood(value) {
  const normalized = String(value ?? "").trim();
  if (!normalized) return "Укажи настроение.";
  if (normalized.length < 2) return "Настроение должно содержать минимум 2 символа.";
  return null;
}

export function validateEnergy(value) {
  if (isBlank(value)) return "Укажи уровень энергии.";
  return null;
}

export function validateDischarge(value) {
  if (isBlank(value)) return "Поле выделений не должно быть пустым.";
  return null;
}

export function validateSymptom(value, allowedSymptoms) {
  if (isBlank(value)) return "Выбери симптом из списка.";
  if (!allowedSymptoms?.has(value)) return "Выбери корректный симптом из списка.";
  return null;
}

export function validateNotes(value) {
  if (String(value ?? "").length > 300) return "Заметка не должна превышать 300 символов.";
  return null;
}

export function validateReminderTitle(value) {
  const normalized = String(value ?? "").trim();
  if (!normalized) return "Название напоминания обязательно.";
  if (normalized.length > 100) return "Название напоминания не должно превышать 100 символов.";
  return null;
}

export function validateTimeLocal(value) {
  const normalized = String(value ?? "").trim();
  if (!normalized) return "Укажи время напоминания.";
  if (!TIME_RE.test(normalized)) return "Время должно быть в формате HH:MM.";
  return null;
}
