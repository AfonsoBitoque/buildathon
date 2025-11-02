/*
  # Create Users Authentication Table

  ## Description
  This migration creates the core users table for the UniApp authentication system.
  It implements a unique tag-based identification system where each user has a 
  username combined with a 4-character unique tag (format: username#XXXX).

  ## New Tables
  - `users`
    - `id` (uuid, primary key) - Unique identifier for each user
    - `email` (text, unique, not null) - User's email address
    - `username` (text, not null) - User's chosen username (without tag)
    - `tag` (text, not null) - 4-character unique tag (letters/numbers)
    - `password_hash` (text, not null) - Hashed password for security
    - `created_at` (timestamptz) - Account creation timestamp
    - Unique constraint on (username, tag) combination

  ## Indexes
  - Index on `tag` column for efficient availability checks
  - Index on `email` column (implicit via unique constraint)
  - Index on (username, tag) combination for login lookups

  ## Security
  - Enable Row Level Security (RLS) on users table
  - Policy: Users can read their own data only
  - Policy: Anyone can insert (for registration)
  - Policy: Users can update their own data only
  - Policy: Users cannot delete accounts (admin only)

  ## Important Notes
  - Passwords are stored as hashes, never in plain text
  - The tag must be exactly 4 characters (letters, numbers, or both)
  - Email addresses must be unique across all users
  - The combination of username + tag must be unique
*/

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  username text NOT NULL,
  tag text NOT NULL CHECK (length(tag) = 4 AND tag ~ '^[A-Za-z0-9]{4}$'),
  password_hash text NOT NULL,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT unique_username_tag UNIQUE (username, tag)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_tag ON users(tag);
CREATE INDEX IF NOT EXISTS idx_users_username_tag ON users(username, tag);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read their own data
CREATE POLICY "Users can read own data"
  ON users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Policy: Allow public registration (insert)
CREATE POLICY "Anyone can register"
  ON users
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Policy: Users can update their own data
CREATE POLICY "Users can update own data"
  ON users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Policy: Prevent deletion (admin only would handle this separately)
CREATE POLICY "Prevent user deletion"
  ON users
  FOR DELETE
  TO authenticated
  USING (false);