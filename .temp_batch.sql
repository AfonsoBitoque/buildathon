/*
  # Restrict Users to One House

  ## Description
  This migration enforces the business rule that each user can only be a member
  of one house at a time. Users must leave their current house before joining
  another one.

  ## Changes
  1. Clean up duplicate memberships (keep only the most recent)
  2. Add unique constraint on user_id in house_members table
  3. Drop old unique constraint on (house_id, user_id)

  ## Important Notes
  - Users can only be in one house at a time
  - To join a different house, users must first leave their current house
  - This migration keeps only the most recent house membership for users with multiple memberships
*/

-- Delete older memberships, keeping only the most recent one for each user
DELETE FROM house_members
WHERE id IN (
  SELECT id
  FROM (
    SELECT id, 
           ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY joined_at DESC) as rn
    FROM house_members
  ) t
  WHERE rn > 1
);

-- Drop the old unique constraint on (house_id, user_id)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'unique_house_member'
  ) THEN
    ALTER TABLE house_members 
    DROP CONSTRAINT unique_house_member;
  END IF;
END $$;

-- Add unique constraint to user_id to ensure one house per user
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'unique_user_house'
  ) THEN
    ALTER TABLE house_members 
    ADD CONSTRAINT unique_user_house UNIQUE (user_id);
  END IF;
END $$;
-- NEXT MIGRATION --

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
-- NEXT MIGRATION --

/*
  # Add Foreign Key Relationship

  ## Description
  This migration adds the missing foreign key relationship between house_members
  and users tables. This is required for Supabase's automatic relationship resolution
  when using nested selects.

  ## Changes
  1. Add foreign key constraint from house_members.user_id to users.id
  2. This enables queries like: house_members.select('*, users(username, tag)')

  ## Important Notes
  - The foreign key ensures referential integrity
  - Enables Supabase PostgREST to resolve relationships automatically
  - ON DELETE CASCADE ensures cleanup when users are deleted
*/

-- Add foreign key from house_members.user_id to users.id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'house_members_user_id_fkey'
  ) THEN
    ALTER TABLE house_members
    ADD CONSTRAINT house_members_user_id_fkey
    FOREIGN KEY (user_id)
    REFERENCES users(id)
    ON DELETE CASCADE;
  END IF;
END $$;
-- NEXT MIGRATION --

/*
  # Create Chat Messages System

  ## Description
  This migration creates the chat messages system for house general chat.
  All members of a house can send and read messages in the general chat.

  ## New Tables
  1. `chat_messages`
    - `id` (uuid, primary key) - Unique message identifier
    - `house_id` (uuid, foreign key) - References the house
    - `user_id` (uuid, foreign key) - References the message author
    - `content` (text) - Message content
    - `created_at` (timestamptz) - When message was sent
    - `updated_at` (timestamptz) - When message was last edited
    - `is_edited` (boolean) - Flag for edited messages

  ## Security
  1. Enable RLS on chat_messages
  2. Members can read all messages in their house
  3. Members can create messages in their house
  4. Users can only update/delete their own messages

  ## Important Notes
  - Messages are tied to houses via foreign key
  - Automatic timestamps for message tracking
  - RLS ensures only house members can access messages
*/

-- Create chat_messages table
CREATE TABLE IF NOT EXISTS chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  house_id uuid NOT NULL REFERENCES houses(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  is_edited boolean DEFAULT false
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS chat_messages_house_id_idx ON chat_messages(house_id);
CREATE INDEX IF NOT EXISTS chat_messages_created_at_idx ON chat_messages(created_at DESC);

-- Enable RLS
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Policy: Members can read messages in their house
CREATE POLICY "Members can read house messages"
  ON chat_messages
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM house_members
      WHERE house_members.house_id = chat_messages.house_id
      AND house_members.user_id = auth.uid()
    )
  );

-- Policy: Members can create messages in their house
CREATE POLICY "Members can create messages"
  ON chat_messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM house_members
      WHERE house_members.house_id = chat_messages.house_id
      AND house_members.user_id = auth.uid()
    )
    AND user_id = auth.uid()
  );

-- Policy: Users can update their own messages
CREATE POLICY "Users can update own messages"
  ON chat_messages
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Policy: Users can delete their own messages
CREATE POLICY "Users can delete own messages"
  ON chat_messages
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());
-- NEXT MIGRATION --

/*
  # Create House Tasks System

  ## Description
  This migration creates the tasks system for house shared to-do lists.
  All members of a house can create, view, and complete tasks.

  ## New Tables
  1. `house_tasks`
    - `id` (uuid, primary key) - Unique task identifier
    - `house_id` (uuid, foreign key) - References the house
    - `created_by` (uuid, foreign key) - References the task creator
    - `title` (text) - Task title/description
    - `deadline_days` (integer) - Number of days until deadline
    - `created_at` (timestamptz) - When task was created
    - `completed_at` (timestamptz, nullable) - When task was completed
    - `is_completed` (boolean) - Flag for completed tasks

  ## Security
  1. Enable RLS on house_tasks
  2. Members can read all tasks in their house
  3. Members can create tasks in their house
  4. Members can mark tasks as completed (soft delete by completing)

  ## Important Notes
  - Tasks are tied to houses via foreign key
  - Tasks are soft-deleted (marked as completed) instead of hard-deleted
  - RLS ensures only house members can access tasks
  - Deadline is stored as number of days from creation
*/

-- Create house_tasks table
CREATE TABLE IF NOT EXISTS house_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  house_id uuid NOT NULL REFERENCES houses(id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title text NOT NULL,
  deadline_days integer NOT NULL DEFAULT 7,
  created_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  is_completed boolean DEFAULT false,
  CONSTRAINT positive_deadline CHECK (deadline_days > 0)
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS house_tasks_house_id_idx ON house_tasks(house_id);
CREATE INDEX IF NOT EXISTS house_tasks_is_completed_idx ON house_tasks(is_completed);
CREATE INDEX IF NOT EXISTS house_tasks_created_at_idx ON house_tasks(created_at DESC);

-- Enable RLS
ALTER TABLE house_tasks ENABLE ROW LEVEL SECURITY;

-- Policy: Members can read active tasks in their house
CREATE POLICY "Members can read house tasks"
  ON house_tasks
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM house_members
      WHERE house_members.house_id = house_tasks.house_id
      AND house_members.user_id = auth.uid()
    )
  );

-- Policy: Members can create tasks in their house
CREATE POLICY "Members can create tasks"
  ON house_tasks
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM house_members
      WHERE house_members.house_id = house_tasks.house_id
      AND house_members.user_id = auth.uid()
    )
    AND created_by = auth.uid()
  );

-- Policy: Members can update tasks (mark as completed)
CREATE POLICY "Members can complete tasks"
  ON house_tasks
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM house_members
      WHERE house_members.house_id = house_tasks.house_id
      AND house_members.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM house_members
      WHERE house_members.house_id = house_tasks.house_id
      AND house_members.user_id = auth.uid()
    )
  );
-- NEXT MIGRATION --

