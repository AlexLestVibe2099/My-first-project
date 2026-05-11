CREATE TABLE IF NOT EXISTS public.webhook_processed_events (
  event_id TEXT PRIMARY KEY,
  source TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.webhook_processed_events IS
  'Stores processed webhook event IDs to prevent duplicate handling.';
