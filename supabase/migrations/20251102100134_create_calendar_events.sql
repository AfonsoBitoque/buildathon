/*
  # Create Calendar Events Module

  ## Description
  This migration creates the calendar_events table to store shared calendar activities
  for house members. Supports both single and recurring weekly events with conflict
  detection capabilities.

  ## New Tables
  - `calendar_events`
    - `id` (uuid, primary key) - Unique identifier for the event
    - `house_id` (uuid, foreign key) - References houses table
    - `created_by` (uuid, foreign key) - References auth.users (event creator)
    - `title` (text) - Name of the activity (required)
    - `description` (text) - Optional details about the event
    - `day_of_week` (smallint) - Day of week (0=Sunday, 6=Saturday)
    - `start_time` (time) - Start time of the event
    - `end_time` (time) - End time of the event
    - `event_type` (text) - Type: 'single' or 'recurring'
    - `event_date` (date) - Specific date for single events (null for recurring)
    - `created_at` (timestamptz) - Timestamp of creation
    - `updated_at` (timestamptz) - Timestamp of last update

  ## Security
  - Enable RLS on calendar_events table
  - SELECT policy: All house members can view all events
  - INSERT policy: All house members can create events
  - UPDATE policy: Only event creator can update their events
  - DELETE policy: Only event creator can delete their events

  ## Important Notes
  1. day_of_week: 0=Sunday, 1=Monday, ..., 6=Saturday
  2. Single events have event_date set, recurring events have it null
  3. Times are stored in TIME format (HH:MM:SS)
  4. Conflict detection must be handled in application logic
*/

-- Create calendar_events table
CREATE TABLE IF NOT EXISTS calendar_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  house_id uuid REFERENCES houses(id) ON DELETE CASCADE NOT NULL,
  created_by uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
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

-- Policy: All house members can view events
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

-- Policy: All house members can create events
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

-- Policy: Only event creator can update their events
CREATE POLICY "Creator can update their calendar events"
  ON calendar_events
  FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

-- Policy: Only event creator can delete their events
CREATE POLICY "Creator can delete their calendar events"
  ON calendar_events
  FOR DELETE
  TO authenticated
  USING (created_by = auth.uid());

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_calendar_events_house_id ON calendar_events(house_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_day_of_week ON calendar_events(day_of_week);
CREATE INDEX IF NOT EXISTS idx_calendar_events_event_date ON calendar_events(event_date);
CREATE INDEX IF NOT EXISTS idx_calendar_events_created_by ON calendar_events(created_by);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_calendar_events_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to call the function
DROP TRIGGER IF EXISTS set_calendar_events_updated_at ON calendar_events;
CREATE TRIGGER set_calendar_events_updated_at
  BEFORE UPDATE ON calendar_events
  FOR EACH ROW
  EXECUTE FUNCTION update_calendar_events_updated_at();