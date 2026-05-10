import { supabase } from "./supabaseClient";
import { AppError, toAppError } from "./errors";
import {
  validateAge,
  validateCity,
  validateDischarge,
  validateDisplayName,
  validateEnergy,
  validateMood,
  validateNotes,
  validatePainLevel,
  validateReminderTitle,
  validateSleepHours,
  validateSymptom,
  validateTimeLocal
} from "./validation";

function throwIfInvalid(message) {
  if (message) throw new AppError(400, message);
}

export function guardOwnership(userId, targetUserId, isAdmin) {
  if (!userId) throw new AppError(401, "Требуется авторизация.");
  if (userId !== targetUserId && !isAdmin) {
    throw new AppError(403, "Нет прав");
  }
}

export function handleApiError(error) {
  const appError = toAppError(error, 400, "Ошибка запроса.");
  if (appError.status === 401 && typeof window !== "undefined") {
    window.location.hash = "/auth/login";
  }
  if (appError.status === 403) {
    return new AppError(403, "Нет прав");
  }
  return appError;
}

export async function saveCycleEntry(user, isAdmin, formData, allowedSymptoms) {
  if (!user?.id) throw new AppError(401, "Пользователь не авторизован.");
  const targetUserId = formData.user_id || user.id;
  guardOwnership(user.id, targetUserId, isAdmin);

  throwIfInvalid(validateSymptom(formData.symptom, allowedSymptoms));
  throwIfInvalid(validatePainLevel(formData.pain));
  throwIfInvalid(validateMood(formData.mood));
  throwIfInvalid(validateSleepHours(formData.sleepHours));
  throwIfInvalid(validateEnergy(formData.energy));
  throwIfInvalid(validateDischarge(formData.discharge));
  throwIfInvalid(validateNotes(formData.notes));

  const payload = {
    user_id: targetUserId,
    entry_date: formData.entryDate || new Date().toISOString().slice(0, 10),
    symptoms: formData.symptom ? [formData.symptom] : [],
    pain_level: Number(formData.pain),
    mood: formData.mood.trim(),
    sleep_hours: Number(formData.sleepHours),
    energy_level: formData.energy.trim(),
    discharge_type: formData.discharge.trim(),
    notes: formData.notes || ""
  };

  const { error } = await supabase
    .from("cycle_entries")
    .upsert(payload, { onConflict: "user_id,entry_date" });

  if (error) throw toAppError(error, 400, "Не удалось сохранить запись.");
}

export async function updateProfile(user, isAdmin, targetUserId, formData, privateData = {}) {
  if (!user?.id) throw new AppError(401, "Пользователь не авторизован.");
  guardOwnership(user.id, targetUserId, isAdmin);

  throwIfInvalid(validateDisplayName(formData.fullName));
  throwIfInvalid(validateAge(formData.age));
  throwIfInvalid(validateCity(formData.city));

  const ageValue = formData.age?.toString().trim() === "" ? null : Number(formData.age);
  const payload = {
    display_name: formData.fullName.trim(),
    notes_private: JSON.stringify({
      ...privateData,
      age: ageValue,
      city: (formData.city || "").trim(),
      phone: formData.phone || privateData.phone || ""
    })
  };

  const { error } = await supabase.from("profiles").update(payload).eq("id", targetUserId);
  if (error) throw toAppError(error, 400, "Не удалось обновить профиль.");
}

export async function saveUserSettings(user, isAdmin, targetUserId, formData) {
  if (!user?.id) throw new AppError(401, "Пользователь не авторизован.");
  guardOwnership(user.id, targetUserId, isAdmin);

  if (!["ru", "en"].includes(formData.language)) {
    throw new AppError(400, "Язык должен быть 'ru' или 'en'.");
  }
  if (!["light", "dark"].includes(formData.theme)) {
    throw new AppError(400, "Тема должна быть 'light' или 'dark'.");
  }
  if (!["DD.MM.YYYY", "MM/DD/YYYY", "YYYY-MM-DD"].includes(formData.date_format)) {
    throw new AppError(400, "Недопустимый формат даты.");
  }

  const { error } = await supabase.from("user_settings").upsert(
    {
      user_id: targetUserId,
      language: formData.language,
      theme: formData.theme,
      date_format: formData.date_format
    },
    { onConflict: "user_id" }
  );

  if (error) throw toAppError(error, 400, "Не удалось сохранить настройки.");
}

export async function saveReminder(user, isAdmin, reminderData) {
  if (!user?.id) throw new AppError(401, "Пользователь не авторизован.");
  const targetUserId = reminderData.user_id || user.id;
  guardOwnership(user.id, targetUserId, isAdmin);

  throwIfInvalid(validateReminderTitle(reminderData.title));
  throwIfInvalid(validateTimeLocal(reminderData.time_local));

  const { error } = await supabase.from("reminders").upsert({
    id: reminderData.id,
    user_id: targetUserId,
    title: reminderData.title.trim(),
    time_local: reminderData.time_local.trim(),
    is_enabled: Boolean(reminderData.is_enabled)
  });

  if (error) throw toAppError(error, 400, "Не удалось сохранить напоминание.");
}

export async function deleteReminder(user, isAdmin, reminderId, ownerId) {
  if (!user?.id) throw new AppError(401, "Пользователь не авторизован.");
  guardOwnership(user.id, ownerId, isAdmin);

  const { error } = await supabase.from("reminders").delete().eq("id", reminderId).eq("user_id", ownerId);
  if (error) throw toAppError(error, 400, "Не удалось удалить напоминание.");
}
