/*
  # Allow creators to update house expense payment amounts

  ## Description
  This migration adds a policy that allows the creator of a house expense
  (both fixed and floating types) to update the payment amounts for all members.
  This is necessary when editing the total expense value, as the system needs
  to recalculate the individual amounts for each member.

  ## Problem
  Previously, only members could update their own payments (to mark as paid).
  When the creator edited the expense total value, the system couldn't update
  the individual payment amounts because it lacked permission.

  ## Changes
  - Add new UPDATE policy allowing expense creators to update payment amounts
  - Works for both fixed and floating expense types
  - Maintains security: members can still only update their own payment status

  ## Security
  - Creator can update amounts when editing the expense
  - Members can update their payment status (is_paid, paid_at)
  - Both policies work together to enable proper functionality
*/

-- Add policy for creators to update house expense payment amounts when editing total value
CREATE POLICY "Creators can update house expense payment amounts"
  ON house_expense_payments
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM house_expenses
      WHERE house_expenses.id = house_expense_payments.house_expense_id
      AND house_expenses.created_by = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM house_expenses
      WHERE house_expenses.id = house_expense_payments.house_expense_id
      AND house_expenses.created_by = auth.uid()
    )
  );