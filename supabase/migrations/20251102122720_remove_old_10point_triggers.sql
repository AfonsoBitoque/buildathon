/*
  # Remove Old 10-Point Triggers

  ## Description
  This migration removes old triggers and functions that incorrectly award 10 points
  for all expense payments, keeping only the correct triggers that award:
  - 1 point for fixed expenses
  - 2 points for variable expenses
  - 3 points for shared expenses
  - 5 points for tasks

  ## Changes
  1. Drop old triggers from house_expense_payments table
  2. Drop old triggers from shared_expense_payments table (duplicates)
  3. Drop old functions that award 10 points
  4. Keep only the correct award_house_expense_points and award_shared_expense_points

  ## Important Notes
  - This fixes the bug where users receive 10 points instead of 1/2/3
  - Only the correct point-awarding system remains active
*/

-- Drop old triggers
DROP TRIGGER IF EXISTS house_expense_points_trigger ON house_expense_payments;
DROP TRIGGER IF EXISTS shared_expense_points_trigger ON shared_expense_payments;

-- Drop old functions that give 10 points
DROP FUNCTION IF EXISTS award_points_for_house_expense();
DROP FUNCTION IF EXISTS award_points_for_shared_expense();

-- Verify correct triggers remain:
-- award_points_on_house_expense_paid (on house_expenses) - awards 1pt for fixed, 2pt for variable
-- award_points_on_shared_expense_paid (on shared_expense_payments) - awards 3pt
-- award_points_on_task_complete (on house_tasks) - awards 5pt