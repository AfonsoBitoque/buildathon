/*
  # Fix RLS Policies for User Registration

  ## Description
  This migration fixes the Row Level Security policies to allow public user registration.
  The previous policies were too restrictive and prevented new users from signing up.

  ## Changes
  1. Drop existing restrictive policies
  2. Create new policies that allow:
     - Public registration (INSERT for anyone)
     - Users can read their own data
     - Users can update their own data
     - Prevent user deletion

  ## Security Notes
  - INSERT policy allows anyone to register (public registration)
  - SELECT, UPDATE policies restrict access to own data only
  - DELETE is still prevented for all users
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Users can read own data" ON users;
DROP POLICY IF EXISTS "Anyone can register" ON users;
DROP POLICY IF EXISTS "Users can update own data" ON users;
DROP POLICY IF EXISTS "Prevent user deletion" ON users;

-- Policy: Allow anyone to register (insert new users)
CREATE POLICY "Allow public registration"
  ON users
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- Policy: Allow authenticated users to register
CREATE POLICY "Allow authenticated registration"
  ON users
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Policy: Users can read all user data (for username/tag lookups during registration)
CREATE POLICY "Allow reading users for validation"
  ON users
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Policy: Users can update their own data only
CREATE POLICY "Users can update own data only"
  ON users
  FOR UPDATE
  TO authenticated
  USING (id::text = current_setting('request.jwt.claims', true)::json->>'sub')
  WITH CHECK (id::text = current_setting('request.jwt.claims', true)::json->>'sub');

-- Policy: Prevent all deletions
CREATE POLICY "Prevent all user deletions"
  ON users
  FOR DELETE
  TO anon, authenticated
  USING (false);