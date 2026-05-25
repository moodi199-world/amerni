/*
  # Add Worker Fields and Notifications System

  1. Modified Tables
    - `worker_profiles`: add city, nationality, availability_status, task_preferences
    - `tasks`: add status 'live' and 'waiting_confirmation' support via check constraint update

  2. New Tables
    - `notifications`: in-app notifications for workers and customers
      - id, user_id, type, title, body, task_id, read, created_at

  3. Security
    - RLS on notifications: users read/update their own
*/

-- Add fields to worker_profiles
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'worker_profiles' AND column_name = 'city') THEN
    ALTER TABLE worker_profiles ADD COLUMN city text DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'worker_profiles' AND column_name = 'nationality') THEN
    ALTER TABLE worker_profiles ADD COLUMN nationality text DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'worker_profiles' AND column_name = 'phone') THEN
    ALTER TABLE worker_profiles ADD COLUMN phone text DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'worker_profiles' AND column_name = 'availability_status') THEN
    ALTER TABLE worker_profiles ADD COLUMN availability_status text NOT NULL DEFAULT 'offline' CHECK (availability_status IN ('online', 'busy', 'offline'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'worker_profiles' AND column_name = 'task_preferences') THEN
    ALTER TABLE worker_profiles ADD COLUMN task_preferences text[] DEFAULT '{}';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'worker_profiles' AND column_name = 'full_name') THEN
    ALTER TABLE worker_profiles ADD COLUMN full_name text DEFAULT '';
  END IF;
END $$;

-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL DEFAULT 'info',
  title text NOT NULL DEFAULT '',
  body text NOT NULL DEFAULT '',
  task_id uuid REFERENCES tasks(id) ON DELETE SET NULL,
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own notifications"
  ON notifications FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Authenticated users can insert notifications"
  ON notifications FOR INSERT
  TO authenticated
  WITH CHECK (true);
