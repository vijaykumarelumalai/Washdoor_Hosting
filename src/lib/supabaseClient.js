// src/lib/supabaseClient.js
// Supabase Client Initialization

import { createClient } from '@supabase/supabase-js';

const env = (typeof import.meta !== 'undefined' && import.meta.env)
  ? import.meta.env
  : (typeof process !== 'undefined' ? process.env : {});

export const supabaseUrl = env.VITE_SUPABASE_URL || 'https://bpnruunbdxxwadtrswao.supabase.co';
export const supabaseKey =
  env.VITE_SUPABASE_ANON_KEY ||
  env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  'sb_publishable_Rtq6GiRcraUJ2J5QByB9UQ_7QcRyX1Y';

export const supabase = createClient(
  supabaseUrl,
  supabaseKey
);

export const isSupabaseConfigured = () => {
  return Boolean(supabaseUrl && supabaseKey && !supabaseUrl.includes('YOUR_PROJECT_REF'));
};

export const hasSupabaseCredentials = isSupabaseConfigured();
export const supabaseAnonKey = supabaseKey;
export const supabaseConfigurationError = null;

export default supabase;
