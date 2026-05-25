/*
  # Realtime + Atomic Task Accept + Profile Auto-Creation

  1. Realtime
     - Enable realtime publication for tasks, task_messages, profiles tables
       so Supabase channel subscriptions work correctly

  2. Atomic task accept function
     - `accept_task(p_task_id uuid, p_worker_id uuid)` 
     - Uses advisory lock pattern: only one caller wins when multiple workers
       try to accept the same task simultaneously
     - Returns 'ok' on success, 'already_taken' if task was already assigned,
       'not_found' if task does not exist or is not in waiting_for_worker state

  3. Profile auto-creation trigger
     - Ensures every new auth.users row gets a corresponding profiles row
     - Safe: uses ON CONFLICT DO NOTHING so it never overwrites existing profiles
     - Reads phone from user_metadata if present

  4. RLS additions
     - Workers can read all waiting_for_worker tasks (for feed)
     - Workers can update tasks they are assigned to (for status changes)
*/

-- ── 1. Realtime ──────────────────────────────────────────────────────────────
-- Add tables to the supabase_realtime publication (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'tasks'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE tasks;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'task_messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE task_messages;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'profiles'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE profiles;
  END IF;
END $$;

-- ── 2. Atomic task accept function ───────────────────────────────────────────
CREATE OR REPLACE FUNCTION accept_task(p_task_id uuid, p_worker_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_status task_status;
  v_rows   int;
BEGIN
  -- Lock the specific task row to prevent concurrent accepts
  SELECT status INTO v_status
  FROM tasks
  WHERE id = p_task_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN 'not_found';
  END IF;

  IF v_status <> 'waiting_for_worker' THEN
    RETURN 'already_taken';
  END IF;

  UPDATE tasks
  SET
    status    = 'in_progress',
    worker_id = p_worker_id,
    updated_at = now()
  WHERE id = p_task_id;

  GET DIAGNOSTICS v_rows = ROW_COUNT;

  IF v_rows = 0 THEN
    RETURN 'already_taken';
  END IF;

  -- Insert system message into chat
  INSERT INTO task_messages (task_id, sender_id, content, is_system_message)
  VALUES (p_task_id, p_worker_id, 'تم قبول الطلب — بدأ العامل الشغل.', true);

  RETURN 'ok';
END;
$$;

-- ── 3. Profile auto-creation trigger ────────────────────────────────────────
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, phone, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'phone', ''),
    'user'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ── 4. RLS policy additions ──────────────────────────────────────────────────

-- Workers can see all open tasks in the feed
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'tasks' AND policyname = 'Workers can view open tasks'
  ) THEN
    CREATE POLICY "Workers can view open tasks"
      ON tasks FOR SELECT
      TO authenticated
      USING (
        status = 'waiting_for_worker'
        OR user_id = auth.uid()
        OR worker_id = auth.uid()
      );
  END IF;
END $$;

-- Workers can update tasks assigned to them (e.g. mark complete)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'tasks' AND policyname = 'Workers can update assigned tasks'
  ) THEN
    CREATE POLICY "Workers can update assigned tasks"
      ON tasks FOR UPDATE
      TO authenticated
      USING (worker_id = auth.uid() OR user_id = auth.uid())
      WITH CHECK (worker_id = auth.uid() OR user_id = auth.uid());
  END IF;
END $$;

-- Users can insert their own tasks
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'tasks' AND policyname = 'Users can insert own tasks'
  ) THEN
    CREATE POLICY "Users can insert own tasks"
      ON tasks FOR INSERT
      TO authenticated
      WITH CHECK (user_id = auth.uid());
  END IF;
END $$;

-- Anyone authenticated can read messages for tasks they participate in
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'task_messages' AND policyname = 'Participants can view messages'
  ) THEN
    CREATE POLICY "Participants can view messages"
      ON task_messages FOR SELECT
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM tasks t
          WHERE t.id = task_messages.task_id
            AND (t.user_id = auth.uid() OR t.worker_id = auth.uid())
        )
      );
  END IF;
END $$;

-- Participants can send messages
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'task_messages' AND policyname = 'Participants can send messages'
  ) THEN
    CREATE POLICY "Participants can send messages"
      ON task_messages FOR INSERT
      TO authenticated
      WITH CHECK (
        sender_id = auth.uid()
        AND EXISTS (
          SELECT 1 FROM tasks t
          WHERE t.id = task_messages.task_id
            AND (t.user_id = auth.uid() OR t.worker_id = auth.uid())
        )
      );
  END IF;
END $$;

-- Profiles are readable by the owner
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'profiles' AND policyname = 'Users can read own profile'
  ) THEN
    CREATE POLICY "Users can read own profile"
      ON profiles FOR SELECT
      TO authenticated
      USING (auth.uid() = id);
  END IF;
END $$;

-- Profiles are updatable by the owner
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'profiles' AND policyname = 'Users can update own profile'
  ) THEN
    CREATE POLICY "Users can update own profile"
      ON profiles FOR UPDATE
      TO authenticated
      USING (auth.uid() = id)
      WITH CHECK (auth.uid() = id);
  END IF;
END $$;

-- Profiles can be created for own user (for guest sign-up flow)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'profiles' AND policyname = 'Users can insert own profile'
  ) THEN
    CREATE POLICY "Users can insert own profile"
      ON profiles FOR INSERT
      TO authenticated
      WITH CHECK (auth.uid() = id);
  END IF;
END $$;
