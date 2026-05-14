import fs from "node:fs";
import path from "node:path";
import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

const TODAY = new Date().toISOString().slice(0, 10);

function readEnvFromRoot() {
  const envPath = path.resolve(process.cwd(), ".env");
  const raw = fs.readFileSync(envPath, "utf8");
  const env = {};

  for (const line of raw.split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!match) continue;
    env[match[1]] = match[2];
  }

  return env;
}

const ENV = readEnvFromRoot();
const AUTH_EMAIL = process.env.E2E_AUTH_EMAIL || ENV.E2E_AUTH_EMAIL;
const AUTH_PASSWORD = process.env.E2E_AUTH_PASSWORD || ENV.E2E_AUTH_PASSWORD;

function requireE2ECredentials() {
  if (!AUTH_EMAIL || !AUTH_PASSWORD) {
    throw new Error(
      "Не заданы E2E_AUTH_EMAIL и E2E_AUTH_PASSWORD. Добавь их в .env или переменные окружения."
    );
  }
}

async function getAuthedSupabaseClient() {
  requireE2ECredentials();
  const env = ENV;
  const supabaseUrl = env.VITE_SUPABASE_URL || env.SUPABASE_URL;
  const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY || env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Не найден SUPABASE_URL/VITE_SUPABASE_URL или SUPABASE_ANON_KEY/VITE_SUPABASE_ANON_KEY");
  }

  const client = createClient(supabaseUrl, supabaseAnonKey);
  const { data, error } = await client.auth.signInWithPassword({
    email: AUTH_EMAIL,
    password: AUTH_PASSWORD
  });
  if (error) throw error;

  return { client, userId: data.user.id };
}

async function signOutClient(client) {
  await client.auth.signOut({ scope: "local" });
}

async function loginViaUi(page) {
  requireE2ECredentials();
  await page.goto("/#/auth/login");
  await page.getByLabel("Email").fill(AUTH_EMAIL);
  await page.getByLabel("Пароль").fill(AUTH_PASSWORD);
  await page.getByRole("button", { name: "Войти" }).click();
  await expect(page).toHaveURL(/#\/?$/, { timeout: 45_000 });
  // На медленном соединении блок контента может грузиться дольше, но навигация доступна раньше.
  await expect(page.getByRole("link", { name: "Профиль" })).toBeVisible({ timeout: 45_000 });
}

async function openTab(page, tabName) {
  await page.getByRole("link", { name: tabName }).first().click();
}

async function snapshotProfile(client, userId) {
  const { data, error } = await client
    .from("profiles")
    .select("display_name,notes_private")
    .eq("id", userId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

async function restoreProfile(client, userId, profileSnapshot) {
  if (!profileSnapshot) return;
  const { error } = await client
    .from("profiles")
    .update({
      display_name: profileSnapshot.display_name,
      notes_private: profileSnapshot.notes_private
    })
    .eq("id", userId);
  if (error) throw error;
}

async function snapshotTodayEntry(client, userId) {
  const { data, error } = await client
    .from("cycle_entries")
    .select("user_id,entry_date,symptoms,pain_level,mood,sleep_hours,energy_level,discharge_type,notes")
    .eq("user_id", userId)
    .eq("entry_date", TODAY)
    .maybeSingle();
  if (error && error.code !== "PGRST116") throw error;
  return data ?? null;
}

async function restoreTodayEntry(client, userId, entrySnapshot) {
  if (!entrySnapshot) {
    const { error } = await client
      .from("cycle_entries")
      .delete()
      .eq("user_id", userId)
      .eq("entry_date", TODAY);
    if (error) throw error;
    return;
  }

  const { error } = await client
    .from("cycle_entries")
    .upsert(
      {
        user_id: userId,
        entry_date: TODAY,
        symptoms: entrySnapshot.symptoms || [],
        pain_level: entrySnapshot.pain_level,
        mood: entrySnapshot.mood,
        sleep_hours: entrySnapshot.sleep_hours,
        energy_level: entrySnapshot.energy_level,
        discharge_type: entrySnapshot.discharge_type,
        notes: entrySnapshot.notes || ""
      },
      { onConflict: "user_id,entry_date" }
    );
  if (error) throw error;
}

async function fillDailyLogForm(page, values) {
  await page.getByLabel("Симптом").selectOption(values.symptom);
  await page.getByLabel("Боль (0-10)").fill(values.pain);
  await page.getByLabel("Настроение").fill(values.mood);
  await page.getByLabel("Сон (часы)").fill(values.sleepHours);
  await page.getByLabel("Энергия").fill(values.energy);
  await page.getByLabel("Выделения").fill(values.discharge);
  await page.getByLabel("Заметки").fill(values.notes);
}

test("Клиент входит в личный кабинет по почте и паролю", async ({ page }) => {
  await loginViaUi(page);
  await expect(page).toHaveURL(/#\/?$/);
  await expect(page.getByRole("link", { name: "Запись" })).toBeVisible();
});

test("Клиент изменяет персональные данные в профиле", async ({ page }) => {
  const { client, userId } = await getAuthedSupabaseClient();
  const initialProfile = await snapshotProfile(client, userId);
  const marker = Date.now();
  const nextName = `Автотест ${marker}`;
  const nextAge = "31";
  const nextCity = "Москва";

  try {
    await loginViaUi(page);
    await openTab(page, "Профиль");
    await page.getByRole("button", { name: "Редактировать персональные данные" }).click();

    await page.getByLabel("Имя").fill(nextName);
    await page.getByLabel("Возраст").fill(nextAge);
    await page.getByLabel("Город проживания").fill(nextCity);
    await page.getByRole("button", { name: "Сохранить" }).click();

    await expect(page.getByText("Персональные данные обновлены.")).toBeVisible();
    await expect(page.getByText(`Имя: ${nextName}`)).toBeVisible();
    await expect(page.getByText(`Возраст: ${nextAge}`)).toBeVisible();
    await expect(page.getByText(`Город проживания: ${nextCity}`)).toBeVisible();
  } finally {
    await restoreProfile(client, userId, initialProfile);
    await signOutClient(client);
  }
});

test("Клиент заполняет запись самочувствия и сохраняет заметку", async ({ page }) => {
  const { client, userId } = await getAuthedSupabaseClient();
  const initialEntry = await snapshotTodayEntry(client, userId);
  const noteText = `Автотест запись ${Date.now()}`;

  try {
    await loginViaUi(page);
    await openTab(page, "Запись");
    await fillDailyLogForm(page, {
      symptom: "headache",
      pain: "4",
      mood: "Спокойное",
      sleepHours: "8",
      energy: "Средняя",
      discharge: "Умеренные",
      notes: noteText
    });

    await page.getByRole("button", { name: "Сохранить" }).click();
    await expect(page.getByText("Запись успешно сохранена.")).toBeVisible();
  } finally {
    await restoreTodayEntry(client, userId, initialEntry);
    await signOutClient(client);
  }
});

test("Клиент видит AI-рекомендацию на странице Сегодня после записи", async ({ page }) => {
  const { client, userId } = await getAuthedSupabaseClient();
  const initialEntry = await snapshotTodayEntry(client, userId);
  const noteText = `Проверка AI ${Date.now()}`;

  try {
    await loginViaUi(page);
    await openTab(page, "Запись");
    await fillDailyLogForm(page, {
      symptom: "cramps",
      pain: "6",
      mood: "Усталость",
      sleepHours: "7",
      energy: "Низкая",
      discharge: "Скудные",
      notes: noteText
    });
    await page.getByRole("button", { name: "Сохранить" }).click();
    await expect(page.getByText("Запись успешно сохранена.")).toBeVisible();

    await openTab(page, "Сегодня");
    const aiCard = page.getByRole("heading", { name: "AI-рекомендация дня" }).locator("..");
    await expect(aiCard.getByText("Источник:")).toBeVisible();
    await expect(aiCard.locator("p").first()).not.toHaveText("Готовлю рекомендацию...", { timeout: 30_000 });
    await expect(aiCard.locator("p").first()).toContainText(/\S+/);
  } finally {
    await restoreTodayEntry(client, userId, initialEntry);
    await signOutClient(client);
  }
});

test("Клиент получает ошибки при неполном заполнении записи", async ({ page }) => {
  await loginViaUi(page);
  await openTab(page, "Запись");

  await page.getByLabel("Симптом").selectOption("");
  await page.getByLabel("Боль (0-10)").fill("");
  await page.getByLabel("Настроение").fill("");
  await page.getByLabel("Сон (часы)").fill("");
  await page.getByLabel("Энергия").fill("");
  await page.getByLabel("Выделения").fill("");

  await page.getByRole("button", { name: "Сохранить" }).click();

  await expect(page.getByText("Выбери симптом из списка.")).toBeVisible();
  await expect(page.getByText("Укажи уровень боли.")).toBeVisible();
  await expect(page.getByText("Укажи настроение.")).toBeVisible();
  await expect(page.getByText("Укажи количество часов сна.")).toBeVisible();
  await expect(page.getByText("Укажи уровень энергии.")).toBeVisible();
  await expect(page.getByText("Поле выделений не должно быть пустым.")).toBeVisible();
  await expect(page.getByText("Запись успешно сохранена.")).not.toBeVisible();
});
