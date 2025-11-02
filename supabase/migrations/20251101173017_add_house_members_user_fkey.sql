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