-- Добавляем колонку роли в profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'user'
  CHECK (role IN ('user', 'admin'));

-- Вспомогательная функция: проверяет, является ли текущий пользователь admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;

-- ============================================================
-- profiles
-- ============================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;

CREATE POLICY "profiles_select_own" ON public.profiles
  FOR SELECT USING (id = auth.uid() OR is_admin());

CREATE POLICY "profiles_insert_own" ON public.profiles
  FOR INSERT WITH CHECK (id = auth.uid());

CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE USING (id = auth.uid() OR is_admin());

-- ============================================================
-- user_settings
-- ============================================================
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_settings_select_own" ON public.user_settings;
DROP POLICY IF EXISTS "user_settings_insert_own" ON public.user_settings;
DROP POLICY IF EXISTS "user_settings_update_own" ON public.user_settings;

CREATE POLICY "user_settings_select_own" ON public.user_settings
  FOR SELECT USING (user_id = auth.uid() OR is_admin());

CREATE POLICY "user_settings_insert_own" ON public.user_settings
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "user_settings_update_own" ON public.user_settings
  FOR UPDATE USING (user_id = auth.uid() OR is_admin());

-- ============================================================
-- reminders
-- ============================================================
ALTER TABLE public.reminders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "reminders_select_own" ON public.reminders;
DROP POLICY IF EXISTS "reminders_insert_own" ON public.reminders;
DROP POLICY IF EXISTS "reminders_update_own" ON public.reminders;
DROP POLICY IF EXISTS "reminders_delete_own" ON public.reminders;

CREATE POLICY "reminders_select_own" ON public.reminders
  FOR SELECT USING (user_id = auth.uid() OR is_admin());

CREATE POLICY "reminders_insert_own" ON public.reminders
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "reminders_update_own" ON public.reminders
  FOR UPDATE USING (user_id = auth.uid() OR is_admin());

CREATE POLICY "reminders_delete_own" ON public.reminders
  FOR DELETE USING (user_id = auth.uid() OR is_admin());

-- ============================================================
-- cycle_entries
-- ============================================================
ALTER TABLE public.cycle_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "cycle_entries_select_own" ON public.cycle_entries;
DROP POLICY IF EXISTS "cycle_entries_insert_own" ON public.cycle_entries;
DROP POLICY IF EXISTS "cycle_entries_update_own" ON public.cycle_entries;
DROP POLICY IF EXISTS "cycle_entries_delete_own" ON public.cycle_entries;

CREATE POLICY "cycle_entries_select_own" ON public.cycle_entries
  FOR SELECT USING (user_id = auth.uid() OR is_admin());

CREATE POLICY "cycle_entries_insert_own" ON public.cycle_entries
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "cycle_entries_update_own" ON public.cycle_entries
  FOR UPDATE USING (user_id = auth.uid() OR is_admin());

CREATE POLICY "cycle_entries_delete_own" ON public.cycle_entries
  FOR DELETE USING (user_id = auth.uid() OR is_admin());

-- ============================================================
-- cycle_events
-- ============================================================
ALTER TABLE public.cycle_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "cycle_events_select_own" ON public.cycle_events;
DROP POLICY IF EXISTS "cycle_events_insert_own" ON public.cycle_events;
DROP POLICY IF EXISTS "cycle_events_update_own" ON public.cycle_events;
DROP POLICY IF EXISTS "cycle_events_delete_own" ON public.cycle_events;

CREATE POLICY "cycle_events_select_own" ON public.cycle_events
  FOR SELECT USING (user_id = auth.uid() OR is_admin());

CREATE POLICY "cycle_events_insert_own" ON public.cycle_events
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "cycle_events_update_own" ON public.cycle_events
  FOR UPDATE USING (user_id = auth.uid() OR is_admin());

CREATE POLICY "cycle_events_delete_own" ON public.cycle_events
  FOR DELETE USING (user_id = auth.uid() OR is_admin());
