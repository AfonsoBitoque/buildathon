/*
  # Add DELETE policy for house tasks

  ## Description
  This migration adds a DELETE policy to allow house members to delete tasks.

  ## Security Changes
  1. Add policy for members to delete tasks in their house
  
  ## Important Notes
  - Only members of the house can delete tasks
  - This complements existing SELECT, INSERT, and UPDATE policies
*/

-- Policy: Members can delete tasks in their house
CREATE POLICY "Members can delete tasks"
  ON house_tasks
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM house_members
      WHERE house_members.house_id = house_tasks.house_id
      AND house_members.user_id = auth.uid()
    )
  );