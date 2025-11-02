/*
  # Fix Points System Values

  ## Description
  This migration updates the points system to award correct point values:
  - Fixed expenses (expense_type = 'fixed'): 1 point per payment
  - Variable expenses (expense_type = 'variable'): 2 points per payment
  - Shared expenses: 3 points per payment
  - Tasks completed: 5 points per task

  ## Changes
  1. Drop and recreate all points triggers with correct values
  2. Update function for house_expenses to differentiate between fixed and variable
  3. Keep task points at 5
  4. Update shared expense points to use correct table name

  ## Important Notes
  - Points only awarded when payment status changes to paid
  - member_points table already has breakdown columns
*/

-- Drop existing triggers
DROP TRIGGER IF EXISTS award_points_on_task_complete ON house_tasks;
DROP TRIGGER IF EXISTS award_points_on_fixed_expense_paid ON house_expense_payments;
DROP TRIGGER IF EXISTS award_points_on_shared_debt_paid ON shared_expense_payments;
DROP TRIGGER IF EXISTS award_points_on_house_expense_paid ON house_expenses;

-- Function to award task completion points (5 points)
CREATE OR REPLACE FUNCTION award_task_points()
RETURNS TRIGGER AS $$
BEGIN
  IF (NEW.is_completed = true AND (OLD.is_completed IS NULL OR OLD.is_completed = false)) THEN
    INSERT INTO member_points (house_id, user_id, points, task_points)
    VALUES (NEW.house_id, NEW.created_by, 5, 5)
    ON CONFLICT (house_id, user_id) 
    DO UPDATE SET 
      task_points = member_points.task_points + 5,
      points = member_points.points + 5;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for task completion points
CREATE TRIGGER award_points_on_task_complete
  AFTER UPDATE ON house_tasks
  FOR EACH ROW
  EXECUTE FUNCTION award_task_points();

-- Function to award house expense points (1 for fixed, 2 for variable)
CREATE OR REPLACE FUNCTION award_house_expense_points()
RETURNS TRIGGER AS $$
DECLARE
  points_to_award integer;
BEGIN
  IF (NEW.is_paid = true AND (OLD.is_paid IS NULL OR OLD.is_paid = false) AND NEW.paid_by IS NOT NULL) THEN
    -- Determine points based on expense type
    IF NEW.expense_type = 'fixed' THEN
      INSERT INTO member_points (house_id, user_id, points, fixed_expense_points)
      VALUES (NEW.house_id, NEW.paid_by, 1, 1)
      ON CONFLICT (house_id, user_id) 
      DO UPDATE SET 
        fixed_expense_points = member_points.fixed_expense_points + 1,
        points = member_points.points + 1;
        
    ELSIF NEW.expense_type = 'variable' THEN
      INSERT INTO member_points (house_id, user_id, points, variable_expense_points)
      VALUES (NEW.house_id, NEW.paid_by, 2, 2)
      ON CONFLICT (house_id, user_id) 
      DO UPDATE SET 
        variable_expense_points = member_points.variable_expense_points + 2,
        points = member_points.points + 2;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for house expense payments
CREATE TRIGGER award_points_on_house_expense_paid
  AFTER UPDATE ON house_expenses
  FOR EACH ROW
  EXECUTE FUNCTION award_house_expense_points();

-- Function to award shared expense points (3 points)
CREATE OR REPLACE FUNCTION award_shared_expense_points()
RETURNS TRIGGER AS $$
BEGIN
  IF (NEW.is_paid = true AND (OLD.is_paid IS NULL OR OLD.is_paid = false)) THEN
    INSERT INTO member_points (house_id, user_id, points, shared_debt_points)
    VALUES (
      (SELECT house_id FROM shared_expenses WHERE id = NEW.expense_id),
      NEW.user_id,
      3,
      3
    )
    ON CONFLICT (house_id, user_id) 
    DO UPDATE SET 
      shared_debt_points = member_points.shared_debt_points + 3,
      points = member_points.points + 3;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for shared expense payments
CREATE TRIGGER award_points_on_shared_expense_paid
  AFTER UPDATE ON shared_expense_payments
  FOR EACH ROW
  EXECUTE FUNCTION award_shared_expense_points();