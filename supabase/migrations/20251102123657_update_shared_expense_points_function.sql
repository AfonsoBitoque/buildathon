/*
  # Update Shared Expense Points Function

  ## Description
  This migration updates the shared expense points function to include
  updated_at timestamp for consistency with other point-awarding functions.

  ## Changes
  1. Add updated_at = now() to the UPDATE clause
  2. Ensures all point records have consistent timestamp updates

  ## Important Notes
  - Points remain at 3 per shared expense payment
  - No changes to trigger or point values
*/

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
      points = member_points.points + 3,
      updated_at = now();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;