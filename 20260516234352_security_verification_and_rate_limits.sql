/*
  # Security, Verification, and Rate Limiting

  1. Verification columns on profiles
     - `phone_verified` boolean — true once OTP is confirmed
     - `email_verified` boolean — true once email is confirmed (can be set by admin/trigger)

  2. Rate limiting table
     - `rate_limits` table tracks action counts per identifier per window
     - Used server-side to block OTP abuse and task creation spam

  3. RLS hardening
     - task_messages: sender_id MUST equal auth.uid() (prevent message spoofing)
     - tasks: user_id MUST equal auth.uid() on insert
     - Only task creator can mark task completed (confirmed by client)
     - Ensure accept_task function validates caller is auth.uid()

  4. Ownership enforcement via RLS
     - task_messages INSERT policy checks task participation
     - tasks UPDATE restricted to owner or assigned worker only
*/

-- ── 1. Verification columns on profiles ────────────────────────────────────
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS phone_verified boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS email_verified boolean NOT NULL DEFAULT false;

-- ── 2. Rate limiting table ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.rate_limits (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier  text NOT NULL,          -- phone or user_id
  action      text NOT NULL,          -- 'otp_send', 'task_create', 'message_send'
  window_start timestamptz NOT NULL DEFAULT date_trunc('minute', now()),
  count       integer NOT NULL DEFAULT 1,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (identifier, action, window_start)
);

ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- Only service role can read/write rate limits (edge functions use service role key)
-- No RLS policies needed for authenticated users — all access via service role

-- ── 3. Drop conflicting policies before recreating ─────────────────────────

-- Drop task policies that might conflict
DROP POLICY IF EXISTS "Workers can view open tasks" ON public.tasks;
DROP POLICY IF EXISTS "Workers can update assigned tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can insert own tasks" ON public.tasks;

-- Drop message policies that might conflict
DROP POLICY IF EXISTS "Participants can view messages" ON public.task_messages;
DROP POLICY IF EXISTS "Participants can send messages" ON public.task_messages;

-- Drop profile policies that might conflict
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;

-- ── 4. Recreate hardened RLS policies ──────────────────────────────────────

-- Tasks: authenticated users can see tasks they own or are assigned to, plus open tasks
CREATE POLICY "tasks_select"
  ON public.tasks FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR worker_id = auth.uid()
    OR status = 'waiting_for_worker'
  );

-- Tasks: only the owner can insert their own task
CREATE POLICY "tasks_insert"
  ON public.tasks FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Tasks: owner can update their task; assigned worker can update task status
CREATE POLICY "tasks_update"
  ON public.tasks FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid() OR worker_id = auth.uid())
  WITH CHECK (user_id = auth.uid() OR worker_id = auth.uid());

-- Messages: participants (task owner or assigned worker) can read
CREATE POLICY "messages_select"
  ON public.task_messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.tasks t
      WHERE t.id = task_messages.task_id
        AND (t.user_id = auth.uid() OR t.worker_id = auth.uid())
    )
  );

-- Messages: sender_id MUST be auth.uid() — prevents spoofing
CREATE POLICY "messages_insert"
  ON public.task_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    sender_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.tasks t
      WHERE t.id = task_messages.task_id
        AND (t.user_id = auth.uid() OR t.worker_id = auth.uid())
    )
  );

-- Profiles: users can read their own profile
CREATE POLICY "profiles_select"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Profiles: users can update their own profile
CREATE POLICY "profiles_update"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Profiles: users can insert their own profile (guest OTP flow)
CREATE POLICY "profiles_insert"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- ── 5. Update accept_task to use auth.uid() validation ────────────────────
-- Replace function with security-definer that validates caller identity
CREATE OR REPLACE FUNCTION public.accept_task(p_task_id uuid, p_worker_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_status task_status;
  v_rows   int;
BEGIN
  -- Ensure caller matches p_worker_id (prevent impersonation)
  IF auth.uid() <> p_worker_id THEN
    RETURN 'unauthorized';
  END IF;

  SELECT status INTO v_status
  FROM public.tasks
  WHERE id = p_task_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN 'not_found';
  END IF;

  IF v_status <> 'waiting_for_worker' THEN
    RETURN 'already_taken';
  END IF;

  UPDATE public.tasks
  SET
    status     = 'in_progress',
    worker_id  = p_worker_id,
    updated_at = now()
  WHERE id = p_task_id;

  GET DIAGNOSTICS v_rows = ROW_COUNT;

  IF v_rows = 0 THEN
    RETURN 'already_taken';
  END IF;

  -- System message
  INSERT INTO public.task_messages (task_id, sender_id, content, is_system_message)
  VALUES (p_task_id, p_worker_id, 'تم قبول الطلب — بدأ العامل الشغل.', true);

  RETURN 'ok';
END;
$$;

-- ── 6. Mark phone_verified on OTP success ─────────────────────────────────
-- Function called by edge function after successful OTP verify
CREATE OR REPLACE FUNCTION public.mark_phone_verified(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.profiles
  SET phone_verified = true, updated_at = now()
  WHERE id = p_user_id;
END;
$$;

-- ── 7. Update handle_new_user trigger to default phone_verified correctly ──
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, phone, role, phone_verified, email_verified)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'phone', ''),
    'user',
    -- Guest/phone users have phone verified immediately; email users must verify email
    COALESCE((NEW.raw_user_meta_data->>'is_guest')::boolean, false),
    -- Email users: Supabase handles confirmation, but we default false
    false
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;
