// src/utils/supabase.ts
// Reusable Supabase client reading VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Read environment variables (Vite import.meta.env with fallback to process.env)
const getEnv = (key: string, fallbackKey?: string): string => {
  if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env[key]) {
    return String(import.meta.env[key]).trim();
  }
  if (fallbackKey && typeof import.meta !== 'undefined' && import.meta.env && import.meta.env[fallbackKey]) {
    return String(import.meta.env[fallbackKey]).trim();
  }
  if (typeof process !== 'undefined' && process.env && process.env[key]) {
    return String(process.env[key]).trim();
  }
  if (fallbackKey && typeof process !== 'undefined' && process.env && process.env[fallbackKey]) {
    return String(process.env[fallbackKey]).trim();
  }
  return '';
};

export const supabaseUrl = getEnv('VITE_SUPABASE_URL', 'REACT_APP_SUPABASE_URL');
export const supabaseKey =
  getEnv('VITE_SUPABASE_PUBLISHABLE_KEY') ||
  getEnv('VITE_SUPABASE_ANON_KEY') ||
  getEnv('REACT_APP_SUPABASE_ANON_KEY');

const isValidUrl = (url: string): boolean => {
  if (!url || /YOUR_PROJECT_REF/i.test(url)) return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
};

export const hasValidCredentials =
  isValidUrl(supabaseUrl) &&
  Boolean(supabaseKey) &&
  !/YOUR_PUBLISHABLE_KEY|YOUR_ANON_PUBLIC_KEY/i.test(supabaseKey);

export const supabase: SupabaseClient | null = hasValidCredentials
  ? createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    })
  : null;

export const isSupabaseConfigured = (): boolean => Boolean(supabase);

export const supabaseConfigError =
  'Supabase credentials required. Please set VITE_SUPABASE_PUBLISHABLE_KEY in .env.local to connect to your live project.';
