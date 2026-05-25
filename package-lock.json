/*
  # Negotiation-Based Pricing System

  1. New columns on tasks table
     - `client_price` (numeric) — budget the client manually enters when creating a task
     - `worker_price` (numeric, nullable) — price the worker proposes when accepting a task
     - `negotiation_status` (text) — one of: 'pending' | 'accepted' | 'rejected'
       Starts as NULL (no negotiation yet), becomes 'pending' once worker sets their price,
       then 'accepted' or 'rejected' when either party decides.

  2. Updated accept_task function
     - Now accepts an additional parameter p_worker_price (numeric)
     - Stores it in worker_price column
     - Sets negotiation_status to 'pending'
     - Status stays 'in_progress' (task is accepted, negotiation runs in parallel)

  3. New DB functions
     - resolve_negotiation(p_task_id, p_resolution, p_resolved_by)
       Sets negotiation_status to 'accepted' or 'rejected'
       Adds a system message to the chat confirming the resolution
*/

-- ── 1. Add negotiation columns to tasks ───────────────────────────────────
ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS client_price numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS worker_price numeric,
  ADD COLUMN IF NOT EXISTS negotiation_status text
    CHECK (negotiation_status IN ('pending', 'accepted', 'rejected'));

-- ── 2. Updated accept_task function ───────────────────────────────────────
CREATE OR REPLACE FUNCTION public.accept_task(
  p_task_id    uuid,
  p_worker_id  uuid,
  p_worker_price numeric DEFAULT NULL
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_status task_status;
  v_rows   int;
BEGIN
  -- Caller must match the worker being assigned
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
    status             = 'in_progress',
    worker_id          = p_worker_id,
    worker_price       = p_worker_price,
    negotiation_status = CASE WHEN p_worker_price IS NOT NULL THEN 'pending' ELSE NULL END,
    updated_at         = now()
  WHERE id = p_task_id;

  GET DIAGNOSTICS v_rows = ROW_COUNT;

  IF v_rows = 0 THEN
    RETURN 'already_taken';
  END IF;

  -- System message: task accepted
  INSERT INTO public.task_messages (task_id, sender_id, content, is_system_message)
  VALUES (
    p_task_id,
    p_worker_id,
    'تم قبول الطلب — بدأ العامل الشغل.',
    true
  );

  -- System message: negotiation opened (if worker submitted a price)
  IF p_worker_price IS NOT NULL THEN
    INSERT INTO public.task_messages (task_id, sender_id, content, is_system_message)
    VALUES (
      p_task_id,
      p_worker_id,
      concat('عرض سعر العامل: ', p_worker_price::text, ' ريال — في انتظار موافقة العميل.'),
      true
    );
  END IF;

  RETURN 'ok';
END;
$$;

-- ── 3. Resolve negotiation function ───────────────────────────────────────
CREATE OR REPLACE FUNCTION public.resolve_negotiation(
  p_task_id     uuid,
  p_resolution  text,   -- 'accepted' or 'rejected'
  p_resolved_by uuid
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_task record;
  v_msg  text;
BEGIN
  IF auth.uid() <> p_resolved_by THEN
    RETURN 'unauthorized';
  END IF;

  IF p_resolution NOT IN ('accepted', 'rejected') THEN
    RETURN 'invalid_resolution';
  END IF;

  SELECT * INTO v_task
  FROM public.tasks
  WHERE id = p_task_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN 'not_found';
  END IF;

  -- Only task owner or assigned worker can resolve
  IF v_task.user_id <> auth.uid() AND v_task.worker_id <> auth.uid() THEN
    RETURN 'unauthorized';
  END IF;

  UPDATE public.tasks
  SET
    negotiation_status = p_resolution,
    -- If accepted, set final_price to worker_price (the agreed price)
    final_price        = CASE WHEN p_resolution = 'accepted' THEN v_task.worker_price ELSE final_price END,
    updated_at         = now()
  WHERE id = p_task_id;

  v_msg := CASE
    WHEN p_resolution = 'accepted' THEN
      concat('تم الاتفاق على السعر: ', v_task.worker_price::text, ' ريال.')
    ELSE
      'تم رفض عرض السعر. يمكن التفاوض عبر المحادثة.'
  END;

  INSERT INTO public.task_messages (task_id, sender_id, content, is_system_message)
  VALUES (p_task_id, p_resolved_by, v_msg, true);

  RETURN 'ok';
END;
$$;
