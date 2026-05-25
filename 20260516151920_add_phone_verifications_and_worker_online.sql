/*
  # Add Phone Verifications and Worker Online Status

  1. New Tables
    - `phone_verifications`
      - `id` (uuid, primary key)
      - `phone` (text) - normalized phone number (e.g., "966501234567")
      - `otp` (text) - 6-digit OTP code
      - `expires_at` (timestamptz) - 10-minute expiry
      - `verified` (boolean) - whether this OTP was successfully used
      - `created_at` (timestamptz)

  2. Modified Tables
    - `worker_profiles`: add `is_online` boolean column (default false)

  3. Security
    - Enable RLS on `phone_verifications`
    - No direct user access — all access via edge function using service role
    - Worker online status readable by authenticated users (for matching UI)
    - Workers can update their own online status
*/

-- Add is_online to worker_profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'worker_profiles' AND column_name = 'is_online'
  ) THEN
    ALTER TABLE worker_profiles ADD COLUMN is_online boolean NOT NULL DEFAULT false;
  END IF;
END $$;

-- Create phone_verifications table
CREATE TABLE IF NOT EXISTS phone_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone text NOT NULL,
  otp text NOT NULL,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '10 minutes'),
  verified boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE phone_verifications ENABLE ROW LEVEL SECURITY;

-- No user-facing RLS policies — edge function uses service role key
-- Add index for fast OTP lookups
CREATE INDEX IF NOT EXISTS idx_phone_verifications_phone ON phone_verifications(phone);
CREATE INDEX IF NOT EXISTS idx_phone_verifications_expires_at ON phone_verifications(expires_at);

-- Allow workers to update their own online status
CREATE POLICY "Workers can update own online status"
  ON worker_profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
