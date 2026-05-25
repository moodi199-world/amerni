-- ═══════════════════════════════════════════════════════════════
-- أمرني — New Features Migration
-- 1. Message filter log
-- 2. File escrow (locked until payment confirmed)
-- 3. Worker availability & schedule
-- 4. Ratings & comments
-- 5. AI price range on tasks
-- ═══════════════════════════════════════════════════════════════

-- ── 1. Add AI price range to tasks ──────────────────────────────
ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS ai_price_min   numeric,
  ADD COLUMN IF NOT EXISTS ai_price_max   numeric,
  ADD COLUMN IF NOT EXISTS ai_price_label text;   -- e.g. "خدمة بسيطة"

-- ── 2. Message filter log ────────────────────────────────────────
-- Stores blocked messages so admin can review patterns
CREATE TABLE IF NOT EXISTS public.blocked_messages (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id     uuid REFERENCES public.tasks(id) ON DELETE CASCADE,
  sender_id   uuid REFERENCES auth.users(id)   ON DELETE CASCADE,
  content     text NOT NULL,
  reason      text NOT NULL,  -- 'phone' | 'email' | 'social' | 'external_contact'
  created_at  timestamptz DEFAULT now()
);

ALTER TABLE public.blocked_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins_see_blocked" ON public.blocked_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ── 3. File escrow ───────────────────────────────────────────────
-- Extend task_files with lock status
ALTER TABLE public.task_files
  ADD COLUMN IF NOT EXISTS is_locked      boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS lock_reason    text DEFAULT 'awaiting_payment_confirmation',
  ADD COLUMN IF NOT EXISTS unlocked_at    timestamptz,
  ADD COLUMN IF NOT EXISTS unlocked_by    uuid REFERENCES auth.users(id);

-- Function: worker confirms payment received → unlock files
CREATE OR REPLACE FUNCTION public.unlock_task_files(
  p_task_id   uuid,
  p_worker_id uuid
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF auth.uid() <> p_worker_id THEN
    RETURN 'unauthorized';
  END IF;

  -- Verify this worker owns the task
  IF NOT EXISTS (
    SELECT 1 FROM public.tasks
    WHERE id = p_task_id AND worker_id = p_worker_id
  ) THEN
    RETURN 'not_found';
  END IF;

  UPDATE public.task_files
  SET
    is_locked    = false,
    unlocked_at  = now(),
    unlocked_by  = p_worker_id,
    lock_reason  = 'payment_confirmed'
  WHERE task_id = p_task_id AND is_locked = true;

  -- System message
  INSERT INTO public.task_messages (task_id, sender_id, content, is_system_message)
  VALUES (
    p_task_id,
    p_worker_id,
    '✅ تم تأكيد استلام المبلغ — الملفات أصبحت متاحة للعميل.',
    true
  );

  RETURN 'ok';
END;
$$;

-- Function: client confirms payment sent → also unlock (mutual confirm)
CREATE OR REPLACE FUNCTION public.client_confirm_payment(
  p_task_id  uuid,
  p_user_id  uuid
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_worker_id uuid;
BEGIN
  IF auth.uid() <> p_user_id THEN
    RETURN 'unauthorized';
  END IF;

  SELECT worker_id INTO v_worker_id
  FROM public.tasks
  WHERE id = p_task_id AND user_id = p_user_id;

  IF NOT FOUND THEN
    RETURN 'not_found';
  END IF;

  UPDATE public.task_files
  SET
    is_locked   = false,
    unlocked_at = now(),
    unlocked_by = p_user_id,
    lock_reason = 'client_confirmed_payment'
  WHERE task_id = p_task_id AND is_locked = true;

  INSERT INTO public.task_messages (task_id, sender_id, content, is_system_message)
  VALUES (
    p_task_id,
    p_user_id,
    '✅ العميل أكد إرسال المبلغ — الملفات ظهرت للعميل.',
    true
  );

  -- Auto-complete task
  UPDATE public.tasks
  SET status = 'completed', updated_at = now()
  WHERE id = p_task_id;

  RETURN 'ok';
END;
$$;

-- ── 4. Worker availability & schedule ────────────────────────────
CREATE TABLE IF NOT EXISTS public.worker_schedule (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id   uuid REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  -- days: array of 0=Sun..6=Sat
  work_days   int[]    DEFAULT '{0,1,2,3,4,5,6}',
  start_hour  int      DEFAULT 8,   -- 8 AM
  end_hour    int      DEFAULT 22,  -- 10 PM
  is_available boolean DEFAULT true,
  updated_at  timestamptz DEFAULT now()
);

ALTER TABLE public.worker_schedule ENABLE ROW LEVEL SECURITY;

CREATE POLICY "worker_own_schedule" ON public.worker_schedule
  FOR ALL USING (auth.uid() = worker_id);

CREATE POLICY "read_schedule" ON public.worker_schedule
  FOR SELECT USING (true);

-- ── 5. Ratings & comments ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ratings (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id     uuid REFERENCES public.tasks(id) ON DELETE CASCADE UNIQUE,
  worker_id   uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  rater_id    uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  stars       int  NOT NULL CHECK (stars BETWEEN 1 AND 5),
  comment     text,
  is_public   boolean DEFAULT true,
  created_at  timestamptz DEFAULT now()
);

ALTER TABLE public.ratings ENABLE ROW LEVEL SECURITY;

-- Anyone can read public ratings
CREATE POLICY "read_public_ratings" ON public.ratings
  FOR SELECT USING (is_public = true);

-- Only task owner can insert
CREATE POLICY "insert_rating" ON public.ratings
  FOR INSERT WITH CHECK (
    auth.uid() = rater_id
    AND EXISTS (
      SELECT 1 FROM public.tasks
      WHERE id = task_id
        AND user_id = auth.uid()
        AND status = 'completed'
    )
  );

-- Function: submit rating
CREATE OR REPLACE FUNCTION public.submit_rating(
  p_task_id  uuid,
  p_stars    int,
  p_comment  text DEFAULT NULL
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_task record;
BEGIN
  SELECT * INTO v_task FROM public.tasks WHERE id = p_task_id;

  IF NOT FOUND THEN RETURN 'not_found'; END IF;
  IF v_task.user_id <> auth.uid() THEN RETURN 'unauthorized'; END IF;
  IF v_task.status <> 'completed' THEN RETURN 'task_not_completed'; END IF;
  IF p_stars NOT BETWEEN 1 AND 5 THEN RETURN 'invalid_stars'; END IF;

  INSERT INTO public.ratings (task_id, worker_id, rater_id, stars, comment)
  VALUES (p_task_id, v_task.worker_id, auth.uid(), p_stars, p_comment)
  ON CONFLICT (task_id) DO UPDATE
    SET stars = p_stars, comment = p_comment;

  -- Update worker's average rating in worker_profiles
  UPDATE public.worker_profiles
  SET rating = (
    SELECT ROUND(AVG(stars)::numeric, 1)
    FROM public.ratings
    WHERE worker_id = v_task.worker_id
  )
  WHERE user_id = v_task.worker_id;

  RETURN 'ok';
END;
$$;

-- Index for fast rating lookup by worker
CREATE INDEX IF NOT EXISTS idx_ratings_worker ON public.ratings(worker_id);
CREATE INDEX IF NOT EXISTS idx_task_files_locked ON public.task_files(task_id, is_locked);
