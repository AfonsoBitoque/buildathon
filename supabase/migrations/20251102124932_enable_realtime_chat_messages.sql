/*
  # Enable Realtime for Chat Messages

  ## Description
  This migration enables Supabase Realtime for the chat_messages table
  by setting replica identity to FULL.

  ## Problem
  - Real-time subscriptions not working for chat messages
  - Messages only appear after page refresh
  - Replica identity was set to DEFAULT (no replication)

  ## Solution
  1. Enable replica identity FULL for chat_messages table
  2. This allows Supabase to broadcast INSERT, UPDATE, DELETE events in real-time

  ## Important Notes
  - Required for postgres_changes subscriptions to work
  - FULL replica identity sends all column values in real-time events
*/

-- Enable replica identity for real-time subscriptions
ALTER TABLE chat_messages REPLICA IDENTITY FULL;

-- Verify the publication exists (Supabase creates this automatically)
-- If it doesn't exist for some reason, we can create it
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND schemaname = 'public' 
    AND tablename = 'chat_messages'
  ) THEN
    -- Add table to realtime publication
    ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;
  END IF;
END $$;