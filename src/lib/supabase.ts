import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface User {
  id: string;
  email: string;
  username: string;
  tag: string;
  created_at: string;
}

export interface UserInsert {
  id: string;
  email: string;
  username: string;
  tag: string;
  password_hash: string;
}

export interface House {
  id: string;
  name: string;
  invite_code: string;
  created_by: string | null;
  created_at: string;
}

export interface HouseInsert {
  name: string;
  invite_code: string;
  created_by: string;
}

export interface HouseMember {
  id: string;
  house_id: string;
  user_id: string;
  joined_at: string;
}

export interface HouseMemberInsert {
  house_id: string;
  user_id: string;
}

export interface ChatMessage {
  id: string;
  house_id: string;
  user_id: string;
  content: string;
  created_at: string;
  updated_at: string;
  is_edited: boolean;
}

export interface ChatMessageInsert {
  house_id: string;
  user_id: string;
  content: string;
}

export interface HouseTask {
  id: string;
  house_id: string;
  created_by: string;
  title: string;
  deadline_days: number;
  created_at: string;
  completed_at: string | null;
  is_completed: boolean;
}

export interface HouseTaskInsert {
  house_id: string;
  created_by: string;
  title: string;
  deadline_days: number;
}
