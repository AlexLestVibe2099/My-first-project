# AI Assistant (Daily Advice)

## Что делает

После загрузки главной страницы вызывается Supabase Edge Function `ai-daily-advice`.
Она получает запись за день (заметка + настроение + боль + энергия + день цикла + фаза)
и возвращает короткую рекомендацию в 2-3 предложениях.

## Где в коде

- Function: `supabase/functions/ai-daily-advice/index.ts`
- Hook: `src/hooks/useAiAdvice.js`
- UI block on main page: `src/pages.jsx` (`TodayPage`, карточка `AI-рекомендация дня`)

## Переменные окружения

Для локальной разработки:

- `OPENAI_API_KEY`
- `OPENAI_MODEL` (опционально, по умолчанию `gpt-4o-mini`)

Для прода значения нужно добавить в Supabase secrets:

- `OPENAI_API_KEY`
- `OPENAI_MODEL`

## Deploy

```bash
npx supabase functions deploy ai-daily-advice --project-ref <your-project-ref> --use-api
```

## Поведение при ошибке

Если OpenAI недоступен или ключ не задан, функция вернет fallback-рекомендацию
на основе простых правил. UI всегда показывает текст и не ломается.

## База рекомендаций для fallback

В fallback-режиме используются 30+ шаблонов с вариативным выбором.
Формулировки собраны на основе открытых рекомендаций по самопомощи при ПМС/болях:

- [Mayo Clinic: PMS treatment](https://www.mayoclinic.org/diseases-conditions/premenstrual-syndrome/diagnosis-treatment/drc-20376787)
- [Mayo Clinic: Menstrual cramps treatment](https://www.mayoclinic.org/diseases-conditions/menstrual-cramps/diagnosis-treatment/drc-20374944)
- [ACOG: Dysmenorrhea](https://www.acog.org/en/womens-health/faqs/dysmenorrhea-painful-periods)
- [NHS inform: PMS](https://www.nhsinform.scot/healthy-living/womens-health/later-years-around-50-years-and-over/periods-and-menstrual-health/premenstrual-syndrome-pms)
- [MedlinePlus: PMS self-care](https://medlineplus.gov/ency/patientinstructions/000556.htm)
