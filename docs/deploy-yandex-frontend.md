# Deploy frontend to Yandex Cloud (Object Storage + CDN)

This project uses Supabase as backend/DB. Deploy only the React frontend to Yandex Cloud.

## 1) Prepare environment

1. Create `.env.production` from `.env.production.example`.
2. Fill values:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`

## 2) Build locally

```bash
npm ci
npm run build
```

Output folder: `dist/`.

## 3) Create bucket and static website

In Yandex Cloud Console:
1. Open `Object Storage`.
2. Create bucket, for example: `cyclecare-frontend-prod`.
3. Enable static website hosting.
4. Set:
   - Index page: `index.html`
   - Error page: `index.html` (required for SPA routes)

## 4) Upload build files

Upload all files from local `dist/` to bucket root.

## 5) Attach CDN

1. Open `CDN`.
2. Create CDN resource for this bucket.
3. Use CDN URL for quick smoke test.

## 6) Domain and HTTPS

1. In `Certificate Manager`, issue cert for:
   - `your-domain.ru`
   - `www.your-domain.ru` (optional)
2. In `Cloud DNS`, create zone and records to CDN endpoint.
3. At registrar, set NS records to Yandex Cloud DNS.

## 7) Required Supabase secrets (server-side)

Set these in Supabase Dashboard -> Edge Functions -> Secrets (not in frontend env):
- `OPENAI_API_KEY`
- `OPENAI_MODEL` (optional)
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `UNISENDER_API_KEY`
- `UNISENDER_SENDER_EMAIL`
- `UNISENDER_SENDER_NAME`
- `UNISENDER_WELCOME_SUBJECT` (optional)
- `WEBHOOK_SIGNING_SECRET` or `WEBHOOK_SHARED_TOKEN`
- `ALLOWED_ORIGINS=https://your-domain.ru,https://www.your-domain.ru,http://localhost:5173,http://127.0.0.1:5173`

## 8) Final checks

1. Open frontend URL over HTTPS.
2. Login and data reads/writes work.
3. `ai-daily-advice` returns response.
4. Browser console has no CORS errors.
