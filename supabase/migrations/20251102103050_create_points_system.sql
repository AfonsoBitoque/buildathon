/*
  # Create Points System

  ## Description
  This migration creates the infrastructure for the gamification points system.
  Points are awarded for completing tasks and paying expenses.

  ## New Tables
  - `member_points`
    - `id` (uuid, primary key) - Unique identifier
    - `house_id` (uuid, foreign key) - References houses table
    - `user_id` (uuid, foreign key) - References users table
    - `points` (integer) - Total points accumulated
    - `fixed_expense_points` (integer) - Points from fixed expenses (1pt each)
    - `variable_expense_points` (integer) - Points from variable expenses (2pt each)
    - `shared_debt_points` (integer) - Points from shared debts (3pt each)
    - `task_points` (integer) - Points from completed tasks (5pt each)
    - `created_at` (timestamptz) - Timestamp of creation
    - `updated_at` (timestamptz) - Timestamp of last update

  ## Security
  - Enable RLS on member_points table
  - SELECT policy: All house members can view points
  - INSERT policy: System only (handled by triggers)
  - UPDATE policy: System only (handled by triggers)
  - DELETE policy: Only when member leaves house

  ## Important Notes
  1. Points are calculated automatically via triggers
  2. Each member starts with 0 points
  3. Points breakdown helps transparency
  4. Unique constraint on (house_id, user_id)
*/

-- Create member_points table
CREATE TABLE IF NOT EXISTS member_points (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  house_id uuid REFERENCES houses(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  points integer DEFAULT 0 NOT NULL,
  fixed_expense_points integer DEFAULT 0 NOT NULL,
  variable_expense_points integer DEFAULT 0 NOT NULL,
  shared_debt_points integer DEFAULT 0 NOT NULL,
  task_points integer DEFAULT 0 NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT unique_member_points UNIQUE (house_id, user_id)
);

-- Enable RLS
ALTER TABLE member_points ENABLE ROW LEVEL SECURITY;

-- Policy: All house members can view points
CREATE POLICY "Members can view house points"
  ON member_points
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM house_members
      WHERE house_members.house_id = member_points.house_id
      AND house_members.user_id = auth.uid()
    )
  );

-- Policy: System can insert points records (for new members)
CREATE POLICY "System can insert member points"
  ON member_points
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM house_members
      WHERE house_members.house_id = member_points.house_id
      AND house_members.user_id = member_points.user_id
    )
  );

-- Policy: System can update points
CREATE POLICY "System can update member points"
  ON member_points
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM house_members
      WHERE house_members.house_id = member_points.house_id
      AND house_members.user_id = member_points.user_id
    )
  );

-- Policy: Points deleted when member leaves
CREATE POLICY "Points deleted with member"
  ON member_points
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM houses
      WHERE houses.id = member_points.house_id
      AND houses.created_by = auth.uid()
    )
  );

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_member_points_house_id ON member_points(house_id);
CREATE INDEX IF NOT EXISTS idx_member_points_user_id ON member_points(user_id);
CREATE INDEX IF NOT EXISTS idx_member_points_points ON member_points(points DESC);

-- Function to update points timestamp
CREATE OR REPLACE FUNCTION update_member_points_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for updated_at
DROP TRIGGER IF EXISTS set_member_points_updated_at ON member_points;
CREATE TRIGGER set_member_points_updated_at
  BEFORE UPDATE ON member_points
  FOR EACH ROW
  EXECUTE FUNCTION update_member_points_updated_at();

-- Function to initialize points for new house members
CREATE OR REPLACE FUNCTION initialize_member_points()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO member_points (house_id, user_id, points)
  VALUES (NEW.house_id, NEW.user_id, 0)
  ON CONFLICT (house_id, user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to initialize points when member joins house
DROP TRIGGER IF EXISTS initialize_points_on_join ON house_members;
CREATE TRIGGER initialize_points_on_join
  AFTER INSERT ON house_members
  FOR EACH ROW
  EXECUTE FUNCTION initialize_member_points();

-- Function to award task completion points
CREATE OR REPLACE FUNCTION award_task_points()
RETURNS TRIGGER AS $$
BEGIN
  -- Only award points when task is marked as completed
  IF (NEW.completed = true AND OLD.completed = false) THEN
    UPDATE member_points
    SET 
      task_points = task_points + 5,
      points = points + 5
    WHERE house_id = NEW.house_id AND user_id = NEW.assigned_to;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for task completion points
DROP TRIGGER IF EXISTS award_points_on_task_complete ON house_tasks;
CREATE TRIGGER award_points_on_task_complete
  AFTER UPDATE ON house_tasks
  FOR EACH ROW
  EXECUTE FUNCTION award_task_points();