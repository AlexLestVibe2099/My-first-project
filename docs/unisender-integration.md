# UniSender Integration

## Что реализовано

- Первое письмо (подтверждение email) отправляет Supabase Auth через SMTP-провайдер UniSender.
- Второе письмо (успешная регистрация) отправляет Edge Function `send-welcome-email`.
- Входящие webhook-запросы в Edge Function проверяются по HMAC-подписи.
- Включена идемпотентность: повторный `event_id` не обрабатывается второй раз.

## Endpoint

- `POST /functions/v1/send-welcome-email`

Ожидаемые заголовки:

- `x-webhook-signature`: HMAC SHA-256 подпись тела запроса
- `x-event-id` (или альтернативы): идентификатор события для дедупликации
- `x-webhook-token` (опционально): фолбэк-аутентификация для источников без HMAC

Ожидаемое тело (минимум):

```json
{
  "type": "INSERT",
  "table": "profiles",
  "record": {
    "id": "uuid-user-id"
  }
}
```

## Переменные окружения

Задаются в `.env` для локальной разработки и в Supabase Secrets для продакшена:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `UNISENDER_API_KEY`
- `UNISENDER_SENDER_EMAIL`
- `UNISENDER_SENDER_NAME`
- `UNISENDER_WELCOME_SUBJECT` (опционально)
- `WEBHOOK_SIGNING_SECRET`
- `WEBHOOK_SHARED_TOKEN` (опционально)

## SMTP для первого письма

В Supabase Dashboard:

1. `Authentication` -> `SMTP Settings`
2. Ввести параметры UniSender SMTP:
   - Host: `smtp.unisender.com`
   - Port: `465`
   - Username: email UniSender
   - Password: API key UniSender

Важно: в Supabase должен быть выключен `Auto Confirm` для email.
Проверка:

- `GET https://<project-ref>.supabase.co/auth/v1/settings`
- поле `mailer_autoconfirm` должно быть `false`

Если `mailer_autoconfirm=true`, регистрация проходит без подтверждения email.

## Идемпотентность

Миграция создаёт таблицу:

- `public.webhook_processed_events`

Логика:

- Если `event_id` уже есть в таблице, запрос получает `200` с `duplicate: true`.
- Если `event_id` новый, событие обрабатывается и сохраняется в таблицу.

## Безопасное логирование

Логи содержат только метаданные:

- `action`
- `endpoint`
- `status`
- `duration_ms`
- `event_id`

Логи не содержат тела запросов, пароли, токены и персональные данные.

## Настройка Database Webhook

Для `public.profiles` (event `INSERT`) укажи URL:

- `https://<project-ref>.supabase.co/functions/v1/send-welcome-email`

Если источник webhook умеет HMAC:

- Считай HMAC SHA-256 от raw-body по секрету `WEBHOOK_SIGNING_SECRET`
- Передай подпись в `x-webhook-signature`

Если источник webhook не умеет HMAC (типичный Supabase Database Webhook):

- Передай в заголовке `x-webhook-token` значение `WEBHOOK_SHARED_TOKEN`

## Troubleshooting

- Регистрация проходит без подтверждения:
  - причина: `mailer_autoconfirm=true`
  - исправление: Supabase Dashboard -> Authentication -> Providers -> Email -> отключить Auto Confirm
- Второе письмо не приходит:
  - проверь наличие INSERT в `public.profiles`
  - проверь Webhook на `public.profiles` `INSERT`
  - проверь секреты Edge Function и логи функции `send-welcome-email`
