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