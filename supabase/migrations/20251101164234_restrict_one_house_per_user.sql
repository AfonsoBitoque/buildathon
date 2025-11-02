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