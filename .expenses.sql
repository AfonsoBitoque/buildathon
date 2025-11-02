/*
  # Create Expenses Management Tables

  ## Description
  This migration creates tables for managing house expenses and shared expenses.

  ## 1. New Tables

  ### `house_expenses`
  Stores general house expenses (bills, rent, etc.) that need to be paid by the house.
  - `id` (uuid, primary key)
  - `house_id` (uuid, foreign key to houses)
  - `created_by` (uuid, foreign key to auth.users)
  - `title` (text) - Name of the expense
  - `amount` (decimal) - Total amount to pay
  - `due_date` (date) - Payment deadline
  - `is_paid` (boolean) - Payment status
  - `paid_at` (timestamptz) - When it was paid
  - `paid_by` (uuid, foreign key to auth.users) - Who marked it as paid
  - `recurrence_days` (integer, nullable) - Auto-recurrence interval in days (null = no recurrence)
  - `created_at` (timestamptz)

  ### `shared_expenses`
  Stores expenses paid by one member that need to be split among all house members.
  - `id` (uuid, primary key)
  - `house_id` (uuid, foreign key to houses)
  - `created_by` (uuid, foreign key to auth.users) - The creditor (who paid)
  - `title` (text) - Name of the purchase
  - `total_amount` (decimal) - Total amount paid
  - `created_at` (timestamptz)

  ### `expense_payments`
  Tracks individual payments for shared expenses (one record per debtor per expense).
  - `id` (uuid, primary key)
  - `shared_expense_id` (uuid, foreign key to shared_expenses)
  - `debtor_id` (uuid, foreign key to auth.users) - Who owes the money
  - `amount` (decimal) - Amount this debtor owes
  - `is_paid` (boolean) - Payment status
  - `paid_at` (timestamptz) - When the debtor marked it as paid
  - `created_at` (timestamptz)

  ## 2. Security
  - Enable RLS on all tables
  - Add policies for house members to manage expenses
  
  ## 3. Important Notes
  - House expenses support optional auto-recurrence
  - Shared expenses are automatically divided among all members except the creator
  - Each debtor has their own payment record in expense_payments
*/

-- Create house_expenses table
CREATE TABLE IF NOT EXISTS house_expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  house_id uuid NOT NULL REFERENCES houses(id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  amount decimal(10, 2) NOT NULL CHECK (amount > 0),
  due_date date NOT NULL,
  is_paid boolean NOT NULL DEFAULT false,
  paid_at timestamptz,
  paid_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  recurrence_days integer CHECK (recurrence_days IS NULL OR recurrence_days > 0),
  created_at timestamptz DEFAULT now()
);

-- Create shared_expenses table
CREATE TABLE IF NOT EXISTS shared_expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  house_id uuid NOT NULL REFERENCES houses(id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  total_amount decimal(10, 2) NOT NULL CHECK (total_amount > 0),
  created_at timestamptz DEFAULT now()
);

-- Create expense_payments table
CREATE TABLE IF NOT EXISTS expense_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shared_expense_id uuid NOT NULL REFERENCES shared_expenses(id) ON DELETE CASCADE,
  debtor_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount decimal(10, 2) NOT NULL CHECK (amount > 0),
  is_paid boolean NOT NULL DEFAULT false,
  paid_at timestamptz,
  created_at timestamptz DEFAULT now(),
  UNIQUE(shared_expense_id, debtor_id)
);

-- Enable RLS
ALTER TABLE house_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE shared_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_payments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for house_expenses

CREATE POLICY "Members can view house expenses"
  ON house_expenses
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM house_members
      WHERE house_members.house_id = house_expenses.house_id
      AND house_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Members can create house expenses"
  ON house_expenses
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM house_members
      WHERE house_members.house_id = house_expenses.house_id
      AND house_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Members can update house expenses"
  ON house_expenses
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM house_members
      WHERE house_members.house_id = house_expenses.house_id
      AND house_members.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM house_members
      WHERE house_members.house_id = house_expenses.house_id
      AND house_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Members can delete house expenses"
  ON house_expenses
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM house_members
      WHERE house_members.house_id = house_expenses.house_id
      AND house_members.user_id = auth.uid()
    )
  );

-- RLS Policies for shared_expenses

CREATE POLICY "Members can view shared expenses"
  ON shared_expenses
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM house_members
      WHERE house_members.house_id = shared_expenses.house_id
      AND house_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Members can create shared expenses"
  ON shared_expenses
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM house_members
      WHERE house_members.house_id = shared_expenses.house_id
      AND house_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Members can delete shared expenses"
  ON shared_expenses
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM house_members
      WHERE house_members.house_id = shared_expenses.house_id
      AND house_members.user_id = auth.uid()
    )
  );

-- RLS Policies for expense_payments

CREATE POLICY "Members can view expense payments"
  ON expense_payments
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM shared_expenses
      JOIN house_members ON house_members.house_id = shared_expenses.house_id
      WHERE shared_expenses.id = expense_payments.shared_expense_id
      AND house_members.user_id = auth.uid()
    )
  );

CREATE POLICY "System can create expense payments"
  ON expense_payments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM shared_expenses
      JOIN house_members ON house_members.house_id = shared_expenses.house_id
      WHERE shared_expenses.id = expense_payments.shared_expense_id
      AND house_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Debtors can update their payments"
  ON expense_payments
  FOR UPDATE
  TO authenticated
  USING (debtor_id = auth.uid())
  WITH CHECK (debtor_id = auth.uid());

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_house_expenses_house_id ON house_expenses(house_id);
CREATE INDEX IF NOT EXISTS idx_house_expenses_is_paid ON house_expenses(is_paid);
CREATE INDEX IF NOT EXISTS idx_shared_expenses_house_id ON shared_expenses(house_id);
CREATE INDEX IF NOT EXISTS idx_expense_payments_shared_expense_id ON expense_payments(shared_expense_id);
CREATE INDEX IF NOT EXISTS idx_expense_payments_debtor_id ON expense_payments(debtor_id);
CREATE INDEX IF NOT EXISTS idx_expense_payments_is_paid ON expense_payments(is_paid);/*
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