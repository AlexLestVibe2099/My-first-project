import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Layout from "./components/Layout";
import {
  ensureUserProfile,
  resetPassword,
  signInWithEmail,
  signUpWithEmail,
  updatePassword,
  validateSignIn,
  validateSignUp
} from "./lib/authEmail";
import { handleApiError, saveCycleEntry, updateProfile } from "./lib/apiClient";
import { supabase } from "./lib/supabaseClient";
import {
  validateDischarge,
  validateEnergy,
  validateMood,
  validateNotes,
  validatePainLevel,
  validateSleepHours,
  validateSymptom
} from "./lib/validation";

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

// ── Страница входа / регистрации ─────────────────────────────────────────────

export function AuthPage({ initialMode = "signin" }) {
  const [mode, setMode] = useState(initialMode); // "signin" | "signup" | "reset"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setMode(initialMode);
    setErrors({});
    setMessage("");
  }, [initialMode]);

  function handleFieldChange(setter, field) {
    return (event) => {
      setter(event.target.value);
      setErrors((prev) => ({ ...prev, [field]: undefined }));
      setMessage("");
    };
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setMessage("");

    if (mode === "reset") {
      const errs = {};
      if (!email.trim()) errs.email = "Email обязателен.";
      if (Object.keys(errs).length) { setErrors(errs); return; }
      setIsSubmitting(true);
      try {
        await resetPassword(email);
        setMessage("Письмо для сброса пароля отправлено. Проверь почту.");
      } catch (err) {
        setErrors({ email: err?.message || "Не удалось отправить письмо." });
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    if (mode === "signup") {
      const errs = validateSignUp(email, password, confirmPassword);
      if (Object.keys(errs).length) { setErrors(errs); return; }
      setIsSubmitting(true);
      try {
        const { user } = await signUpWithEmail(email, password);
        if (user) await ensureUserProfile(user.id);
        setMessage("Аккаунт создан. Если требуется подтверждение — проверь почту.");
      } catch (err) {
        setErrors({ form: err?.message || "Не удалось создать аккаунт." });
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    // signin
    const errs = validateSignIn(email, password);
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setIsSubmitting(true);
    try {
      const { user } = await signInWithEmail(email, password);
      if (user) await ensureUserProfile(user.id);
    } catch (err) {
      setErrors({ form: err?.message || "Не удалось выполнить вход." });
    } finally {
      setIsSubmitting(false);
    }
  }

  const tabClass = (tab) =>
    `flex-1 py-2.5 text-sm font-medium transition-colors rounded-lg ${
      mode === tab
        ? "bg-primary text-white shadow-sm"
        : "text-slate-500 hover:text-slate-700"
    }`;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mb-3 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-2xl text-white shadow">
            🌸
          </div>
          <h1 className="text-2xl font-bold text-slate-800">CycleCare</h1>
          <p className="mt-1 text-sm text-slate-500">Трекер менструального цикла</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          {mode !== "reset" && (
            <div className="mb-5 flex gap-1 rounded-xl bg-slate-100 p-1">
              <button type="button" className={tabClass("signin")} onClick={() => { setMode("signin"); setErrors({}); setMessage(""); }}>
                Вход
              </button>
              <button type="button" className={tabClass("signup")} onClick={() => { setMode("signup"); setErrors({}); setMessage(""); }}>
                Регистрация
              </button>
            </div>
          )}

          {mode === "reset" && (
            <div className="mb-4">
              <button
                type="button"
                className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700"
                onClick={() => { setMode("signin"); setErrors({}); setMessage(""); }}
              >
                ← Назад ко входу
              </button>
              <h2 className="mt-2 text-base font-semibold text-slate-800">Сброс пароля</h2>
            </div>
          )}

          <form className="grid gap-4" onSubmit={handleSubmit} noValidate>
            <label className="grid gap-1.5">
              <span className="text-sm font-medium text-slate-700">Email</span>
              <input
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                required
                className={`w-full rounded-lg border px-3 py-2.5 text-base outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 ${
                  errors.email ? "border-rose-400" : "border-slate-300"
                }`}
                value={email}
                onChange={handleFieldChange(setEmail, "email")}
              />
              {errors.email ? <p className="text-xs text-rose-600">{errors.email}</p> : null}
            </label>

            {mode !== "reset" && (
              <label className="grid gap-1.5">
                <span className="text-sm font-medium text-slate-700">Пароль</span>
                <input
                  type="password"
                  autoComplete={mode === "signup" ? "new-password" : "current-password"}
                  placeholder="Минимум 8 символов"
                  required
                  className={`w-full rounded-lg border px-3 py-2.5 text-base outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 ${
                    errors.password ? "border-rose-400" : "border-slate-300"
                  }`}
                  value={password}
                  onChange={handleFieldChange(setPassword, "password")}
                />
                {errors.password ? <p className="text-xs text-rose-600">{errors.password}</p> : null}
              </label>
            )}

            {mode === "signup" && (
              <label className="grid gap-1.5">
                <span className="text-sm font-medium text-slate-700">Повторите пароль</span>
                <input
                  type="password"
                  autoComplete="new-password"
                  placeholder="Введи пароль ещё раз"
                  required
                  className={`w-full rounded-lg border px-3 py-2.5 text-base outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 ${
                    errors.confirmPassword ? "border-rose-400" : "border-slate-300"
                  }`}
                  value={confirmPassword}
                  onChange={handleFieldChange(setConfirmPassword, "confirmPassword")}
                />
                {errors.confirmPassword ? <p className="text-xs text-rose-600">{errors.confirmPassword}</p> : null}
              </label>
            )}

            {errors.form ? (
              <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{errors.form}</p>
            ) : null}
            {message ? (
              <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{message}</p>
            ) : null}

            <button
              type="submit"
              disabled={isSubmitting}
              className="mt-1 w-full rounded-lg bg-primary py-3 text-base font-medium text-white shadow-sm transition hover:opacity-90 disabled:opacity-60"
            >
              {isSubmitting
                ? "Загрузка..."
                : mode === "signup"
                  ? "Создать аккаунт"
                  : mode === "reset"
                    ? "Отправить письмо"
                    : "Войти"}
            </button>
          </form>

          {mode === "signin" && (
            <>
              <button
                type="button"
                className="mt-4 w-full text-center text-sm text-slate-400 hover:text-primary"
                onClick={() => { setMode("reset"); setErrors({}); setMessage(""); }}
              >
                Забыл пароль?
              </button>
              <p className="mt-2 text-center text-sm text-slate-500">
                Нет аккаунта? <Link to="/auth/register" className="text-primary hover:underline">Регистрация</Link>
              </p>
            </>
          )}
          {mode === "signup" && (
            <p className="mt-2 text-center text-sm text-slate-500">
              Уже есть аккаунт? <Link to="/auth/login" className="text-primary hover:underline">Вход</Link>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export function ResetPasswordPage() {
  const navigate = useNavigate();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setMessage("");

    if (!newPassword.trim()) {
      setError("Новый пароль обязателен.");
      return;
    }
    if (newPassword.length < 8) {
      setError("Пароль должен содержать минимум 8 символов.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Пароли не совпадают.");
      return;
    }

    setIsSubmitting(true);
    try {
      const { data } = await supabase.auth.getSession();
      if (!data?.session) {
        setError("Сессия восстановления не найдена. Открой ссылку из письма снова.");
        return;
      }

      await updatePassword(newPassword);
      setMessage("Пароль обновлен. Теперь войди с новым паролем.");
      setTimeout(() => {
        navigate("/auth/login", { replace: true });
      }, 1200);
    } catch (err) {
      setError(err?.message || "Не удалось обновить пароль.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4 py-10">
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-xl font-semibold text-slate-800">Новый пароль</h1>
        <p className="mt-1 text-sm text-slate-500">
          Введи новый пароль для аккаунта после перехода из письма.
        </p>

        <form className="mt-5 grid gap-3" onSubmit={handleSubmit} noValidate>
          <label className="grid gap-1.5">
            <span className="text-sm font-medium text-slate-700">Новый пароль</span>
            <input
              type="password"
              required
              autoComplete="new-password"
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-base outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              value={newPassword}
              onChange={(event) => {
                setNewPassword(event.target.value);
                setError("");
                setMessage("");
              }}
            />
          </label>

          <label className="grid gap-1.5">
            <span className="text-sm font-medium text-slate-700">Повтори новый пароль</span>
            <input
              type="password"
              required
              autoComplete="new-password"
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-base outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              value={confirmPassword}
              onChange={(event) => {
                setConfirmPassword(event.target.value);
                setError("");
                setMessage("");
              }}
            />
          </label>

          {error ? <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p> : null}
          {message ? <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{message}</p> : null}

          <button
            type="submit"
            disabled={isSubmitting}
            className="mt-1 w-full rounded-lg bg-primary py-3 text-base font-medium text-white shadow-sm transition hover:opacity-90 disabled:opacity-60"
          >
            {isSubmitting ? "Сохранение..." : "Сохранить новый пароль"}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-slate-500">
          Вспомнил пароль? <Link to="/auth/login" className="text-primary hover:underline">Вернуться ко входу</Link>
        </p>
      </div>
    </div>
  );
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

export function LogPage({ data, loading, error, refresh, user, authLoading, isAdmin }) {
  const navigate = useNavigate();
  const dailyLog = data?.dailyLog;
  const symptomOptions = [
    { value: "headache", label: "Головная боль" },
    { value: "lower_abdominal_pain", label: "Боль внизу живота" },
    { value: "back_pain", label: "Боль в пояснице" },
    { value: "breast_tenderness", label: "Чувствительность груди" },
    { value: "bloating", label: "Вздутие" },
    { value: "nausea", label: "Тошнота" },
    { value: "fatigue", label: "Усталость" },
    { value: "irritability", label: "Раздражительность" },
    { value: "acne", label: "Высыпания на коже" },
    { value: "cramps", label: "Спазмы" }
  ];
  const allowedSymptoms = new Set(symptomOptions.map((item) => item.value));
  function normalizeSymptom(value) {
    return allowedSymptoms.has(value) ? value : "";
  }
  const [formData, setFormData] = useState({
    symptom: "",
    pain: "",
    mood: "",
    sleepHours: "",
    energy: "",
    discharge: "",
    notes: ""
  });
  const [errors, setErrors] = useState({});
  const [submitMessage, setSubmitMessage] = useState("");
  const [submitStatus, setSubmitStatus] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!dailyLog) return;
    setFormData({
      symptom: normalizeSymptom(dailyLog.symptom),
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
    nextErrors.symptom = validateSymptom(values.symptom, allowedSymptoms);
    nextErrors.pain = validatePainLevel(values.pain);
    nextErrors.mood = validateMood(values.mood);
    nextErrors.sleepHours = validateSleepHours(values.sleepHours);
    nextErrors.energy = validateEnergy(values.energy);
    nextErrors.discharge = validateDischarge(values.discharge);
    nextErrors.notes = validateNotes(values.notes);

    Object.keys(nextErrors).forEach((key) => {
      if (!nextErrors[key]) delete nextErrors[key];
    });

    return nextErrors;
  }

  function handleChange(event) {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: undefined }));
    setSubmitMessage("");
    setSubmitStatus(null);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const nextErrors = validate(formData);

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      setSubmitMessage("");
      setSubmitStatus(400);
      return;
    }

    setIsSubmitting(true);
    setErrors({});

    try {
      const today = new Date().toISOString().slice(0, 10);
      await saveCycleEntry(
        user,
        Boolean(isAdmin),
        { ...formData, entryDate: today },
        allowedSymptoms
      );

      setSubmitMessage("Запись успешно сохранена.");
      setSubmitStatus(200);
      if (refresh) {
        await refresh();
      }
    } catch (submitError) {
      const mappedError = handleApiError(submitError);
      if (mappedError.status === 401) {
        navigate("/auth/login", { replace: true });
        return;
      }
      setSubmitMessage(`Ошибка сохранения: ${mappedError.message}`);
      setSubmitStatus(mappedError.status || 400);
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
            <span className="text-sm">Симптом</span>
            <select
              name="symptom"
              className="w-full rounded-lg border p-2.5 text-base"
              value={formData.symptom}
              onChange={handleChange}
            >
              <option value="">Выбери симптом</option>
              {symptomOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            {errors.symptom ? <p className="text-xs text-rose-600">{errors.symptom}</p> : null}
          </label>
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
                submitStatus === 200 ? "text-emerald-700" : "text-rose-600"
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

export function ProfilePage({ data, loading, error, user, signOut, refresh, authLoading, isAdmin }) {
  const navigate = useNavigate();
  const profile = data?.profile;
  const personal = profile?.personal;
  const [authError, setAuthError] = useState("");
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

  async function handleSignOut() {
    setAuthError("");
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
      await updateProfile(
        user,
        Boolean(isAdmin),
        user.id,
        personalForm,
        personal?.privateData || {}
      );

      setPersonalMessage("Персональные данные обновлены.");
      setIsEditingPersonal(false);
      if (refresh) {
        await refresh();
      }
    } catch (saveError) {
      const mappedError = handleApiError(saveError);
      if (mappedError.status === 401) {
        navigate("/auth/login", { replace: true });
        return;
      }
      setPersonalError(mappedError.message || "Не удалось сохранить персональные данные.");
    } finally {
      setIsSavingPersonal(false);
    }
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
