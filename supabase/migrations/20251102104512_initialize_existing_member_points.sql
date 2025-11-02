/*
  # Initialize Points for Existing Members

  ## Description
  This migration creates point records for all existing house members
  who don't have point records yet.

  ## Changes
  1. Insert member_points records for existing members
  2. Initialize all point values to 0
  3. Recalculate points based on existing completed tasks and paid expenses

  ## Important Notes
  - Only creates records for members without points
  - Does not duplicate existing records
  - Safe to run multiple times (uses INSERT ... ON CONFLICT DO NOTHING)
*/

-- Initialize points for all existing house members
INSERT INTO member_points (house_id, user_id, points, fixed_expense_points, variable_expense_points, shared_debt_points, task_points)
SELECT 
  hm.house_id,
  hm.user_id,
  0 as points,
  0 as fixed_expense_points,
  0 as variable_expense_points,
  0 as shared_debt_points,
  0 as task_points
FROM house_members hm
WHERE NOT EXISTS (
  SELECT 1 FROM member_points mp 
  WHERE mp.house_id = hm.house_id 
  AND mp.user_id = hm.user_id
)
ON CONFLICT (house_id, user_id) DO NOTHING;

-- Recalculate task points for existing completed tasks
UPDATE member_points mp
SET 
  task_points = task_points + (counted_tasks * 5),
  points = points + (counted_tasks * 5)
FROM (
  SELECT 
    house_id,
    created_by as user_id,
    COUNT(*) as counted_tasks
  FROM house_tasks
  WHERE is_completed = true
  GROUP BY house_id, created_by
) t
WHERE mp.house_id = t.house_id AND mp.user_id = t.user_id;

-- Recalculate fixed expense points
UPDATE member_points mp
SET 
  fixed_expense_points = fixed_expense_points + counted_payments,
  points = points + counted_payments
FROM (
  SELECT 
    he.house_id,
    hep.member_id as user_id,
    COUNT(*) as counted_payments
  FROM house_expense_payments hep
  JOIN house_expenses he ON hep.house_expense_id = he.id
  WHERE hep.is_paid = true
  GROUP BY he.house_id, hep.member_id
) p
WHERE mp.house_id = p.house_id AND mp.user_id = p.user_id;

-- Recalculate shared debt points
UPDATE member_points mp
SET 
  shared_debt_points = shared_debt_points + (counted_debts * 3),
  points = points + (counted_debts * 3)
FROM (
  SELECT 
    se.house_id,
    ep.debtor_id as user_id,
    COUNT(*) as counted_debts
  FROM expense_payments ep
  JOIN shared_expenses se ON ep.shared_expense_id = se.id
  WHERE ep.is_paid = true
  GROUP BY se.house_id, ep.debtor_id
) d
WHERE mp.house_id = d.house_id AND mp.user_id = d.user_id;