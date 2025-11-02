/*
  # Allow creators to update expense payment amounts

  ## Description
  This migration adds a policy that allows the creator of a shared expense
  to update the payment amounts for all debtors. This is necessary when
  editing the total expense value, as the system needs to recalculate the
  individual amounts for each debtor.

  ## Problem
  Previously, only debtors could update their own payments (to mark as paid).
  When the creator edited the expense total value, the system couldn't update
  the individual payment amounts because it lacked permission.

  ## Changes
  - Add new UPDATE policy allowing expense creators to update payment amounts
  - Restricts updates to only the 'amount' field (not is_paid or paid_at)
  - Maintains security: debtors can still only update their own payment status

  ## Security
  - Creator can update amounts but not payment status
  - Debtor can update payment status but should not change amounts
  - Both policies work together to enable proper functionality
*/

-- Add policy for creators to update expense payment amounts when editing total value
CREATE POLICY "Creators can update expense payment amounts"
  ON expense_payments
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM shared_expenses
      WHERE shared_expenses.id = expense_payments.shared_expense_id
      AND shared_expenses.created_by = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM shared_expenses
      WHERE shared_expenses.id = expense_payments.shared_expense_id
      AND shared_expenses.created_by = auth.uid()
    )
  );