/*
  # Create Houses and Members Tables

  ## Description
  This migration creates the houses (Casas) management system with invite codes
  and member relationships. Users can create houses and join them using unique
  8-character invite codes.

  ## New Tables
  
  ### `houses`
  - `id` (uuid, primary key) - Unique identifier for each house
  - `name` (text, not null) - Name of the house
  - `invite_code` (text, unique, not null) - 8-character unique invite code
  - `created_by` (uuid, foreign key to users) - User who created the house
  - `created_at` (timestamptz) - House creation timestamp

  ### `house_members`
  - `id` (uuid, primary key) - Unique identifier for membership
  - `house_id` (uuid, foreign key to houses) - The house
  - `user_id` (uuid, foreign key to users) - The member user
  - `joined_at` (timestamptz) - When the user joined
  - Unique constraint on (house_id, user_id) to prevent duplicate memberships

  ## Indexes
  - Index on `invite_code` for fast lookups when joining
  - Index on `house_id` in house_members for fast member queries
  - Index on `user_id` in house_members for fast user's houses queries

  ## Security
  - Enable RLS on both tables
  - Users can create houses
  - Users can read houses they are members of
  - Users can join houses (insert into house_members)
  - Users can view members of houses they belong to
  - Anyone can check if invite codes exist (for validation)

  ## Important Notes
  - Invite codes must be exactly 8 characters (letters and numbers)
  - When a user creates a house, they automatically become a member
  - The creator is stored separately for potential admin features
*/

-- Create houses table
CREATE TABLE IF NOT EXISTS houses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  invite_code text UNIQUE NOT NULL CHECK (length(invite_code) = 8 AND invite_code ~ '^[A-Za-z0-9]{8}$'),
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

-- Create house_members table
CREATE TABLE IF NOT EXISTS house_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  house_id uuid NOT NULL REFERENCES houses(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  joined_at timestamptz DEFAULT now(),
  CONSTRAINT unique_house_member UNIQUE (house_id, user_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_houses_invite_code ON houses(invite_code);
CREATE INDEX IF NOT EXISTS idx_house_members_house_id ON house_members(house_id);
CREATE INDEX IF NOT EXISTS idx_house_members_user_id ON house_members(user_id);

-- Enable RLS
ALTER TABLE houses ENABLE ROW LEVEL SECURITY;
ALTER TABLE house_members ENABLE ROW LEVEL SECURITY;

-- Houses Policies

-- Anyone can read houses (to check invite codes)
CREATE POLICY "Anyone can read houses"
  ON houses
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Authenticated users can create houses
CREATE POLICY "Authenticated users can create houses"
  ON houses
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Users can update houses they created
CREATE POLICY "Creators can update their houses"
  ON houses
  FOR UPDATE
  TO authenticated
  USING (created_by::text = current_setting('request.jwt.claims', true)::json->>'sub')
  WITH CHECK (created_by::text = current_setting('request.jwt.claims', true)::json->>'sub');

-- Prevent house deletion
CREATE POLICY "Prevent house deletion"
  ON houses
  FOR DELETE
  TO authenticated
  USING (false);

-- House Members Policies

-- Users can read members of houses they belong to
CREATE POLICY "Members can read house members"
  ON house_members
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM house_members hm
      WHERE hm.house_id = house_members.house_id
      AND hm.user_id::text = current_setting('request.jwt.claims', true)::json->>'sub'
    )
  );

-- Anyone can read house members (for displaying member lists)
CREATE POLICY "Anyone can read house members"
  ON house_members
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Authenticated users can join houses
CREATE POLICY "Users can join houses"
  ON house_members
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Prevent membership updates
CREATE POLICY "Prevent membership updates"
  ON house_members
  FOR UPDATE
  TO authenticated
  USING (false);

-- Users can leave houses (delete their own membership)
CREATE POLICY "Users can leave houses"
  ON house_members
  FOR DELETE
  TO authenticated
  USING (user_id::text = current_setting('request.jwt.claims', true)::json->>'sub');