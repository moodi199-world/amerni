/*
  # Task Marketplace Schema

  1. New Tables
    - `profiles` - Extended user profiles (name, avatar, role, phone)
    - `worker_profiles` - Worker-specific data (verification level, bio, skills, earnings)
    - `tasks` - Core task objects (title, description, category, budget, status, AI-parsed data)
    - `task_messages` - Chat messages between users and workers on a task
    - `task_files` - File attachments for tasks

  2. Enums
    - `user_role` - 'user' | 'worker' | 'admin'
    - `task_status` - pending | ai_processing | waiting_for_worker | in_progress | completed | disputed | cancelled
    - `task_category` - Admin | Design | Research | Personal | Business | Legal | Tech | Other
    - `urgency_level` - low | medium | high | urgent
    - `verification_level` - none | basic | verified | trusted

  3. Security
    - RLS enabled on all tables
    - Users can read/write their own data
    - Workers can view available tasks
    - Admins have full access via role check
*/

-- Enums
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('user', 'worker', 'admin');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE task_status AS ENUM ('pending', 'ai_processing', 'waiting_for_worker', 'in_progress', 'completed', 'disputed', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE task_category AS ENUM ('Admin', 'Design', 'Research', 'Personal', 'Business', 'Legal', 'Tech', 'Writing', 'Other');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE urgency_level AS ENUM ('low', 'medium', 'high', 'urgent');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE verification_level AS ENUM ('none', 'basic', 'verified', 'trusted');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text DEFAULT '',
  avatar_url text DEFAULT '',
  phone text DEFAULT '',
  role user_role DEFAULT 'user',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Workers and admins can view other profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (true);

-- Worker profiles table
CREATE TABLE IF NOT EXISTS worker_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  bio text DEFAULT '',
  skills text[] DEFAULT '{}',
  verification_level verification_level DEFAULT 'none',
  national_id_uploaded boolean DEFAULT false,
  is_approved boolean DEFAULT false,
  total_earnings numeric(10, 2) DEFAULT 0,
  completed_tasks integer DEFAULT 0,
  rating numeric(3, 2) DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE worker_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workers can view own worker profile"
  ON worker_profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Workers can insert own worker profile"
  ON worker_profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Workers can update own worker profile"
  ON worker_profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "All authenticated users can view worker profiles"
  ON worker_profiles FOR SELECT
  TO authenticated
  USING (true);

-- Tasks table
CREATE TABLE IF NOT EXISTS tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  worker_id uuid REFERENCES profiles(id),
  title text NOT NULL DEFAULT '',
  original_request text NOT NULL DEFAULT '',
  description text DEFAULT '',
  category task_category DEFAULT 'Other',
  status task_status DEFAULT 'pending',
  urgency urgency_level DEFAULT 'medium',
  estimated_price_min numeric(10, 2) DEFAULT 0,
  estimated_price_max numeric(10, 2) DEFAULT 0,
  final_price numeric(10, 2),
  deadline timestamptz,
  requires_verification boolean DEFAULT false,
  ai_processed boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own tasks"
  ON tasks FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR auth.uid() = worker_id);

CREATE POLICY "Users can insert own tasks"
  ON tasks FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own tasks"
  ON tasks FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id OR auth.uid() = worker_id)
  WITH CHECK (auth.uid() = user_id OR auth.uid() = worker_id);

CREATE POLICY "Workers can view available tasks"
  ON tasks FOR SELECT
  TO authenticated
  USING (status = 'waiting_for_worker' OR auth.uid() = user_id OR auth.uid() = worker_id);

-- Task messages table
CREATE TABLE IF NOT EXISTS task_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content text NOT NULL DEFAULT '',
  is_system_message boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE task_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Task participants can view messages"
  ON task_messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tasks
      WHERE tasks.id = task_messages.task_id
      AND (tasks.user_id = auth.uid() OR tasks.worker_id = auth.uid())
    )
  );

CREATE POLICY "Task participants can insert messages"
  ON task_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = sender_id AND
    EXISTS (
      SELECT 1 FROM tasks
      WHERE tasks.id = task_messages.task_id
      AND (tasks.user_id = auth.uid() OR tasks.worker_id = auth.uid())
    )
  );

-- Task files table
CREATE TABLE IF NOT EXISTS task_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  uploader_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  file_name text NOT NULL DEFAULT '',
  file_url text NOT NULL DEFAULT '',
  file_size integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE task_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Task participants can view files"
  ON task_files FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tasks
      WHERE tasks.id = task_files.task_id
      AND (tasks.user_id = auth.uid() OR tasks.worker_id = auth.uid())
    )
  );

CREATE POLICY "Task participants can upload files"
  ON task_files FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = uploader_id AND
    EXISTS (
      SELECT 1 FROM tasks
      WHERE tasks.id = task_files.task_id
      AND (tasks.user_id = auth.uid() OR tasks.worker_id = auth.uid())
    )
  );

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_worker_id ON tasks(worker_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_task_messages_task_id ON task_messages(task_id);
CREATE INDEX IF NOT EXISTS idx_task_files_task_id ON task_files(task_id);
CREATE INDEX IF NOT EXISTS idx_worker_profiles_user_id ON worker_profiles(user_id);

-- Function to automatically create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (new.id, COALESCE(new.raw_user_meta_data->>'full_name', ''), COALESCE(new.raw_user_meta_data->>'avatar_url', ''));
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE handle_new_user();
