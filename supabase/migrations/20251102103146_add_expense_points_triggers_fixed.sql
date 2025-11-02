/*
  # Add Expense Points Triggers (Fixed)

  ## Description
  This migration adds triggers to award points for expense payments:
  - Fixed expenses (house_expense_payments): 1 point per payment
  - Variable expenses (expense_payments for shared_expenses): 3 points per payment

  ## Changes
  1. Create trigger for house_expense_payments (fixed expenses - 1 point)
  2. Create trigger for expense_payments (shared debts - 3 points)
  3. Fix task trigger to use correct column names

  ## Important Notes
  - Points awarded only when is_paid changes from false to true
  - Each payment awards points to the payer
  - Tasks award points to created_by user
*/

-- Drop existing incorrect trigger
DROP TRIGGER IF EXISTS award_points_on_task_complete ON house_tasks;

-- Function to award task completion points (corrected)
CREATE OR REPLACE FUNCTION award_task_points()
RETURNS TRIGGER AS $$
BEGIN
  IF (NEW.is_completed = true AND (OLD.is_completed IS NULL OR OLD.is_completed = false)) THEN
    UPDATE member_points
    SET 
      task_points = task_points + 5,
      points = points + 5
    WHERE house_id = NEW.house_id AND user_id = NEW.created_by;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for task completion points (corrected)
CREATE TRIGGER award_points_on_task_complete
  AFTER UPDATE ON house_tasks
  FOR EACH ROW
  EXECUTE FUNCTION award_task_points();

-- Function to award fixed expense points (1 point) - house_expense_payments
CREATE OR REPLACE FUNCTION award_fixed_expense_points()
RETURNS TRIGGER AS $$
BEGIN
  IF (NEW.is_paid = true AND (OLD.is_paid IS NULL OR OLD.is_paid = false)) THEN
    UPDATE member_points
    SET 
      fixed_expense_points = fixed_expense_points + 1,
      points = points + 1
    WHERE house_id = (
      SELECT house_id FROM house_expenses WHERE id = NEW.house_expense_id
    ) AND user_id = NEW.member_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for fixed expense payments
DROP TRIGGER IF EXISTS award_points_on_fixed_expense_paid ON house_expense_payments;
CREATE TRIGGER award_points_on_fixed_expense_paid
  AFTER UPDATE ON house_expense_payments
  FOR EACH ROW
  EXECUTE FUNCTION award_fixed_expense_points();

-- Function to award shared debt points (3 points) - expense_payments
CREATE OR REPLACE FUNCTION award_shared_debt_points()
RETURNS TRIGGER AS $$
BEGIN
  IF (NEW.is_paid = true AND (OLD.is_paid IS NULL OR OLD.is_paid = false)) THEN
    UPDATE member_points
    SET 
      shared_debt_points = shared_debt_points + 3,
      points = points + 3
    WHERE house_id = (
      SELECT house_id FROM shared_expenses WHERE id = NEW.shared_expense_id
    ) AND user_id = NEW.debtor_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for shared debt payments
DROP TRIGGER IF EXISTS award_points_on_shared_debt_paid ON expense_payments;
CREATE TRIGGER award_points_on_shared_debt_paid
  AFTER UPDATE ON expense_payments
  FOR EACH ROW
  EXECUTE FUNCTION award_shared_debt_points();