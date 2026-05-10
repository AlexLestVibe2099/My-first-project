import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

const APP_DATA_CACHE_PREFIX = "cyclecare_app_data_v1:";

function readCachedData(userId) {
  if (!userId || typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(`${APP_DATA_CACHE_PREFIX}${userId}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

function writeCachedData(userId, value) {
  if (!userId || typeof window === "undefined" || !value) return;
  try {
    window.localStorage.setItem(`${APP_DATA_CACHE_PREFIX}${userId}`, JSON.stringify(value));
  } catch {
    // Игнорируем ошибки localStorage (например, quota exceeded).
  }
}

function formatDate(dateString) {
  if (!dateString) return "Нет данных";
  const date = new Date(dateString);
  return date.toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" });
}

function monthNameNow() {
  const date = new Date();
  return date.toLocaleDateString("ru-RU", { month: "long", year: "numeric" });
}

function mapEventToBadge(type) {
  if (!type) return "predicted";
  if (type.includes("period")) return "period";
  if (type.includes("ovulation")) return "ovulation";
  if (type.includes("fertile")) return "fertile";
  return "predicted";
}

function buildHistory(entries) {
  const byMonth = new Map();
  entries.forEach((entry) => {
    if (!entry.entry_date) return;
    const month = new Date(entry.entry_date).toLocaleDateString("ru-RU", { month: "long" });
    const current = byMonth.get(month) || { count: 0 };
    current.count += 1;
    byMonth.set(month, current);
  });

  return Array.from(byMonth.entries())
    .slice(0, 6)
    .map(([cycle, meta]) => ({
      cycle: cycle.charAt(0).toUpperCase() + cycle.slice(1),
      length: meta.count,
      periodDays: Math.min(meta.count, 7)
    }));
}

function parsePrivateData(notesPrivate) {
  if (!notesPrivate) return {};
  try {
    const parsed = JSON.parse(notesPrivate);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export function useAppData(user) {
  const [data, setData] = useState(() => readCachedData(user?.id));
  const [loading, setLoading] = useState(() => Boolean(user?.id) && !readCachedData(user?.id));
  const [error, setError] = useState("");

  const fetchData = useCallback(async () => {
    if (!user?.id) {
      setData(null);
      setError("");
      setLoading(false);
      return;
    }

    const cachedData = readCachedData(user.id);
    if (cachedData) {
      setData(cachedData);
      setLoading(false);
    } else {
      setLoading(true);
    }
    setError("");

    try {
      const [
        { data: profile, error: profileError },
        { data: settings, error: settingsError },
        { data: remindersRows, error: remindersError },
        { data: entries, error: entriesError },
        { data: events, error: eventsError }
      ] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
        supabase.from("user_settings").select("*").eq("user_id", user.id).maybeSingle(),
        supabase.from("reminders").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
        supabase.from("cycle_entries").select("*").eq("user_id", user.id).order("entry_date", { ascending: false }),
        supabase.from("cycle_events").select("*").eq("user_id", user.id).order("event_date", { ascending: false })
      ]);

      const queryError = profileError || settingsError || remindersError || entriesError || eventsError;
      if (queryError) throw queryError;

      const reminders = (remindersRows || []).map((item) => ({
        id: item.id,
        title: item.title,
        time: item.time_local || "Без времени",
        enabled: item.is_enabled
      }));

      const latestEntry = entries?.[0];
      const latestEvent = events?.[0];

      const thisMonth = new Date().getMonth();
      const thisYear = new Date().getFullYear();
      const monthEvents =
        events?.filter((event) => {
          const date = new Date(event.event_date);
          return date.getMonth() === thisMonth && date.getFullYear() === thisYear;
        }) || [];

      const markedDays = monthEvents.map((event) => ({
        day: new Date(event.event_date).getDate(),
        type: mapEventToBadge(event.event_type)
      }));

      const moodTrend = (entries || [])
        .filter((entry) => entry.mood)
        .slice(0, 5)
        .map((entry) => entry.mood);

      const symptomCounts = {};
      (entries || []).forEach((entry) => {
        const symptoms = Array.isArray(entry.symptoms)
          ? entry.symptoms
          : entry.symptom
            ? [entry.symptom]
            : [];
        symptoms.forEach((symptom) => {
          symptomCounts[symptom] = (symptomCounts[symptom] || 0) + 1;
        });
      });

      const commonSymptoms = Object.entries(symptomCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([name]) => name);

      const privateData = parsePrivateData(profile?.notes_private);
      const phoneFromAuth = user?.user_metadata?.phone || user?.phone || "";
      const ageValue = Number(privateData.age);

      const nextData = {
        today: {
          date: formatDate(latestEntry?.entry_date),
          cycleDay: latestEntry?.cycle_day ?? "Нет данных",
          phase: latestEvent?.event_type || "Нет данных",
          nextPeriodInDays: "Нет данных",
          reminders: reminders.filter((item) => item.enabled).map((item) => item.title),
          quickStats: {
            mood: latestEntry?.mood || "Нет данных",
            pain: latestEntry?.pain_level ?? "Нет данных",
            energy: latestEntry?.energy_level || "Нет данных"
          },
          note: latestEntry?.notes || "Пока нет записей."
        },
        calendar: {
          monthName: monthNameNow(),
          markedDays,
          history: buildHistory(entries || [])
        },
        dailyLog: {
          date: formatDate(latestEntry?.entry_date || new Date().toISOString()),
          symptom: latestEntry?.symptom || (Array.isArray(latestEntry?.symptoms) ? latestEntry.symptoms[0] || "" : ""),
          pain: latestEntry?.pain_level ?? "",
          mood: latestEntry?.mood || "",
          sleepHours: latestEntry?.sleep_hours ?? "",
          energy: latestEntry?.energy_level || "",
          discharge: latestEntry?.discharge_type || "",
          notes: latestEntry?.notes || ""
        },
        analytics: {
          avgCycleLength: profile?.cycle_length_avg ?? "Нет данных",
          regularity: profile?.cycle_length_avg ? "Стабильный" : "Недостаточно данных",
          commonSymptoms: commonSymptoms.length ? commonSymptoms : ["Нет данных"],
          moodTrend: moodTrend.length ? moodTrend : ["Нет данных"]
        },
        profile: {
          name: profile?.display_name || "Пользователь",
          averageCycleLength: profile?.cycle_length_avg ?? "Нет данных",
          periodLength: profile?.period_length_avg ?? "Нет данных",
          cyclesCount: entries?.length || 0,
          personal: {
            fullName: profile?.display_name || "",
            age: Number.isFinite(ageValue) ? String(ageValue) : "",
            city: privateData.city || "",
            email: user?.email || "Нет данных",
            phone: phoneFromAuth || privateData.phone || "Нет данных",
            privateData
          },
          settings: {
            darkMode: settings?.theme === "dark",
            language: settings?.language || "ru",
            dateFormat: settings?.date_format || "DD.MM.YYYY"
          }
        },
        reminders
      };

      setData(nextData);
      writeCachedData(user.id, nextData);
    } catch (err) {
      setError(err.message || "Не удалось загрузить данные из Supabase.");
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refresh: fetchData };
}
