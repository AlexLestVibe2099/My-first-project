import React, { useEffect, useState } from "react";
import Layout from "./components/Layout";
import { ensureUserRecords, signInOrSignUpByPhone } from "./lib/authPhone";
import { supabase } from "./lib/supabaseClient";

function Card({ title, children }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
      <h2 className="mb-3 text-sm font-semibold sm:text-base">{title}</h2>
      {children}
    </section>
  );
}

function PageState({ title, loading, error, user, authLoading, children }) {
  if (authLoading) {
    return (
      <Layout title={title}>
        <Card title={title}>
          <p className="text-sm sm:text-base">Загрузка...</p>
        </Card>
      </Layout>
    );
  }

  if (!user) {
    return (
      <Layout title={title}>
        <Card title={title}>
          <p className="text-sm sm:text-base">Войди через раздел Профиль, чтобы видеть личные данные.</p>
        </Card>
      </Layout>
    );
  }

  if (loading) {
    return (
      <Layout title={title}>
        <Card title={title}>
          <p className="text-sm sm:text-base">Загрузка...</p>
        </Card>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout title={title}>
        <Card title={title}>
          <p className="text-sm text-rose-600 sm:text-base">Ошибка загрузки: {error}</p>
        </Card>
      </Layout>
    );
  }

  return <Layout title={title}>{children}</Layout>;
}

export function TodayPage({ data, loading, error, user, authLoading }) {
  const today = data?.today;

  return (
    <PageState title="Сегодня" loading={loading} error={error} user={user} authLoading={authLoading}>
      <div className="grid gap-3 sm:gap-4 md:grid-cols-2">
        <Card title="Статус цикла">
          <div className="space-y-1 text-sm sm:text-base">
            <p>Дата: {today?.date}</p>
            <p>День цикла: {today?.cycleDay}</p>
            <p>Фаза: {today?.phase}</p>
            <p>До следующих месячных: {today?.nextPeriodInDays}</p>
          </div>
        </Card>
        <Card title="Быстрые показатели">
          <div className="space-y-1 text-sm sm:text-base">
            <p>Настроение: {today?.quickStats?.mood}</p>
            <p>Боль: {today?.quickStats?.pain}</p>
            <p>Энергия: {today?.quickStats?.energy}</p>
          </div>
        </Card>
        <Card title="Ближайшие напоминания">
          <ul className="list-disc space-y-1 pl-5 text-sm sm:text-base">
            {(today?.reminders || []).map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </Card>
        <Card title="Заметка дня">
          <p className="text-sm leading-relaxed sm:text-base">{today?.note}</p>
        </Card>
      </div>
    </PageState>
  );
}

function dayBadge(type) {
  if (type === "period") return "bg-rose-100 text-rose-700";
  if (type === "ovulation") return "bg-violet-100 text-violet-700";
  if (type === "fertile") return "bg-emerald-100 text-emerald-700";
  return "bg-slate-100 text-slate-700";
}

export function CalendarPage({ data, loading, error, user, authLoading }) {
  const calendar = data?.calendar;

  return (
    <PageState title="Календарь цикла" loading={loading} error={error} user={user} authLoading={authLoading}>
      <div className="space-y-3 sm:space-y-4">
        <Card title={calendar?.monthName}>
          <div className="overflow-x-auto pb-1">
            <div className="grid min-w-[320px] grid-cols-7 gap-1.5 text-center text-xs sm:gap-2 sm:text-sm">
              {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => {
                const mark = (calendar?.markedDays || []).find((d) => d.day === day);
                return (
                  <div key={day} className={`rounded-md p-1.5 sm:p-2 ${dayBadge(mark?.type)}`}>
                    {day}
                  </div>
                );
              })}
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2 text-[11px] sm:text-xs">
            <span className="rounded bg-rose-100 px-2 py-1 text-rose-700">Месячные</span>
            <span className="rounded bg-violet-100 px-2 py-1 text-violet-700">Овуляция</span>
            <span className="rounded bg-emerald-100 px-2 py-1 text-emerald-700">Фертильные дни</span>
            <span className="rounded bg-slate-100 px-2 py-1 text-slate-700">Прогноз</span>
          </div>
        </Card>
        <Card title="История циклов">
          <ul className="space-y-2 text-sm sm:text-base">
            {(calendar?.history || []).map((item) => (
              <li key={item.cycle} className="rounded bg-slate-100 p-2">
                {item.cycle}: длина цикла {item.length} дн., месячные {item.periodDays} дн.
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </PageState>
  );
}

export function LogPage({ data, loading, error, refresh, user, authLoading }) {
  const dailyLog = data?.dailyLog;
  const [formData, setFormData] = useState({
    pain: "",
    mood: "",
    sleepHours: "",
    energy: "",
    discharge: "",
    notes: ""
  });
  const [errors, setErrors] = useState({});
  const [submitMessage, setSubmitMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!dailyLog) return;
    setFormData({
      pain: String(dailyLog.pain ?? ""),
      mood: dailyLog.mood || "",
      sleepHours: String(dailyLog.sleepHours ?? ""),
      energy: dailyLog.energy || "",
      discharge: dailyLog.discharge || "",
      notes: dailyLog.notes || ""
    });
  }, [dailyLog]);

  function validate(values) {
    const nextErrors = {};

    const painNumber = Number(values.pain);
    if (values.pain.trim() === "") {
      nextErrors.pain = "Укажи уровень боли.";
    } else if (!Number.isFinite(painNumber) || painNumber < 0 || painNumber > 10) {
      nextErrors.pain = "Боль должна быть числом от 0 до 10.";
    }

    if (values.mood.trim().length < 2) {
      nextErrors.mood = "Настроение должно содержать минимум 2 символа.";
    }

    const sleepNumber = Number(values.sleepHours);
    if (values.sleepHours.trim() === "") {
      nextErrors.sleepHours = "Укажи количество часов сна.";
    } else if (!Number.isFinite(sleepNumber) || sleepNumber < 0 || sleepNumber > 24) {
      nextErrors.sleepHours = "Сон должен быть числом от 0 до 24.";
    }

    if (values.energy.trim() === "") {
      nextErrors.energy = "Укажи уровень энергии.";
    }

    if (values.discharge.trim() === "") {
      nextErrors.discharge = "Поле не должно быть пустым.";
    }

    if (values.notes.length > 300) {
      nextErrors.notes = "Заметка не должна превышать 300 символов.";
    }

    return nextErrors;
  }

  function handleChange(event) {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: undefined }));
    setSubmitMessage("");
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const nextErrors = validate(formData);

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      setSubmitMessage("");
      return;
    }

    setIsSubmitting(true);
    setErrors({});

    try {
      if (!user) {
        throw new Error("Пользователь не авторизован. Войди в аккаунт и попробуй снова.");
      }

      const { error: saveError } = await supabase.from("cycle_entries").insert({
        user_id: user.id,
        entry_date: new Date().toISOString().slice(0, 10),
        pain_level: Number(formData.pain),
        mood: formData.mood,
        sleep_hours: Number(formData.sleepHours),
        energy_level: formData.energy,
        discharge_type: formData.discharge,
        notes: formData.notes
      });

      if (saveError) throw saveError;

      setSubmitMessage("Запись успешно сохранена.");
      if (refresh) {
        await refresh();
      }
    } catch (submitError) {
      setSubmitMessage(`Ошибка сохранения: ${submitError.message}`);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <PageState title="Запись самочувствия" loading={loading} error={error} user={user} authLoading={authLoading}>
      {/* Поля не отправляют данные, валидация демонстрирует готовность к реальному submit. */}
      <Card title={`Запись за ${dailyLog?.date || "сегодня"}`}>
        <form className="grid gap-3 sm:grid-cols-2" onSubmit={handleSubmit} noValidate>
          <label className="space-y-1">
            <span className="text-sm">Боль (0-10)</span>
            <input
              name="pain"
              className="w-full rounded-lg border p-2.5 text-base"
              value={formData.pain}
              onChange={handleChange}
              inputMode="numeric"
            />
            {errors.pain ? <p className="text-xs text-rose-600">{errors.pain}</p> : null}
          </label>
          <label className="space-y-1">
            <span className="text-sm">Настроение</span>
            <input
              name="mood"
              className="w-full rounded-lg border p-2.5 text-base"
              value={formData.mood}
              onChange={handleChange}
            />
            {errors.mood ? <p className="text-xs text-rose-600">{errors.mood}</p> : null}
          </label>
          <label className="space-y-1">
            <span className="text-sm">Сон (часы)</span>
            <input
              name="sleepHours"
              className="w-full rounded-lg border p-2.5 text-base"
              value={formData.sleepHours}
              onChange={handleChange}
              inputMode="decimal"
            />
            {errors.sleepHours ? <p className="text-xs text-rose-600">{errors.sleepHours}</p> : null}
          </label>
          <label className="space-y-1">
            <span className="text-sm">Энергия</span>
            <input
              name="energy"
              className="w-full rounded-lg border p-2.5 text-base"
              value={formData.energy}
              onChange={handleChange}
            />
            {errors.energy ? <p className="text-xs text-rose-600">{errors.energy}</p> : null}
          </label>
          <label className="space-y-1 sm:col-span-2">
            <span className="text-sm">Выделения</span>
            <input
              name="discharge"
              className="w-full rounded-lg border p-2.5 text-base"
              value={formData.discharge}
              onChange={handleChange}
            />
            {errors.discharge ? <p className="text-xs text-rose-600">{errors.discharge}</p> : null}
          </label>
          <label className="space-y-1 sm:col-span-2">
            <span className="text-sm">Заметки</span>
            <textarea
              name="notes"
              className="w-full rounded-lg border p-2.5 text-base"
              rows="3"
              value={formData.notes}
              onChange={handleChange}
            />
            {errors.notes ? <p className="text-xs text-rose-600">{errors.notes}</p> : null}
          </label>
          <button
            type="submit"
            className="rounded-lg bg-primary px-4 py-3 text-base font-medium text-white disabled:opacity-70 sm:col-span-2"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Сохранение..." : "Сохранить"}
          </button>
          {submitMessage ? (
            <p
              className={`text-sm sm:col-span-2 ${
                submitMessage.startsWith("Ошибка") ? "text-rose-600" : "text-emerald-700"
              }`}
            >
              {submitMessage}
            </p>
          ) : null}
        </form>
      </Card>
    </PageState>
  );
}

export function AnalyticsPage({ data, loading, error, user, authLoading }) {
  const analytics = data?.analytics;

  return (
    <PageState title="Аналитика" loading={loading} error={error} user={user} authLoading={authLoading}>
      <div className="grid gap-3 sm:gap-4 md:grid-cols-2">
        <Card title="Регулярность цикла">
          <div className="space-y-1 text-sm sm:text-base">
            <p>Средняя длина: {analytics?.avgCycleLength}</p>
            <p>Статус: {analytics?.regularity}</p>
          </div>
        </Card>
        <Card title="Частые симптомы">
          <ul className="list-disc pl-5 text-sm sm:text-base">
            {(analytics?.commonSymptoms || []).map((symptom) => (
              <li key={symptom}>{symptom}</li>
            ))}
          </ul>
        </Card>
        <Card title="Тренд настроения (последние 5 записей)">
          <div className="flex flex-wrap gap-2">
            {(analytics?.moodTrend || []).map((state, index) => (
              <span key={`${state}-${index}`} className="rounded bg-primarySoft px-2 py-1 text-xs text-primary sm:text-sm">
                {state}
              </span>
            ))}
          </div>
        </Card>
      </div>
    </PageState>
  );
}

export function ProfilePage({ data, loading, error, user, signOut, refresh, authLoading }) {
  const profile = data?.profile;
  const personal = profile?.personal;
  const [phone, setPhone] = useState("");
  const [pin, setPin] = useState("");
  const [authMessage, setAuthMessage] = useState("");
  const [authError, setAuthError] = useState("");
  const [isAuthSubmitting, setIsAuthSubmitting] = useState(false);
  const [isEditingPersonal, setIsEditingPersonal] = useState(false);
  const [isSavingPersonal, setIsSavingPersonal] = useState(false);
  const [personalMessage, setPersonalMessage] = useState("");
  const [personalError, setPersonalError] = useState("");
  const [personalForm, setPersonalForm] = useState({
    fullName: "",
    age: "",
    city: "",
    phone: ""
  });

  useEffect(() => {
    if (!personal) return;
    setPersonalForm({
      fullName: personal.fullName || "",
      age: personal.age || "",
      city: personal.city || "",
      phone: personal.phone || ""
    });
  }, [personal]);

  async function handleAuth(event) {
    event.preventDefault();
    setAuthError("");
    setAuthMessage("");
    setIsAuthSubmitting(true);

    try {
      const { user: authUser, phone: normalizedPhone, isNewUser } = await signInOrSignUpByPhone(phone, pin);
      await ensureUserRecords(authUser.id, normalizedPhone);
      if (refresh) {
        await refresh();
      }
      setAuthMessage(isNewUser ? "Профиль создан и вход выполнен." : "Вход выполнен успешно.");
      setPin("");
    } catch (authErr) {
      setAuthError(authErr.message || "Не удалось выполнить вход.");
    } finally {
      setIsAuthSubmitting(false);
    }
  }

  async function handleSignOut() {
    setAuthError("");
    setAuthMessage("");
    try {
      await signOut();
    } catch (signOutError) {
      setAuthError(signOutError.message || "Не удалось выйти из аккаунта.");
    }
  }

  async function handleSavePersonal(event) {
    event.preventDefault();
    setPersonalError("");
    setPersonalMessage("");
    setIsSavingPersonal(true);

    try {
      const ageValue = personalForm.age.trim() === "" ? null : Number(personalForm.age);
      if (ageValue !== null && (!Number.isFinite(ageValue) || ageValue < 10 || ageValue > 80)) {
        throw new Error("Возраст должен быть числом от 10 до 80.");
      }

      const nextPrivateData = {
        ...(personal?.privateData || {}),
        age: ageValue,
        city: personalForm.city.trim(),
        phone: personalForm.phone
      };

      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          display_name: personalForm.fullName.trim() || "Пользователь",
          notes_private: JSON.stringify(nextPrivateData)
        })
        .eq("id", user.id);

      if (updateError) throw updateError;

      setPersonalMessage("Персональные данные обновлены.");
      setIsEditingPersonal(false);
      if (refresh) {
        await refresh();
      }
    } catch (saveError) {
      setPersonalError(saveError.message || "Не удалось сохранить персональные данные.");
    } finally {
      setIsSavingPersonal(false);
    }
  }

  if (!user) {
    return (
      <Layout title="Профиль и история">
        <Card title="Вход по номеру телефона">
          <form className="grid gap-3" onSubmit={handleAuth}>
            <label className="space-y-1">
              <span className="text-sm">Номер телефона</span>
              <input
                className="w-full rounded-lg border p-2.5 text-base"
                placeholder="+79991234567"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
              />
            </label>
            <label className="space-y-1">
              <span className="text-sm">PIN (минимум 6 символов)</span>
              <input
                className="w-full rounded-lg border p-2.5 text-base"
                type="password"
                value={pin}
                onChange={(event) => setPin(event.target.value)}
              />
            </label>
            <button
              type="submit"
              className="rounded-lg bg-primary px-4 py-3 text-base font-medium text-white disabled:opacity-70"
              disabled={isAuthSubmitting || authLoading}
            >
              {isAuthSubmitting ? "Вход..." : "Войти"}
            </button>
            {authError ? <p className="text-sm text-rose-600">{authError}</p> : null}
            {authMessage ? <p className="text-sm text-emerald-700">{authMessage}</p> : null}
          </form>
        </Card>
      </Layout>
    );
  }

  return (
    <PageState title="Профиль и история" loading={loading} error={error} user={user} authLoading={authLoading}>
      <div className="grid gap-3 sm:gap-4 md:grid-cols-2">
        <Card title="Профиль">
          {!isEditingPersonal ? (
            <div className="space-y-2 text-sm sm:text-base">
              <p>Имя: {personal?.fullName || profile?.name}</p>
              <p>Возраст: {personal?.age || "Не указан"}</p>
              <p>Город проживания: {personal?.city || "Не указан"}</p>
              <p>Телефон: {personal?.phone || "Нет данных"}</p>
              <p>Средняя длина цикла: {profile?.averageCycleLength}</p>
              <p>Длительность месячных: {profile?.periodLength}</p>
              <button
                type="button"
                className="mt-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium"
                onClick={() => {
                  setIsEditingPersonal(true);
                  setPersonalError("");
                  setPersonalMessage("");
                }}
              >
                Редактировать персональные данные
              </button>
              {personalMessage ? <p className="text-sm text-emerald-700">{personalMessage}</p> : null}
            </div>
          ) : (
            <form className="grid gap-3" onSubmit={handleSavePersonal}>
              <label className="space-y-1">
                <span className="text-sm">Имя</span>
                <input
                  className="w-full rounded-lg border p-2.5 text-base"
                  value={personalForm.fullName}
                  onChange={(event) => setPersonalForm((prev) => ({ ...prev, fullName: event.target.value }))}
                />
              </label>
              <label className="space-y-1">
                <span className="text-sm">Возраст</span>
                <input
                  className="w-full rounded-lg border p-2.5 text-base"
                  inputMode="numeric"
                  value={personalForm.age}
                  onChange={(event) => setPersonalForm((prev) => ({ ...prev, age: event.target.value }))}
                />
              </label>
              <label className="space-y-1">
                <span className="text-sm">Город проживания</span>
                <input
                  className="w-full rounded-lg border p-2.5 text-base"
                  value={personalForm.city}
                  onChange={(event) => setPersonalForm((prev) => ({ ...prev, city: event.target.value }))}
                />
              </label>
              <label className="space-y-1">
                <span className="text-sm">Номер телефона</span>
                <input className="w-full rounded-lg border bg-slate-100 p-2.5 text-base" value={personalForm.phone} readOnly />
              </label>
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white disabled:opacity-70"
                  disabled={isSavingPersonal}
                >
                  {isSavingPersonal ? "Сохранение..." : "Сохранить"}
                </button>
                <button
                  type="button"
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium"
                  onClick={() => setIsEditingPersonal(false)}
                >
                  Отмена
                </button>
              </div>
              {personalError ? <p className="text-sm text-rose-600">{personalError}</p> : null}
            </form>
          )}
        </Card>
        <Card title="История">
          <p className="text-sm sm:text-base">Всего сохраненных циклов: {profile?.cyclesCount}</p>
          <p className="text-sm text-slate-600">Подробная таблица циклов будет в V2.</p>
          <button
            type="button"
            className="mt-4 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium"
            onClick={handleSignOut}
          >
            Выйти
          </button>
          {authError ? <p className="mt-2 text-sm text-rose-600">{authError}</p> : null}
        </Card>
      </div>
    </PageState>
  );
}

export function SettingsPage({ data, loading, error, user, authLoading }) {
  const settings = data?.profile?.settings;
  const reminders = data?.reminders || [];
  const notificationsEnabled = reminders.some((item) => item.enabled);

  return (
    <PageState title="Настройки" loading={loading} error={error} user={user} authLoading={authLoading}>
      <div className="grid gap-3 sm:gap-4 md:grid-cols-2">
        <Card title="Основные настройки">
          <ul className="space-y-2 text-sm sm:text-base">
            <li>Тема: {settings?.darkMode ? "Темная" : "Светлая"}</li>
            <li>Язык: {settings?.language}</li>
            <li>Формат даты: {settings?.dateFormat}</li>
            <li>Безопасность: PIN/биометрия (заглушка)</li>
          </ul>
        </Card>
        <Card title="Уведомления">
          <ul className="space-y-2 text-sm sm:text-base">
            <li>Общий статус: {notificationsEnabled ? "Включены" : "Выключены"}</li>
            <li>Канал: Push-уведомления (мобильный браузер)</li>
            <li>Тихие часы: 23:00 - 08:00</li>
            <li>Напоминание о записи: ежедневно в 21:00</li>
          </ul>
          <div className="mt-3 border-t pt-3">
            <p className="mb-2 text-sm font-medium">Активные правила</p>
            <ul className="space-y-3">
            {reminders.map((item) => (
              <li key={item.id} className="flex flex-col gap-2 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-medium sm:text-base">{item.title}</p>
                  <p className="text-sm text-slate-600">{item.time}</p>
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    item.enabled ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-700"
                  }`}
                >
                  {item.enabled ? "Вкл" : "Выкл"}
                </span>
              </li>
            ))}
            </ul>
          </div>
        </Card>
      </div>
    </PageState>
  );
}
