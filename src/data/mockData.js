export const mockData = {
  today: {
    date: "7 мая 2026",
    cycleDay: 14,
    phase: "Овуляция",
    nextPeriodInDays: 15,
    reminders: ["Выпить магний в 20:00", "Сделать дневную запись"],
    quickStats: {
      mood: "Спокойное",
      pain: "2/10",
      energy: "Средняя"
    },
    note: "Легкая тянущая боль утром, к вечеру стало лучше."
  },
  calendar: {
    monthName: "Май 2026",
    markedDays: [
      { day: 1, type: "period" },
      { day: 2, type: "period" },
      { day: 3, type: "period" },
      { day: 14, type: "ovulation" },
      { day: 15, type: "fertile" },
      { day: 16, type: "fertile" },
      { day: 30, type: "predicted" },
      { day: 31, type: "predicted" }
    ],
    history: [
      { cycle: "Март", length: 29, periodDays: 5 },
      { cycle: "Апрель", length: 30, periodDays: 5 }
    ]
  },
  dailyLog: {
    date: "7 мая 2026",
    pain: 2,
    mood: "Спокойное",
    sleepHours: 7,
    energy: "Средняя",
    discharge: "Прозрачные",
    notes: "Без сильных симптомов."
  },
  analytics: {
    avgCycleLength: 29,
    regularity: "Стабильный",
    commonSymptoms: ["Вздутие", "Раздражительность", "Легкая боль"],
    moodTrend: ["Низкое", "Среднее", "Хорошее", "Среднее", "Хорошее"]
  },
  reminders: [
    { id: 1, title: "Напоминание о месячных", time: "За 2 дня до цикла", enabled: true },
    { id: 2, title: "Ежедневная запись", time: "21:00", enabled: true },
    { id: 3, title: "Прием препарата", time: "20:00", enabled: false }
  ],
  profile: {
    name: "Анна",
    averageCycleLength: 29,
    periodLength: 5,
    cyclesCount: 12,
    settings: {
      darkMode: false,
      language: "Русский",
      dateFormat: "DD.MM.YYYY"
    }
  }
};
