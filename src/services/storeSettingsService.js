// src/services/storeSettingsService.js
// Supabase Persistence & Branding Audit History Service for Store Settings
// Persists shop name, logo, business profile, previous branding details, and timestamps

import { supabase, isSupabaseConfigured } from '../lib/supabaseClient.js';
import { DEFAULT_SETTINGS, getStoredSettings, saveStoredSettings } from '../config/businessRules.js';
import { logAuditEvent } from './auditService.js';

export const STORE_KEY = 'default';
const BRAND_HISTORY_STORAGE_KEY = 'washdoor_brand_history_v1';

/**
 * Reads cached branding change history from localStorage.
 */
export function getLocalBrandHistory() {
  try {
    if (typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem(BRAND_HISTORY_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
      }
    }
  } catch (err) {
    console.warn('Unable to read local brand history:', err);
  }
  return [];
}

function saveLocalBrandHistory(entries) {
  try {
    if (typeof localStorage !== 'undefined' && Array.isArray(entries)) {
      localStorage.setItem(BRAND_HISTORY_STORAGE_KEY, JSON.stringify(entries.slice(0, 100)));
    }
  } catch (err) {
    console.warn('Unable to save local brand history:', err);
  }
}

/**
 * Maps a Supabase `washdoor_store_settings` row to the UI settings shape.
 */
export function mapDbRowToSettings(row, fallback = getStoredSettings()) {
  if (!row) return fallback;
  const json = (row.settings_json && typeof row.settings_json === 'object') ? row.settings_json : {};

  return {
    ...DEFAULT_SETTINGS,
    ...fallback,
    ...json,
    shopName: row.shop_name ?? fallback.shopName ?? DEFAULT_SETTINGS.shopName,
    shopLogo: row.shop_logo ?? fallback.shopLogo ?? '',
    shopTagline: row.shop_tagline ?? fallback.shopTagline ?? DEFAULT_SETTINGS.shopTagline,
    storeBranch: row.store_branch ?? fallback.storeBranch ?? DEFAULT_SETTINGS.storeBranch,
    phone: row.phone ?? fallback.phone ?? DEFAULT_SETTINGS.phone,
    email: row.email ?? fallback.email ?? DEFAULT_SETTINGS.email,
    whatsappNumber: row.whatsapp_number ?? fallback.whatsappNumber ?? DEFAULT_SETTINGS.whatsappNumber,
    address: row.address ?? fallback.address ?? DEFAULT_SETTINGS.address,
    city: row.city ?? fallback.city ?? DEFAULT_SETTINGS.city,
    state: row.state ?? fallback.state ?? DEFAULT_SETTINGS.state,
    pinCode: row.pin_code ?? fallback.pinCode ?? DEFAULT_SETTINGS.pinCode,
    gstNumber: row.gst_number ?? fallback.gstNumber ?? DEFAULT_SETTINGS.gstNumber,
    latitude: row.latitude !== null && row.latitude !== undefined ? Number(row.latitude) : (fallback.latitude ?? DEFAULT_SETTINGS.latitude),
    longitude: row.longitude !== null && row.longitude !== undefined ? Number(row.longitude) : (fallback.longitude ?? DEFAULT_SETTINGS.longitude),
    previousShopName: row.previous_shop_name ?? fallback.previousShopName ?? '',
    previousShopLogo: row.previous_shop_logo ?? fallback.previousShopLogo ?? '',
    shopNameUpdatedAt: row.shop_name_updated_at ?? fallback.shopNameUpdatedAt ?? null,
    logoUpdatedAt: row.logo_updated_at ?? fallback.logoUpdatedAt ?? null,
    updatedAt: row.updated_at ?? fallback.updatedAt ?? null,
    updatedBy: row.updated_by ?? fallback.updatedBy ?? 'Store Administrator',
  };
}

/**
 * Maps a Supabase `washdoor_brand_history` row to UI history entry shape.
 */
export function mapDbHistoryRow(row) {
  if (!row) return null;
  return {
    id: row.history_id || row.id,
    storeKey: row.store_key || STORE_KEY,
    changeType: row.change_type || 'BOTH',
    previousShopName: row.previous_shop_name ?? '',
    newShopName: row.new_shop_name ?? '',
    previousShopLogo: row.previous_shop_logo ?? '',
    newShopLogo: row.new_shop_logo ?? '',
    changedFields: Array.isArray(row.changed_fields) ? row.changed_fields : [],
    changeSummary: row.change_summary || '',
    changedBy: row.changed_by || 'Store Administrator',
    changedAt: row.changed_at || row.created_at || new Date().toISOString(),
    source: 'supabase',
  };
}

/**
 * Fetches current store settings from Supabase and syncs localStorage + runtime config.
 */
export async function fetchStoreSettingsFromDB() {
  const local = getStoredSettings();
  if (!isSupabaseConfigured()) {
    return { data: local, source: 'local', error: null };
  }

  try {
    const { data, error } = await supabase
      .from('washdoor_store_settings')
      .select('*')
      .eq('store_key', STORE_KEY)
      .maybeSingle();

    if (error) {
      return { data: local, source: 'local', error };
    }

    if (!data) {
      return { data: local, source: 'local', error: null };
    }

    const mapped = mapDbRowToSettings(data, local);
    saveStoredSettings(mapped);
    return { data: mapped, source: 'supabase', error: null };
  } catch (err) {
    return { data: local, source: 'local', error: err };
  }
}

/**
 * Fetches branding update history (shop name & logo changes with previous details & timestamps).
 */
export async function fetchBrandHistoryFromDB(limit = 30) {
  const localHistory = getLocalBrandHistory();
  if (!isSupabaseConfigured()) {
    return { data: localHistory, source: 'local', error: null };
  }

  try {
    const { data, error } = await supabase
      .from('washdoor_brand_history')
      .select('*')
      .eq('store_key', STORE_KEY)
      .order('changed_at', { ascending: false })
      .limit(limit);

    if (error) {
      return { data: localHistory, source: 'local', error };
    }

    const mapped = (data || []).map(mapDbHistoryRow).filter(Boolean);
    saveLocalBrandHistory(mapped);
    return { data: mapped, source: 'supabase', error: null };
  } catch (err) {
    return { data: localHistory, source: 'local', error: err };
  }
}

function buildLocalHistoryEntry({
  prevName,
  nextName,
  prevLogo,
  nextLogo,
  nameChanged,
  logoChanged,
  updatedBy,
  timestamp,
}) {
  const changeType = nameChanged && logoChanged
    ? 'BOTH'
    : nameChanged
    ? 'SHOP_NAME'
    : 'SHOP_LOGO';

  const changedFields = [];
  if (nameChanged) changedFields.push('shop_name');
  if (logoChanged) changedFields.push('shop_logo');

  let changeSummary = '';
  if (nameChanged && logoChanged) {
    changeSummary = `Updated shop name from "${prevName}" to "${nextName}" and updated shop logo`;
  } else if (nameChanged) {
    changeSummary = `Updated shop name from "${prevName}" to "${nextName}"`;
  } else if (!nextLogo) {
    changeSummary = 'Removed custom shop logo (reverted to default icon)';
  } else if (!prevLogo) {
    changeSummary = 'Uploaded new custom shop logo';
  } else {
    changeSummary = 'Replaced shop logo with a new image';
  }

  return {
    id: `brand-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    storeKey: STORE_KEY,
    changeType,
    previousShopName: prevName,
    newShopName: nextName,
    previousShopLogo: prevLogo,
    newShopLogo: nextLogo,
    changedFields,
    changeSummary,
    changedBy: updatedBy || 'Store Administrator',
    changedAt: timestamp,
    source: 'local',
  };
}

/**
 * Saves store settings to Supabase `washdoor_store_settings` and updates local state.
 * Database triggers automatically archive previous shop_name/shop_logo and log to `washdoor_brand_history`.
 */
export async function saveStoreSettingsToDB(nextSettings, previousSettings = getStoredSettings()) {
  const nowIso = new Date().toISOString();
  const prevName = String(previousSettings?.shopName ?? DEFAULT_SETTINGS.shopName).trim();
  const nextName = String(nextSettings?.shopName ?? DEFAULT_SETTINGS.shopName).trim();
  const prevLogo = previousSettings?.shopLogo || '';
  const nextLogo = nextSettings?.shopLogo || '';

  const nameChanged = prevName !== nextName;
  const logoChanged = prevLogo !== nextLogo;
  const updatedBy = nextSettings?.updatedBy || 'Store Administrator';

  // Prepare optimistic local metadata
  const enrichedSettings = {
    ...nextSettings,
    shopName: nextName,
    shopLogo: nextLogo,
    previousShopName: nameChanged ? prevName : (previousSettings?.previousShopName ?? ''),
    previousShopLogo: logoChanged ? prevLogo : (previousSettings?.previousShopLogo ?? ''),
    shopNameUpdatedAt: nameChanged ? nowIso : (previousSettings?.shopNameUpdatedAt ?? nowIso),
    logoUpdatedAt: logoChanged ? nowIso : (previousSettings?.logoUpdatedAt ?? null),
    updatedAt: nowIso,
    updatedBy,
  };

  // Immediately update localStorage & runtime UI event
  saveStoredSettings(enrichedSettings);

  // Record in system Audit Log when Shop Name or Shop Logo changes
  if (nameChanged || logoChanged) {
    const changeDesc = [
      nameChanged ? `Shop Name: "${prevName}" → "${nextName}"` : null,
      logoChanged ? `Shop Logo: ${nextLogo ? (prevLogo ? 'Replaced' : 'Uploaded') : 'Removed'}` : null,
    ].filter(Boolean).join(' | ');

    logAuditEvent({
      action: nameChanged && logoChanged
        ? 'Shop Name & Logo Updated'
        : nameChanged
        ? 'Shop Name Updated'
        : 'Shop Logo Updated',
      module: 'Business Profile Settings',
      tenant: enrichedSettings.storeBranch || 'Ranipet Store #1',
      format: 'SYSTEM',
      actor: updatedBy,
      details: changeDesc,
      severity: 'info',
      meta: {
        previousShopName: prevName,
        newShopName: nextName,
        hadPreviousLogo: Boolean(prevLogo),
        hasNewLogo: Boolean(nextLogo),
        updatedAt: nowIso,
      },
    });
  }

  // Build settings_json without duplicating huge base64 logo string inside JSONB
  const {
    shopLogo: _omitLogo,
    previousShopLogo: _omitPrevLogo,
    ...settingsJsonSafe
  } = enrichedSettings;

  if (!isSupabaseConfigured()) {
    let history = getLocalBrandHistory();
    if (nameChanged || logoChanged) {
      const localEntry = buildLocalHistoryEntry({
        prevName,
        nextName,
        prevLogo,
        nextLogo,
        nameChanged,
        logoChanged,
        updatedBy,
        timestamp: nowIso,
      });
      history = [localEntry, ...history];
      saveLocalBrandHistory(history);
    }
    return { data: enrichedSettings, history, source: 'local', error: null };
  }

  try {
    const payload = {
      store_key: STORE_KEY,
      shop_name: nextName,
      shop_logo: nextLogo,
      shop_tagline: enrichedSettings.shopTagline || DEFAULT_SETTINGS.shopTagline,
      store_branch: enrichedSettings.storeBranch || DEFAULT_SETTINGS.storeBranch,
      phone: enrichedSettings.phone || '',
      email: enrichedSettings.email || '',
      whatsapp_number: enrichedSettings.whatsappNumber || '',
      address: enrichedSettings.address || '',
      city: enrichedSettings.city || '',
      state: enrichedSettings.state || '',
      pin_code: enrichedSettings.pinCode || '',
      gst_number: enrichedSettings.gstNumber || '',
      latitude: Number(enrichedSettings.latitude ?? DEFAULT_SETTINGS.latitude),
      longitude: Number(enrichedSettings.longitude ?? DEFAULT_SETTINGS.longitude),
      settings_json: settingsJsonSafe,
      previous_shop_name: enrichedSettings.previousShopName,
      previous_shop_logo: enrichedSettings.previousShopLogo,
      shop_name_updated_at: enrichedSettings.shopNameUpdatedAt,
      logo_updated_at: enrichedSettings.logoUpdatedAt,
      updated_by: updatedBy,
      updated_at: nowIso,
    };

    const { data: savedRow, error: upsertError } = await supabase
      .from('washdoor_store_settings')
      .upsert(payload, { onConflict: 'store_key' })
      .select('*')
      .single();

    if (upsertError) {
      throw upsertError;
    }

    const syncedSettings = mapDbRowToSettings(savedRow, enrichedSettings);
    saveStoredSettings(syncedSettings);

    const historyRes = await fetchBrandHistoryFromDB();
    return {
      data: syncedSettings,
      history: historyRes.data,
      source: 'supabase',
      error: null,
    };
  } catch (err) {
    console.warn('Supabase store settings save fallback to localStorage:', err?.message || err);
    let history = getLocalBrandHistory();
    if (nameChanged || logoChanged) {
      const localEntry = buildLocalHistoryEntry({
        prevName,
        nextName,
        prevLogo,
        nextLogo,
        nameChanged,
        logoChanged,
        updatedBy,
        timestamp: nowIso,
      });
      history = [localEntry, ...history];
      saveLocalBrandHistory(history);
    }
    return { data: enrichedSettings, history, source: 'local', error: err };
  }
}
