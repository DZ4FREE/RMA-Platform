import { createClient } from '@supabase/supabase-js';

// Derived from user's project ID: oialkuculeivtshkycrn
const DEFAULT_URL = 'https://oialkuculeivtshkycrn.supabase.co';
// User provided Anon Public Key
const DEFAULT_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9pYWxrdWN1bGVpdnRzaGt5Y3JuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEzMjMyNDAsImV4cCI6MjA4Njg5OTI0MH0.s43LaRa20Oe_9f-wEqi6eyRL9gTPX9mnJIf1xgytnZI';

// Environment variables can still override these for flexibility
const supabaseUrl = (process.env as any).SUPABASE_URL || DEFAULT_URL;
const supabaseAnonKey = (process.env as any).SUPABASE_ANON_KEY || DEFAULT_ANON_KEY;

// Check if Supabase is properly configured
// Since we have hardcoded defaults, this should now return true
export const isSupabaseConfigured = !!(
  supabaseUrl && 
  supabaseAnonKey && 
  supabaseUrl.startsWith('https://') &&
  supabaseAnonKey.length > 20
);

// Initialize client
export const supabase = isSupabaseConfigured 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

export interface UserProfile {
  id: string;
  full_name: string;
  email: string;
  avatar_url?: string;
}

export const getProfile = async (userId: string): Promise<UserProfile | null> => {
  if (!supabase) return null;
  
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      console.warn('Profile fetch failed or not found (Ensure a "profiles" table exists in Supabase):', error.message);
      return null;
    }
    return data;
  } catch (err) {
    console.error('Error fetching profile:', err);
    return null;
  }
};

export const updateProfile = async (profile: UserProfile) => {
  if (!supabase) {
    console.warn('Supabase not configured. Profile update skipped.');
    return;
  }

  const { error } = await supabase
    .from('profiles')
    .upsert(profile);

  if (error) {
    console.error('Error updating profile (Ensure a "profiles" table exists with columns: id, full_name, email):', error);
    throw error;
  }
};