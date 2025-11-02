/*
  # Add UPDATE policy for shared_expenses table

  ## Description
  This migration adds the missing UPDATE policy for the shared_expenses table.
  Without this policy, users cannot update shared expenses even if they are members
  of the house.

  ## Changes
  - Add UPDATE policy to allow house members to update shared expenses

  ## Security
  - Only authenticated users who are members of the house can update expenses
  - Members can update any expense in their house (not restricted to creator)
  - This allows flexibility for house management

  ## Note
  If you want to restrict updates to only the creator, change the policy to:
  USING (created_by = auth.uid())
*/

-- Add UPDATE policy for shared_expenses
CREATE POLICY "Members can update shared expenses"
  ON shared_expenses
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM house_members
      WHERE house_members.house_id = shared_expenses.house_id
      AND house_members.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM house_members
      WHERE house_members.house_id = shared_expenses.house_id
      AND house_members.user_id = auth.uid()
    )
  );