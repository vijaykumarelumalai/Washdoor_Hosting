// src/services/columnPreferenceService.js
// Washdoor User-Specific Column Preference Persistence via Supabase and LocalStorage

import { supabase, isSupabaseConfigured } from '../lib/supabaseClient.js';
import {
  DEFAULT_COLUMN_IDS,
  ALL_COLUMN_IDS,
  COLUMN_STORAGE_KEY,
  sanitizeAndOrderColumns,
} from '../config/orderColumnsConfig.js';

/**
 * Loads user column preferences from Supabase or localStorage fallback.
 * @param {string} [userId] Current staff/admin user ID
 * @returns {Promise<string[]>} List of active column IDs
 */
export async function loadColumnPreferences(userId) {
  const storageKey = userId ? `${COLUMN_STORAGE_KEY}_${userId}` : COLUMN_STORAGE_KEY;

  // 1. Try Supabase Auth metadata or profiles table if available
  if (isSupabaseConfigured()) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user && user.user_metadata?.order_table_columns) {
        const remoteCols = user.user_metadata.order_table_columns;
        if (Array.isArray(remoteCols) && remoteCols.length > 0) {
          return sanitizeAndOrderColumns(remoteCols);
        }
      }
    } catch (e) {
      // Gracefully fall back to local storage
    }
  }

  // 2. Try localStorage
  try {
    const ls = (typeof window !== 'undefined' && window.localStorage) ? window.localStorage : (typeof localStorage !== 'undefined' ? localStorage : null);
    if (ls) {
      const stored = ls.getItem(storageKey) || ls.getItem(COLUMN_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return sanitizeAndOrderColumns(parsed);
        }
      }
    }
  } catch (err) {}

  // 3. Fallback to 9 default columns
  return [...DEFAULT_COLUMN_IDS];
}

/**
 * Saves user column preferences to localStorage and Supabase.
 * @param {string[]} selectedColumns
 * @param {string} [userId] Current staff/admin user ID
 * @returns {Promise<string[]>} Sanitized ordered columns
 */
export async function saveColumnPreferences(selectedColumns, userId) {
  const sanitized = sanitizeAndOrderColumns(selectedColumns);
  const storageKey = userId ? `${COLUMN_STORAGE_KEY}_${userId}` : COLUMN_STORAGE_KEY;

  // 1. Save to localStorage immediately
  try {
    const ls = (typeof window !== 'undefined' && window.localStorage) ? window.localStorage : (typeof localStorage !== 'undefined' ? localStorage : null);
    if (ls) {
      ls.setItem(storageKey, JSON.stringify(sanitized));
      ls.setItem(COLUMN_STORAGE_KEY, JSON.stringify(sanitized));
    }
  } catch (err) {}

  // 2. Persist to Supabase if connected
  if (isSupabaseConfigured()) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.auth.updateUser({
          data: {
            ...user.user_metadata,
            order_table_columns: sanitized,
          },
        });
      }
    } catch (e) {
      // Ignore background persistence errors
    }
  }

  return sanitized;
}
