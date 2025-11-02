/*
  # Update Users Table for Supabase Auth Integration

  ## Description
  This migration updates the users table to work with Supabase Auth.
  The ID field now references the auth.users table, ensuring proper authentication.

  ## Changes
  1. Drop existing users table
  2. Recreate users table with proper auth.uid() reference
  3. Make password_hash optional (handled by Supabase Auth)
  4. Re-enable RLS with updated policies

  ## Security Notes
  - The id field now references auth.users
  - RLS policies updated to work with Supabase Auth
  - Users table is synced with authentication system
*/

-- Drop existing table and recreate
DROP TABLE IF EXISTS users CASCADE;

-- Create users table with auth reference
CREATE TABLE users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  username text NOT NULL,
  tag text NOT NULL CHECK (length(tag) = 4 AND tag ~ '^[A-Za-z0-9]{4}$'),
  password_hash text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  CONSTRAINT unique_username_tag UNIQUE (username, tag)
);

-- Create indexes for performance
CREATE INDEX idx_users_tag ON users(tag);
CREATE INDEX idx_users_username_tag ON users(username, tag);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Policy: Allow anyone to read for validation during registration
CREATE POLICY "Allow reading users for validation"
  ON users
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Policy: Allow authenticated users to insert their own profile
CREATE POLICY "Users can insert own profile"
  ON users
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Policy: Users can update their own data
CREATE POLICY "Users can update own data only"
  ON users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Policy: Prevent all deletions
CREATE POLICY "Prevent all user deletions"
  ON users
  FOR DELETE
  TO anon, authenticated
  USING (false);