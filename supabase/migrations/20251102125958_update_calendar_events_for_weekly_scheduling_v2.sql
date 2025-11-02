/*
  # Update Calendar Events for Weekly Scheduling v2

  ## Description
  This migration updates the calendar_events table to support the new requirements:
  - Single events (occur once)
  - Weekly recurring events (repeat every week on the same day and time)
  - Start and end times for blocking time periods
  - Day of week for recurring events

  ## Changes
  1. Add columns for weekly recurring events
    - `is_recurring` (boolean) - Whether the event repeats weekly
    - `day_of_week` (integer) - Day of week (0=Sunday, 6=Saturday) for recurring events
    - `start_time` (time) - Start time of the activity
    - `end_time` (time) - End time of the activity

  2. Migrate existing data properly
    - Set `is_recurring` to false for all existing events
    - Copy `event_time` to `start_time` for existing events
    - Calculate `end_time` as start_time + 1 hour
    - Keep event_date for single events

  ## Important Notes
  - Single events: Set `is_recurring = false`, provide `event_date`
  - Recurring events: Set `is_recurring = true`, provide `day_of_week` (not event_date)
  - `start_time` is required for time blocking
  - `end_time` is required for conflict detection
*/

-- Add new columns with nullable constraints first
ALTER TABLE calendar_events
ADD COLUMN IF NOT EXISTS is_recurring boolean DEFAULT false NOT NULL,
ADD COLUMN IF NOT EXISTS day_of_week integer,
ADD COLUMN IF NOT EXISTS start_time time,
ADD COLUMN IF NOT EXISTS end_time time;

-- Migrate existing data
UPDATE calendar_events
SET 
  is_recurring = false,
  start_time = COALESCE(event_time, '09:00:00'),
  end_time = (COALESCE(event_time, '09:00:00')::time + INTERVAL '1 hour')::time
WHERE start_time IS NULL;

-- Now make start_time and end_time NOT NULL
ALTER TABLE calendar_events 
ALTER COLUMN start_time SET NOT NULL,
ALTER COLUMN end_time SET NOT NULL;

-- Add check constraint: end_time must be after start_time
ALTER TABLE calendar_events
DROP CONSTRAINT IF EXISTS calendar_events_time_order_check;

ALTER TABLE calendar_events
ADD CONSTRAINT calendar_events_time_order_check CHECK (end_time > start_time);

-- Add check constraint for day_of_week range when used
ALTER TABLE calendar_events
DROP CONSTRAINT IF EXISTS calendar_events_day_of_week_check;

ALTER TABLE calendar_events
ADD CONSTRAINT calendar_events_day_of_week_check CHECK (
  day_of_week IS NULL OR (day_of_week >= 0 AND day_of_week <= 6)
);

-- Make event_date nullable (recurring events won't have a date)
ALTER TABLE calendar_events ALTER COLUMN event_date DROP NOT NULL;

-- Create index for conflict detection
CREATE INDEX IF NOT EXISTS idx_calendar_events_single_conflicts 
ON calendar_events (house_id, event_date, start_time, end_time) 
WHERE is_recurring = false;

CREATE INDEX IF NOT EXISTS idx_calendar_events_recurring_conflicts 
ON calendar_events (house_id, day_of_week, start_time, end_time) 
WHERE is_recurring = true;

-- Add function to check for conflicts
CREATE OR REPLACE FUNCTION check_calendar_event_conflict(
  p_house_id uuid,
  p_is_recurring boolean,
  p_event_date date,
  p_day_of_week integer,
  p_start_time time,
  p_end_time time,
  p_exclude_event_id uuid DEFAULT NULL
)
RETURNS boolean AS $$
DECLARE
  conflict_exists boolean;
BEGIN
  IF p_is_recurring THEN
    -- Check for conflicts with other recurring events on the same day
    SELECT EXISTS(
      SELECT 1 FROM calendar_events
      WHERE house_id = p_house_id
        AND is_recurring = true
        AND day_of_week = p_day_of_week
        AND (p_exclude_event_id IS NULL OR id != p_exclude_event_id)
        AND (
          (p_start_time >= start_time AND p_start_time < end_time) OR
          (p_end_time > start_time AND p_end_time <= end_time) OR
          (p_start_time <= start_time AND p_end_time >= end_time)
        )
    ) INTO conflict_exists;
  ELSE
    -- Check for conflicts with single events on the same date
    SELECT EXISTS(
      SELECT 1 FROM calendar_events
      WHERE house_id = p_house_id
        AND is_recurring = false
        AND event_date = p_event_date
        AND (p_exclude_event_id IS NULL OR id != p_exclude_event_id)
        AND (
          (p_start_time >= start_time AND p_start_time < end_time) OR
          (p_end_time > start_time AND p_end_time <= end_time) OR
          (p_start_time <= start_time AND p_end_time >= end_time)
        )
    ) INTO conflict_exists;
    
    -- Also check for conflicts with recurring events on the same day of week
    IF NOT conflict_exists THEN
      SELECT EXISTS(
        SELECT 1 FROM calendar_events
        WHERE house_id = p_house_id
          AND is_recurring = true
          AND day_of_week = EXTRACT(DOW FROM p_event_date)::integer
          AND (
            (p_start_time >= start_time AND p_start_time < end_time) OR
            (p_end_time > start_time AND p_end_time <= end_time) OR
            (p_start_time <= start_time AND p_end_time >= end_time)
          )
      ) INTO conflict_exists;
    END IF;
  END IF;
  
  RETURN conflict_exists;
END;
$$ LANGUAGE plpgsql;