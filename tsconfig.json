-- ══════════════════════════════════════════════════════════════
-- Worker registration new fields + notifications improvements
-- ══════════════════════════════════════════════════════════════

-- ── 1. Add new fields to worker_profiles ─────────────────────
ALTER TABLE public.worker_profiles
  ADD COLUMN IF NOT EXISTS id_type        text DEFAULT 'saudi',
  ADD COLUMN IF NOT EXISTS id_number      text,
  ADD COLUMN IF NOT EXISTS id_image_url   text,
  ADD COLUMN IF NOT EXISTS national_address text,
  ADD COLUMN IF NOT EXISTS id_verified    boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS id_verified_at timestamptz;

-- ── 2. Worker docs storage bucket (run in dashboard) ──────────
-- Storage → New bucket → Name: worker-docs → Public: false

-- ── 3. Ensure notifications table exists ─────────────────────
CREATE TABLE IF NOT EXISTS public.notifications (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  type        text NOT NULL DEFAULT 'info',
  title       text NOT NULL,
  body        text NOT NULL DEFAULT '',
  task_id     uuid REFERENCES public.tasks(id) ON DELETE SET NULL,
  read        boolean DEFAULT false,
  created_at  timestamptz DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_own_notifs" ON public.notifications;
CREATE POLICY "users_own_notifs" ON public.notifications
  FOR ALL USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_notifs_user_unread
  ON public.notifications(user_id, read, created_at DESC);

-- ── 4. Function: send notification ──────────────────────────
CREATE OR REPLACE FUNCTION public.send_notification(
  p_user_id  uuid,
  p_type     text,
  p_title    text,
  p_body     text,
  p_task_id  uuid DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.notifications (user_id, type, title, body, task_id)
  VALUES (p_user_id, p_type, p_title, p_body, p_task_id);
END;
$$;

-- ── 5. Auto-notify on task accepted ─────────────────────────
CREATE OR REPLACE FUNCTION public.notify_on_task_accept()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  -- Notify client when worker accepts
  IF NEW.status = 'in_progress' AND OLD.status = 'waiting_for_worker' AND NEW.worker_id IS NOT NULL THEN
    PERFORM public.send_notification(
      NEW.user_id, 'task_accepted',
      'تم قبول طلبك!',
      'عامل بدأ العمل على طلبك. يمكنك متابعته الآن.',
      NEW.id
    );
  END IF;

  -- Notify client when task completed
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    PERFORM public.send_notification(
      NEW.user_id, 'task_completed',
      'تم إنجاز طلبك 🎉',
      'أكّد الاستلام وقيّم العامل لمساعدة الآخرين.',
      NEW.id
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_task_accept ON public.tasks;
CREATE TRIGGER trg_notify_task_accept
  AFTER UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_task_accept();

-- ── 6. Auto-notify worker on new matching task ───────────────
CREATE OR REPLACE FUNCTION public.notify_workers_new_task()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NEW.status = 'waiting_for_worker' THEN
    -- Notify all online approved workers
    INSERT INTO public.notifications (user_id, type, title, body, task_id)
    SELECT wp.user_id, 'new_task',
           'طلب جديد متاح',
           concat('طلب جديد: ', left(NEW.title, 60)),
           NEW.id
    FROM public.worker_profiles wp
    WHERE wp.is_approved = true
      AND wp.availability_status = 'online'
      AND wp.is_online = true;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_workers ON public.tasks;
CREATE TRIGGER trg_notify_workers
  AFTER INSERT ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.notify_workers_new_task();
