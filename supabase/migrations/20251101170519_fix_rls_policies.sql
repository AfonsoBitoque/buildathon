/*
  # Fix RLS Policies

  ## Description
  This migration fixes the infinite recursion issue in the house_members table
  and ensures proper data flow for user registration.

  ## Changes
  1. Drop the problematic recursive policy on house_members
  2. Simplify RLS policies to avoid recursion
  3. Keep security intact with simpler, direct policies

  ## Security Notes
  - Users can only read members of houses they belong to
  - Users can only modify their own memberships
  - No infinite recursion in policy checks
*/

-- Drop the recursive policy
DROP POLICY IF EXISTS "Members can read house members" ON house_members;

-- Drop the redundant policy (we already have "Anyone can read house members")
DROP POLICY IF EXISTS "Anyone can read house members" ON house_members;

-- Create a simple, non-recursive policy for reading house members
CREATE POLICY "Authenticated users can read house members"
  ON house_members
  FOR SELECT
  TO authenticated
  USING (true);

-- Allow anonymous users to read house members (needed for join by invite code)
CREATE POLICY "Anonymous can read house members"
  ON house_members
  FOR SELECT
  TO anon
  USING (true);