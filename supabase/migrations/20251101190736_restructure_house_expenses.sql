/*
  # Restructure House Expenses System

  ## Description
  This migration restructures the house expenses system to support:
  - Fixed vs Floating expense types
  - Individual payment tracking per member
  - Remove due_date requirement

  ## 1. Changes to existing tables

  ### Modify `house_expenses`
  - Add `expense_type` column (fixed or floating)
  - Make `due_date` nullable (not required anymore)
  - Remove old paid tracking fields (will use new payment table)

  ### Create `house_expense_payments`
  - Tracks individual member payments for each expense
  - Each member has their own payment record
  - Supports split payment tracking

  ## 2. Security
  - Update RLS policies for new structure
  - Members can only update their own payments

  ## 3. Important Notes
  - Fixed expenses: constant monthly value (e.g., Rent)
  - Floating expenses: variable monthly value, split equally among members
  - Each member gets a payment record with their share amount
*/

-- Add expense_type column to house_expenses
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'house_expenses' AND column_name = 'expense_type'
  ) THEN
    ALTER TABLE house_expenses ADD COLUMN expense_type text NOT NULL DEFAULT 'floating'
      CHECK (expense_type IN ('fixed', 'floating'));
  END IF;
END $$;

-- Make due_date nullable
ALTER TABLE house_expenses ALTER COLUMN due_date DROP NOT NULL;

-- Create house_expense_payments table
CREATE TABLE IF NOT EXISTS house_expense_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  house_expense_id uuid NOT NULL REFERENCES house_expenses(id) ON DELETE CASCADE,
  member_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount decimal(10, 2) NOT NULL CHECK (amount >= 0),
  is_paid boolean NOT NULL DEFAULT false,
  paid_at timestamptz,
  created_at timestamptz DEFAULT now(),
  UNIQUE(house_expense_id, member_id)
);

-- Enable RLS
ALTER TABLE house_expense_payments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for house_expense_payments

CREATE POLICY "Members can view expense payments in their house"
  ON house_expense_payments
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM house_expenses
      JOIN house_members ON house_members.house_id = house_expenses.house_id
      WHERE house_expenses.id = house_expense_payments.house_expense_id
      AND house_members.user_id = auth.uid()
    )
  );

CREATE POLICY "System can create expense payments"
  ON house_expense_payments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM house_expenses
      JOIN house_members ON house_members.house_id = house_expenses.house_id
      WHERE house_expenses.id = house_expense_payments.house_expense_id
      AND house_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Members can update their own expense payments"
  ON house_expense_payments
  FOR UPDATE
  TO authenticated
  USING (member_id = auth.uid())
  WITH CHECK (member_id = auth.uid());

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_house_expense_payments_house_expense_id ON house_expense_payments(house_expense_id);
CREATE INDEX IF NOT EXISTS idx_house_expense_payments_member_id ON house_expense_payments(member_id);
CREATE INDEX IF NOT EXISTS idx_house_expense_payments_is_paid ON house_expense_payments(is_paid);
CREATE INDEX IF NOT EXISTS idx_house_expenses_expense_type ON house_expenses(expense_type);