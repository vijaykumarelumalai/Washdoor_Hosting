// src/lib/supabaseClient.js
// Proxies to src/utils/supabase.ts for unified client access

export {
  supabase,
  isSupabaseConfigured,
  hasValidCredentials as hasSupabaseCredentials,
  supabaseUrl,
  supabaseKey as supabaseAnonKey,
  supabaseConfigError as supabaseConfigurationError,
} from '../utils/supabase';
