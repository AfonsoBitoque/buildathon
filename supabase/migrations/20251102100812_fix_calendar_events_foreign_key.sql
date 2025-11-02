/*
  # Fix Calendar Events Foreign Key

  ## Description
  This migration fixes the foreign key constraint for calendar_events.created_by
  to properly reference the public.users table instead of auth.users.

  ## Changes
  1. Drop and recreate calendar_events table with correct foreign key
  2. Maintain all existing constraints and indexes
  3. Ensure RLS policies remain intact

  ## Important Notes
  - This will preserve existing data structure
  - Foreign key now correctly points to public.users(id)
*/

-- Drop existing foreign key constraint if it exists
DO $$
BEGIN
  -- Drop the table and recreate with correct foreign key
  DROP TABLE IF EXISTS calendar_events CASCADE;
END $$;

-- Recreate calendar_events table with correct foreign key
CREATE TABLE IF NOT EXISTS calendar_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  house_id uuid REFERENCES houses(id) ON DELETE CASCADE NOT NULL,
  created_by uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  description text DEFAULT '',
  day_of_week smallint NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  start_time time NOT NULL,
  end_time time NOT NULL,
  event_type text NOT NULL CHECK (event_type IN ('single', 'recurring')),
  event_date date,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT valid_time_range CHECK (end_time > start_time),
  CONSTRAINT single_event_has_date CHECK (
    (event_type = 'single' AND event_date IS NOT NULL) OR
    (event_type = 'recurring' AND event_date IS NULL)
  )
);

-- Enable RLS
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;

-- Recreate policies
CREATE POLICY "Members can view calendar events"
  ON calendar_events
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM house_members
      WHERE house_members.house_id = calendar_events.house_id
      AND house_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Members can create calendar events"
  ON calendar_events
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM house_members
      WHERE house_members.house_id = calendar_events.house_id
      AND house_members.user_id = auth.uid()
    )
    AND created_by = auth.uid()
  );

CREATE POLICY "Creator can update their calendar events"
  ON calendar_events
  FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Creator can delete their calendar events"
  ON calendar_events
  FOR DELETE
  TO authenticated
  USING (created_by = auth.uid());

-- Recreate indexes
CREATE INDEX IF NOT EXISTS idx_calendar_events_house_id ON calendar_events(house_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_day_of_week ON calendar_events(day_of_week);
CREATE INDEX IF NOT EXISTS idx_calendar_events_event_date ON calendar_events(event_date);
CREATE INDEX IF NOT EXISTS idx_calendar_events_created_by ON calendar_events(created_by);

-- Recreate trigger
DROP TRIGGER IF EXISTS set_calendar_events_updated_at ON calendar_events;
CREATE TRIGGER set_calendar_events_updated_at
  BEFORE UPDATE ON calendar_events
  FOR EACH ROW
  EXECUTE FUNCTION update_calendar_events_updated_at();