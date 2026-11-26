import { supabase, isSupabaseConfigured } from '../lib/supabaseClient.js';
import {
  ORDERS_V2_COLUMN_STORAGE_KEY,
  sanitizeOrdersV2Columns,
  enforceOrdersV2RequiredColumns,
} from '../config/ordersV2ColumnsConfig.js';
import {
  COLUMN_STORAGE_KEY,
  sanitizeAndOrderColumns,
  enforceRequiredColumns,
  DEFAULT_COLUMN_IDS,
} from '../config/orderColumnsConfig.js';

const REMOTE_METADATA_KEY = 'orders_v2_table_columns';

const getLocalStorage = () => {
  if (typeof window !== 'undefined' && window.localStorage) return window.localStorage;
  if (typeof localStorage !== 'undefined') return localStorage;
  return null;
};

const getStorageKey = (userId) => (
  userId ? `${ORDERS_V2_COLUMN_STORAGE_KEY}_${userId}` : ORDERS_V2_COLUMN_STORAGE_KEY
);

export async function loadOrdersV2ColumnPreferences(userId) {
  const storageKey = getStorageKey(userId);

  if (isSupabaseConfigured()) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const remoteColumns = user?.user_metadata?.[REMOTE_METADATA_KEY];
      if (Array.isArray(remoteColumns) && remoteColumns.length > 0) {
        return enforceOrdersV2RequiredColumns(remoteColumns);
      }
    } catch {}
  }

  try {
    const storage = getLocalStorage();
    const stored = storage?.getItem(storageKey);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return enforceOrdersV2RequiredColumns(parsed);
      }
    }
  } catch {}

  return enforceOrdersV2RequiredColumns(sanitizeOrdersV2Columns(null));
}

export async function saveOrdersV2ColumnPreferences(selectedColumns, userId) {
  const sanitized = enforceOrdersV2RequiredColumns(selectedColumns);
  const storageKey = getStorageKey(userId);

  try {
    getLocalStorage()?.setItem(storageKey, JSON.stringify(sanitized));
  } catch {}

  if (isSupabaseConfigured()) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.auth.updateUser({
          data: {
            ...user.user_metadata,
            [REMOTE_METADATA_KEY]: sanitized,
          },
        });
      }
    } catch {}
  }

  return sanitized;
}

export async function loadColumnPreferences() {
  try {
    const storage = getLocalStorage();
    const stored = storage?.getItem(COLUMN_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return sanitizeAndOrderColumns(parsed);
      }
    }
  } catch {}

  return [...DEFAULT_COLUMN_IDS];
}

export async function saveColumnPreferences(selectedColumns) {
  const sanitized = sanitizeAndOrderColumns(selectedColumns);
  try {
    getLocalStorage()?.setItem(COLUMN_STORAGE_KEY, JSON.stringify(sanitized));
  } catch {}
  return sanitized;
}
