/*
  # Fix Floating Expense Type Check

  ## Description
  This migration fixes the point attribution for floating expenses by correcting
  the expense_type check from 'variable' to 'floating'.

  ## Problem
  - Database stores expense_type as 'floating'
  - Function was checking for 'variable'
  - Result: Floating expenses awarded 0 points instead of 2 points

  ## Solution
  1. Update award_house_expense_payment_points function
  2. Change ELSIF condition from 'variable' to 'floating'
  3. Keep all other logic intact

  ## Important Notes
  - Fixed expenses: 1 point (working correctly)
  - Floating expenses: 2 points (NOW FIXED)
  - Shared expenses: 3 points (working correctly)
  - Tasks: 5 points (working correctly)
*/

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
        
    ELSIF expense_type_val = 'floating' THEN
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