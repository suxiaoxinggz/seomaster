import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Database } from '../types';

// Export a global instance that will be set upon initialization
export let supabase: SupabaseClient<Database> | null = null;

export const initializeSupabase = (url: string, anonKey: string): SupabaseClient<Database> => {
    if (!url || !anonKey) {
        throw new Error("Supabase URL and Anon Key are required for initialization.");
    }
    const client = createClient<Database>(url, anonKey);
    supabase = client; // Update global instance
    return client;
};