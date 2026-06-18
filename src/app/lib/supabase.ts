import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Default credentials provided by the user
export const DEFAULT_SUPABASE_URL = "https://omqktvttaxtjumczgppk.supabase.co";
export const DEFAULT_SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9tcWt0dnR0YXh0anVtY3pncHBrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE3ODg1MjIsImV4cCI6MjA5NzM2NDUyMn0.71DlmUfSre-AtSbOGsXU8ussVz-jPl5yBgqc4Nbp4JA";

let supabaseClientInstance: SupabaseClient | null = null;

export function getSupabaseClient(url?: string, key?: string): SupabaseClient | null {
  const targetUrl = url || DEFAULT_SUPABASE_URL;
  const targetKey = key || DEFAULT_SUPABASE_ANON_KEY;

  if (!targetUrl || !targetKey) return null;

  try {
    // If instance already exists with same URL, reuse it
    if (supabaseClientInstance && (supabaseClientInstance as any).supabaseUrl === targetUrl) {
      return supabaseClientInstance;
    }
    supabaseClientInstance = createClient(targetUrl, targetKey);
    return supabaseClientInstance;
  } catch (error) {
    console.error("Gagal menginisialisasi client Supabase:", error);
    return null;
  }
}

export async function fetchStateFromSupabase(client: SupabaseClient): Promise<any | null> {
  try {
    const { data, error } = await client
      .from('posster_states')
      .select('state')
      .eq('id', 'posster_state')
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // Row does not exist yet, which is fine
        return null;
      }
      throw error;
    }
    return data?.state || null;
  } catch (error) {
    console.error("Gagal mengambil data dari Supabase:", error);
    throw error;
  }
}

export async function saveStateToSupabase(client: SupabaseClient, state: any): Promise<boolean> {
  try {
    const { error } = await client
      .from('posster_states')
      .upsert({ 
        id: 'posster_state', 
        state: state,
        updated_at: new Date().toISOString()
      }, { onConflict: 'id' });

    if (error) throw error;
    return true;
  } catch (error) {
    console.error("Gagal menyimpan data ke Supabase:", error);
    throw error;
  }
}
