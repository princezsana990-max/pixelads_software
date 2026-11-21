// ==============================================================================
// OrderFlow Pro: Supabase PostgreSQL Client & Connection Manager
// Strictly no SQLite / Mock Database fallback.
// ==============================================================================

import { createClient, SupabaseClient } from '@supabase/supabase-js';

const STORAGE_KEY_URL = 'orderflow_supabase_url';
const STORAGE_KEY_KEY = 'orderflow_supabase_anon_key';

// Read from Vite environment variables or browser storage override
export function getSupabaseCredentials(): { url: string; anonKey: string; isConfigured: boolean; missingVars: string[] } {
  const envUrl = import.meta.env.VITE_SUPABASE_URL || '';
  const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

  const localUrl = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY_URL) || '' : '';
  const localKey = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY_KEY) || '' : '';

  const activeUrl = (localUrl || envUrl).trim();
  const activeKey = (localKey || envKey).trim();

  const missingVars: string[] = [];
  if (!activeUrl || activeUrl.includes('your-project-id') || !activeUrl.startsWith('https://')) {
    missingVars.push('VITE_SUPABASE_URL (Valid Supabase Project URL)');
  }
  if (!activeKey || activeKey.includes('your-actual-supabase-anon-key-here') || activeKey.length < 20) {
    missingVars.push('VITE_SUPABASE_ANON_KEY (Valid Public Anon API Key)');
  }

  return {
    url: activeUrl,
    anonKey: activeKey,
    isConfigured: missingVars.length === 0,
    missingVars,
  };
}

export function saveRuntimeCredentials(url: string, anonKey: string) {
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY_URL, url.trim());
    localStorage.setItem(STORAGE_KEY_KEY, anonKey.trim());
    // Force re-create client
    supabaseClientInstance = null;
  }
}

export function clearRuntimeCredentials() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(STORAGE_KEY_URL);
    localStorage.removeItem(STORAGE_KEY_KEY);
    supabaseClientInstance = null;
  }
}

let supabaseClientInstance: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient | null {
  const { url, anonKey, isConfigured } = getSupabaseCredentials();
  if (!isConfigured) {
    return null;
  }

  if (!supabaseClientInstance) {
    supabaseClientInstance = createClient(url, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    });
  }
  return supabaseClientInstance;
}

export interface ConnectionTestResult {
  success: boolean;
  message: string;
  tablesFound?: boolean;
  details?: string;
}

// Real connection test querying the Supabase database
export async function testSupabaseConnection(customUrl?: string, customKey?: string): Promise<ConnectionTestResult> {
  const { url, anonKey, isConfigured } = customUrl && customKey 
    ? { url: customUrl.trim(), anonKey: customKey.trim(), isConfigured: true }
    : getSupabaseCredentials();

  if (!isConfigured || !url || !anonKey) {
    return {
      success: false,
      message: 'Supabase credentials are incomplete or invalid.',
      details: 'Please provide both the Supabase Project URL (https://xyz.supabase.co) and the Anon Public Key.',
    };
  }

  try {
    const testClient = createClient(url, anonKey);
    // Real ping to check if Supabase REST endpoint responds and if our schema is installed
    const { count, error } = await testClient
      .from('employees')
      .select('*', { count: 'exact', head: true });

    if (error) {
      // Check if error is table not found (relation does not exist)
      if (error.code === '42P01' || error.message.includes('relation "public.employees" does not exist') || error.message.includes('not found')) {
        return {
          success: true,
          tablesFound: false,
          message: 'Connected to Supabase project, but database tables are not yet created.',
          details: 'Please execute the SQL migration script from supabase/migrations/20260221000000_orderflow_init.sql in your Supabase SQL Editor.',
        };
      }
      return {
        success: false,
        message: `Database error: ${error.message}`,
        details: `Error Code: ${error.code || 'UNKNOWN'}. Check that your Anon Key and Project URL are correct.`,
      };
    }

    return {
      success: true,
      tablesFound: true,
      message: 'Supabase PostgreSQL database is connected and operational.',
      details: `Successfully connected to ${url}. Schema verified.`,
    };
  } catch (err: any) {
    return {
      success: false,
      message: 'Network or configuration failure.',
      details: err?.message || 'Could not reach Supabase endpoint. Check your internet connection and URL.',
    };
  }
}
