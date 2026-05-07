import React from "react";
import Layout from "./components/Layout";
import { mockData } from "./data/mockData";

function Card({ title, children }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
      <h2 className="mb-3 text-sm font-semibold sm:text-base">{title}</h2>
      {children}
    </section>
  );
}

export function TodayPage() {
  const { today } = mockData;
  return (
    <Layout title="Сегодня">
      <div className="grid gap-3 sm:gap-4 md:grid-cols-2">
        <Card title="Статус цикла">
          <div className="space-y-1 text-sm sm:text-base">
            <p>Дата: {today.date}</p>
            <p>День цикла: {today.cycleDay}</p>
            <p>Фаза: {today.phase}</p>
            <p>До следующих месячных: {today.nextPeriodInDays} дней</p>
          </div>
        </Card>
        <Card title="Быстрые показатели">
          <div className="space-y-1 text-sm sm:text-base">
            <p>Настроение: {today.quickStats.mood}</p>
            <p>Боль: {today.quickStats.pain}</p>
            <p>Энергия: {today.quickStats.energy}</p>
          </div>
        </Card>
        <Card title="Ближайшие напоминания">
          <ul className="list-disc space-y-1 pl-5 text-sm sm:text-base">
            {today.reminders.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </Card>
        <Card title="Заметка дня">
          <p className="text-sm leading-relaxed sm:text-base">{today.note}</p>
        </Card>
      </div>
    </Layout>
  );
}

function dayBadge(type) {
  if (type === "period") return "bg-rose-100 text-rose-700";
  if (type === "ovulation") return "bg-violet-100 text-violet-700";
  if (type === "fertile") return "bg-emerald-100 text-emerald-700";
  return "bg-slate-100 text-slate-700";
}

export function CalendarPage() {
  const { calendar } = mockData;
  return (
    <Layout title="Календарь цикла">
      <div className="space-y-3 sm:space-y-4">
        <Card title={calendar.monthName}>
          <div className="overflow-x-auto pb-1">
            <div className="grid min-w-[320px] grid-cols-7 gap-1.5 text-center text-xs sm:gap-2 sm:text-sm">
              {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => {
                const mark = calendar.markedDays.find((d) => d.day === day);
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
            {calendar.history.map((item) => (
              <li key={item.cycle} className="rounded bg-slate-100 p-2">
                {item.cycle}: длина цикла {item.length} дн., месячные {item.periodDays} дн.
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </Layout>
  );
}

export function LogPage() {
  const { dailyLog } = mockData;
  return (
    <Layout title="Запись самочувствия">
      {/* Поля не отправляют данные, это UI-шаблон для фронтенд V1. */}
      <Card title={`Запись за ${dailyLog.date}`}>
        <form className="grid gap-3 sm:grid-cols-2">
          <label className="space-y-1">
            <span className="text-sm">Боль (0-10)</span>
            <input className="w-full rounded-lg border p-2.5 text-base" defaultValue={dailyLog.pain} />
          </label>
          <label className="space-y-1">
            <span className="text-sm">Настроение</span>
            <input className="w-full rounded-lg border p-2.5 text-base" defaultValue={dailyLog.mood} />
          </label>
          <label className="space-y-1">
            <span className="text-sm">Сон (часы)</span>
            <input className="w-full rounded-lg border p-2.5 text-base" defaultValue={dailyLog.sleepHours} />
          </label>
          <label className="space-y-1">
            <span className="text-sm">Энергия</span>
            <input className="w-full rounded-lg border p-2.5 text-base" defaultValue={dailyLog.energy} />
          </label>
          <label className="space-y-1 sm:col-span-2">
            <span className="text-sm">Выделения</span>
            <input className="w-full rounded-lg border p-2.5 text-base" defaultValue={dailyLog.discharge} />
          </label>
          <label className="space-y-1 sm:col-span-2">
            <span className="text-sm">Заметки</span>
            <textarea className="w-full rounded-lg border p-2.5 text-base" rows="3" defaultValue={dailyLog.notes} />
          </label>
          <button type="button" className="rounded-lg bg-primary px-4 py-3 text-base font-medium text-white sm:col-span-2">
            Сохранить (демо)
          </button>
        </form>
      </Card>
    </Layout>
  );
}

export function AnalyticsPage() {
  const { analytics } = mockData;
  return (
    <Layout title="Аналитика">
      <div className="grid gap-3 sm:gap-4 md:grid-cols-2">
        <Card title="Регулярность цикла">
          <div className="space-y-1 text-sm sm:text-base">
            <p>Средняя длина: {analytics.avgCycleLength} дней</p>
            <p>Статус: {analytics.regularity}</p>
          </div>
        </Card>
        <Card title="Частые симптомы">
          <ul className="list-disc pl-5 text-sm sm:text-base">
            {analytics.commonSymptoms.map((symptom) => (
              <li key={symptom}>{symptom}</li>
            ))}
          </ul>
        </Card>
        <Card title="Тренд настроения (последние 5 записей)">
          <div className="flex flex-wrap gap-2">
            {analytics.moodTrend.map((state, index) => (
              <span key={`${state}-${index}`} className="rounded bg-primarySoft px-2 py-1 text-xs text-primary sm:text-sm">
                {state}
              </span>
            ))}
          </div>
        </Card>
      </div>
    </Layout>
  );
}

export function ProfilePage() {
  const { profile } = mockData;
  return (
    <Layout title="Профиль и история">
      <div className="grid gap-3 sm:gap-4 md:grid-cols-2">
        <Card title="Профиль">
          <div className="space-y-1 text-sm sm:text-base">
            <p>Имя: {profile.name}</p>
            <p>Средняя длина цикла: {profile.averageCycleLength} дней</p>
            <p>Длительность месячных: {profile.periodLength} дней</p>
          </div>
        </Card>
        <Card title="История">
          <p className="text-sm sm:text-base">Всего сохраненных циклов: {profile.cyclesCount}</p>
          <p className="text-sm text-slate-600">Подробная таблица циклов будет в V2.</p>
        </Card>
      </div>
    </Layout>
  );
}

export function SettingsPage() {
  const { settings } = mockData.profile;
  const { reminders } = mockData;
  return (
    <Layout title="Настройки">
      <div className="grid gap-3 sm:gap-4 md:grid-cols-2">
        <Card title="Основные настройки">
          <ul className="space-y-2 text-sm sm:text-base">
            <li>Тема: {settings.darkMode ? "Темная" : "Светлая"}</li>
            <li>Язык: {settings.language}</li>
            <li>Формат даты: {settings.dateFormat}</li>
            <li>Безопасность: PIN/биометрия (заглушка)</li>
          </ul>
        </Card>
        <Card title="Уведомления">
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
        </Card>
      </div>
    </Layout>
  );
}
