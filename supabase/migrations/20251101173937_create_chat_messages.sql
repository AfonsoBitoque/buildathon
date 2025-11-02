/*
  # Create Chat Messages System

  ## Description
  This migration creates the chat messages system for house general chat.
  All members of a house can send and read messages in the general chat.

  ## New Tables
  1. `chat_messages`
    - `id` (uuid, primary key) - Unique message identifier
    - `house_id` (uuid, foreign key) - References the house
    - `user_id` (uuid, foreign key) - References the message author
    - `content` (text) - Message content
    - `created_at` (timestamptz) - When message was sent
    - `updated_at` (timestamptz) - When message was last edited
    - `is_edited` (boolean) - Flag for edited messages

  ## Security
  1. Enable RLS on chat_messages
  2. Members can read all messages in their house
  3. Members can create messages in their house
  4. Users can only update/delete their own messages

  ## Important Notes
  - Messages are tied to houses via foreign key
  - Automatic timestamps for message tracking
  - RLS ensures only house members can access messages
*/

-- Create chat_messages table
CREATE TABLE IF NOT EXISTS chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  house_id uuid NOT NULL REFERENCES houses(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  is_edited boolean DEFAULT false
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS chat_messages_house_id_idx ON chat_messages(house_id);
CREATE INDEX IF NOT EXISTS chat_messages_created_at_idx ON chat_messages(created_at DESC);

-- Enable RLS
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Policy: Members can read messages in their house
CREATE POLICY "Members can read house messages"
  ON chat_messages
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM house_members
      WHERE house_members.house_id = chat_messages.house_id
      AND house_members.user_id = auth.uid()
    )
  );

-- Policy: Members can create messages in their house
CREATE POLICY "Members can create messages"
  ON chat_messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM house_members
      WHERE house_members.house_id = chat_messages.house_id
      AND house_members.user_id = auth.uid()
    )
    AND user_id = auth.uid()
  );

-- Policy: Users can update their own messages
CREATE POLICY "Users can update own messages"
  ON chat_messages
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Policy: Users can delete their own messages
CREATE POLICY "Users can delete own messages"
  ON chat_messages
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());