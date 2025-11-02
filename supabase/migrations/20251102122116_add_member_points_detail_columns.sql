/*
  # Add Detail Columns to Member Points

  ## Description
  This migration adds the missing detail columns to the member_points table
  to track points breakdown by category.

  ## Changes
  1. Add fixed_expense_points column (tracks points from fixed expenses - 1pt each)
  2. Add variable_expense_points column (tracks points from variable expenses - 2pt each)
  3. Add shared_debt_points column (tracks points from shared debt payments - 3pt each)
  4. Add task_points column (tracks points from completed tasks - 5pt each)
  5. Add created_at column for record creation timestamp
  6. Add id column as primary key

  ## Important Notes
  - All new columns default to 0
  - Existing points records are preserved
  - These columns enable detailed points tracking and transparency
*/

-- Add missing columns to member_points table
DO $$
BEGIN
  -- Add id column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'member_points' AND column_name = 'id'
  ) THEN
    ALTER TABLE member_points ADD COLUMN id uuid DEFAULT gen_random_uuid();
  END IF;

  -- Add fixed_expense_points column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'member_points' AND column_name = 'fixed_expense_points'
  ) THEN
    ALTER TABLE member_points ADD COLUMN fixed_expense_points integer DEFAULT 0 NOT NULL;
  END IF;

  -- Add variable_expense_points column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'member_points' AND column_name = 'variable_expense_points'
  ) THEN
    ALTER TABLE member_points ADD COLUMN variable_expense_points integer DEFAULT 0 NOT NULL;
  END IF;

  -- Add shared_debt_points column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'member_points' AND column_name = 'shared_debt_points'
  ) THEN
    ALTER TABLE member_points ADD COLUMN shared_debt_points integer DEFAULT 0 NOT NULL;
  END IF;

  -- Add task_points column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'member_points' AND column_name = 'task_points'
  ) THEN
    ALTER TABLE member_points ADD COLUMN task_points integer DEFAULT 0 NOT NULL;
  END IF;

  -- Add created_at column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'member_points' AND column_name = 'created_at'
  ) THEN
    ALTER TABLE member_points ADD COLUMN created_at timestamptz DEFAULT now();
  END IF;
END $$;