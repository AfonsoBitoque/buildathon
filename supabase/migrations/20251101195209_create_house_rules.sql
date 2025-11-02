/*
  # Create House Rules Module

  ## Description
  This migration creates the house_rules table to store the rules text for each house.
  Only the house creator can edit the rules, but all members can view them.

  ## New Tables
  - `house_rules`
    - `id` (uuid, primary key) - Unique identifier for the rule
    - `house_id` (uuid, foreign key) - References houses table
    - `content` (text) - The rules content (multi-line text)
    - `created_by` (uuid, foreign key) - References auth.users (house creator)
    - `created_at` (timestamptz) - Timestamp of creation
    - `updated_at` (timestamptz) - Timestamp of last update

  ## Security
  - Enable RLS on house_rules table
  - SELECT policy: All house members can view the rules
  - INSERT policy: Only house creator can create rules
  - UPDATE policy: Only house creator can update rules
  - DELETE policy: Only house creator can delete rules (for cleanup)

  ## Important Notes
  1. Each house should have only one rules entry
  2. The content field has no strict character limit
  3. The creator is determined by the houses table relationship
*/

-- Create house_rules table
CREATE TABLE IF NOT EXISTS house_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  house_id uuid REFERENCES houses(id) ON DELETE CASCADE NOT NULL UNIQUE,
  content text DEFAULT '',
  created_by uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE house_rules ENABLE ROW LEVEL SECURITY;

-- Policy: All house members can view the rules
CREATE POLICY "Members can view house rules"
  ON house_rules
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM house_members
      WHERE house_members.house_id = house_rules.house_id
      AND house_members.user_id = auth.uid()
    )
  );

-- Policy: Only house creator can create rules
CREATE POLICY "House creator can create rules"
  ON house_rules
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM houses
      WHERE houses.id = house_rules.house_id
      AND houses.created_by = auth.uid()
    )
    AND created_by = auth.uid()
  );

-- Policy: Only house creator can update rules
CREATE POLICY "House creator can update rules"
  ON house_rules
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM houses
      WHERE houses.id = house_rules.house_id
      AND houses.created_by = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM houses
      WHERE houses.id = house_rules.house_id
      AND houses.created_by = auth.uid()
    )
  );

-- Policy: Only house creator can delete rules
CREATE POLICY "House creator can delete rules"
  ON house_rules
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM houses
      WHERE houses.id = house_rules.house_id
      AND houses.created_by = auth.uid()
    )
  );

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_house_rules_house_id ON house_rules(house_id);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_house_rules_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to call the function
DROP TRIGGER IF EXISTS set_house_rules_updated_at ON house_rules;
CREATE TRIGGER set_house_rules_updated_at
  BEFORE UPDATE ON house_rules
  FOR EACH ROW
  EXECUTE FUNCTION update_house_rules_updated_at();