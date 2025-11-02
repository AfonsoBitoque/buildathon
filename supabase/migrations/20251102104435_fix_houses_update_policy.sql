/*
  # Fix Houses Update Policy

  ## Description
  This migration fixes the UPDATE policy for houses table to allow the current
  creator to transfer ownership by updating the created_by field.

  ## Changes
  1. Drop existing UPDATE policy
  2. Create new UPDATE policy using auth.uid()
  3. Allow creator to update any field including created_by

  ## Important Notes
  - Uses auth.uid() instead of current_setting for better compatibility
  - USING checks current creator
  - WITH CHECK allows any authenticated user as new creator
*/

-- Drop existing update policy
DROP POLICY IF EXISTS "Creators can update their houses" ON houses;

-- Create new update policy that allows creator transfer
CREATE POLICY "Creators can update their houses"
  ON houses
  FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid())
  WITH CHECK (true);