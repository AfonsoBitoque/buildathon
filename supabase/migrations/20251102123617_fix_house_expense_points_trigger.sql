/*
  # Fix House Expense Points Trigger

  ## Description
  This migration fixes the point attribution for house expenses by creating a trigger
  on the correct table (house_expense_payments) instead of house_expenses.

  ## Problem
  - Frontend updates house_expense_payments.is_paid
  - But trigger was on house_expenses table
  - Result: No points were being awarded

  ## Solution
  1. Drop the old trigger on house_expenses
  2. Create new trigger on house_expense_payments
  3. Update function to get expense_type from the linked house_expense record
  4. Award 1 point for fixed expenses, 2 points for variable expenses

  ## Important Notes
  - Points only awarded when is_paid changes from false to true
  - Points awarded to the user who made the payment (user_id in house_expense_payments)
*/

-- Drop old trigger on wrong table
DROP TRIGGER IF EXISTS award_points_on_house_expense_paid ON house_expenses;

-- Create new function for house_expense_payments table
CREATE OR REPLACE FUNCTION award_house_expense_payment_points()
RETURNS TRIGGER AS $$
DECLARE
  expense_type_val text;
  house_id_val uuid;
  points_to_award integer;
BEGIN
  -- Only award points when payment is marked as paid
  IF (NEW.is_paid = true AND (OLD.is_paid IS NULL OR OLD.is_paid = false)) THEN
    
    -- Get expense_type and house_id from the linked house_expense
    SELECT he.expense_type, he.house_id 
    INTO expense_type_val, house_id_val
    FROM house_expenses he
    WHERE he.id = NEW.expense_id;
    
    -- Determine points based on expense type
    IF expense_type_val = 'fixed' THEN
      points_to_award := 1;
      
      INSERT INTO member_points (house_id, user_id, points, fixed_expense_points)
      VALUES (house_id_val, NEW.user_id, points_to_award, points_to_award)
      ON CONFLICT (house_id, user_id) 
      DO UPDATE SET 
        fixed_expense_points = member_points.fixed_expense_points + points_to_award,
        points = member_points.points + points_to_award,
        updated_at = now();
        
    ELSIF expense_type_val = 'variable' THEN
      points_to_award := 2;
      
      INSERT INTO member_points (house_id, user_id, points, variable_expense_points)
      VALUES (house_id_val, NEW.user_id, points_to_award, points_to_award)
      ON CONFLICT (house_id, user_id) 
      DO UPDATE SET 
        variable_expense_points = member_points.variable_expense_points + points_to_award,
        points = member_points.points + points_to_award,
        updated_at = now();
    END IF;
    
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on the correct table
CREATE TRIGGER award_points_on_house_expense_payment_paid
  AFTER UPDATE ON house_expense_payments
  FOR EACH ROW
  EXECUTE FUNCTION award_house_expense_payment_points();

-- Keep the old function for backward compatibility but it won't be triggered
-- (in case there's direct updates to house_expenses table somewhere)