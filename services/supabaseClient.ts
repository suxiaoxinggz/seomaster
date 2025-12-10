import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Database } from '../types';

// Export a global instance that will be set upon initialization
// Initialize Supabase immediately with Environment Variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.error("Missing Supabase VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY");
}

export const supabase = createClient<Database>(
    supabaseUrl || 'https://placeholder.supabase.co',
    supabaseAnonKey || 'placeholder-key'
);

// Keep this for backward compatibility if needed, but it's largely redundant now
export const initializeSupabase = (url: string, anonKey: string) => {
    return supabase;
};