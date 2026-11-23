// src/services/serviceTypeService.js
// Database-backed service type master used by Orders v2 -> Order Details tab.
// Supabase 'washdoor_service_types' is the source of truth; the shared local
// service-type storage is kept in sync so existing modules keep working.

import { supabase, isSupabaseConfigured } from '../lib/supabaseClient.js';
import {
  CUSTOM_SERVICE_TYPES_STORAGE_KEY,
  DEFAULT_SERVICE_TYPES,
  addCustomServiceType,
  getCustomServiceTypes,
  saveStoredSettings,
} from '../config/businessRules.js';

export const SERVICE_TYPES_TABLE = 'washdoor_service_types';
export const SERVICE_TYPES_UPDATED_EVENT = 'washdoor_service_types_updated';

const DEFAULT_ICONS = {
  Laundry: 'laundry',
  'Dry Cleaning': 'dry_cleaning',
  Washing: 'washing',
  'Shoe Cleaning': 'shoe',
  'Ironing Only': 'iron',
  'Custom Category': 'category',
};

const slugify = (name) => String(name || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'custom';

const isDbId = (id) => Boolean(id) && !String(id).startsWith('default:') && !String(id).startsWith('local:');

function mapRow(row, index = 0) {
  return {
    id: row.id,
    name: String(row.service_name || '').trim(),
    iconType: row.icon_type || 'custom',
    isDefault: Boolean(row.is_default),
    isCustom: !row.is_default,
    isActive: row.is_active !== false,
    displayOrder: Number(row.display_order ?? index + 1),
    updatedAt: row.updated_at || null,
  };
}

function notifyServiceTypesChanged(list) {
  if (typeof window === 'undefined' || typeof window.dispatchEvent !== 'function' || typeof CustomEvent === 'undefined') return;
  window.dispatchEvent(new CustomEvent(SERVICE_TYPES_UPDATED_EVENT, { detail: list }));
}

function syncLocalAdd(name) {
  try {
    addCustomServiceType(name);
  } catch (err) {
    console.warn('Unable to cache service type locally:', err?.message || err);
  }
}

function syncLocalRemove(name) {
  try {
    if (typeof localStorage === 'undefined') return;
    const remaining = getCustomServiceTypes().filter((n) => n.toLowerCase() !== String(name || '').trim().toLowerCase());
    localStorage.setItem(CUSTOM_SERVICE_TYPES_STORAGE_KEY, JSON.stringify(remaining));
    saveStoredSettings({ customServiceTypes: remaining });
  } catch (err) {
    console.warn('Unable to remove cached service type:', err?.message || err);
  }
}

/**
 * Service types derived from the shared localStorage config, used as an
 * offline fallback and as the initial list while the database is loading.
 */
export function getFallbackServiceTypes() {
  const defaults = DEFAULT_SERVICE_TYPES.map((name, index) => ({
    id: `default:${slugify(name)}`,
    name,
    iconType: DEFAULT_ICONS[name] || 'custom',
    isDefault: true,
    isCustom: false,
    isActive: true,
    displayOrder: index + 1,
  }));

  const custom = getCustomServiceTypes().map((name, index) => ({
    id: `local:${slugify(name)}`,
    name,
    iconType: 'custom',
    isDefault: false,
    isCustom: true,
    isActive: true,
    displayOrder: defaults.length + index + 1,
  }));

  return [...defaults, ...custom];
}

/**
 * Loads all active service types from Supabase, merging built-in defaults and
 * any locally-added types. Falls back to localStorage when DB is unavailable.
 */
export async function fetchServiceTypes() {
  const fallback = getFallbackServiceTypes();
  if (!isSupabaseConfigured()) {
    return { data: fallback, source: 'local', error: null };
  }

  try {
    const { data, error } = await supabase
      .from(SERVICE_TYPES_TABLE)
      .select('id, service_name, icon_type, is_default, is_active, display_order, updated_at')
      .order('display_order', { ascending: true })
      .order('service_name', { ascending: true });

    if (error) {
      return { data: fallback, source: 'local', error: error.message || 'Unable to load service types' };
    }
    if (!Array.isArray(data) || data.length === 0) {
      return { data: fallback, source: 'local', error: null };
    }

    const rows = data.filter((row) => row.is_active !== false).map(mapRow);
    const seen = new Set();
    const merged = [];

    DEFAULT_SERVICE_TYPES.forEach((name, index) => {
      const key = name.toLowerCase();
      const fromDb = rows.find((row) => row.isDefault && row.name.toLowerCase() === key);
      const fromLocal = fallback.find((row) => row.isDefault && row.name.toLowerCase() === key);
      const entry = fromDb || fromLocal;
      if (!entry) return;
      seen.add(key);
      merged.push({ ...entry, isDefault: true, isCustom: false, displayOrder: index + 1 });
    });

    [...rows.filter((row) => !row.isDefault), ...fallback.filter((row) => row.isCustom)].forEach((entry, index) => {
      const key = String(entry.name || '').toLowerCase();
      if (!key || seen.has(key)) return;
      seen.add(key);
      merged.push({ ...entry, isCustom: true, displayOrder: merged.length + index + 1 });
    });

    return { data: merged, source: 'supabase', error: null };
  } catch (err) {
    return { data: fallback, source: 'local', error: err?.message || 'Unable to load service types' };
  }
}

/**
 * Creates a service type in Supabase and mirrors it in shared local storage.
 */
export async function createServiceType({ name, iconType = 'custom' } = {}) {
  const clean = String(name || '').trim();
  if (!clean) return { data: null, source: 'local', error: 'Service type name is required' };

  const fetched = await fetchServiceTypes();
  const fetchedData = Array.isArray(fetched.data) ? fetched.data : [];
  const existing = [...getFallbackServiceTypes(), ...fetchedData];
  if (fetchedData.some((s) => isDbId(s.id) && s.name.toLowerCase() === clean.toLowerCase())) {
    return { data: null, source: 'local', error: 'A service type with this name already exists' };
  }

  let row = null;
  let source = 'local';
  let error = null;

  if (isSupabaseConfigured()) {
    try {
      const { data, error: dbError } = await supabase
        .from(SERVICE_TYPES_TABLE)
        .insert([{
          service_name: clean,
          icon_type: iconType || 'custom',
          is_default: false,
          is_active: true,
          display_order: 100 + existing.length,
        }])
        .select()
        .single();
      if (dbError) {
        error = dbError.message || 'Unable to save service type to the database';
      } else {
        row = data;
        source = 'supabase';
      }
    } catch (err) {
      error = err?.message || 'Unable to save service type to the database';
    }
  }

  syncLocalAdd(clean);
  const entry = row
    ? mapRow(row)
    : {
        id: `local:${slugify(clean)}`,
        name: clean,
        iconType: iconType || 'custom',
        isDefault: false,
        isCustom: true,
        isActive: true,
        displayOrder: 100 + existing.length,
      };

  notifyServiceTypesChanged([...existing.filter((s) => s.id !== entry.id), entry]);
  return { data: entry, source, error };
}

/**
 * Renames / re-iconizes a custom service type in Supabase and local storage.
 */
export async function updateServiceType(service, { name, iconType } = {}) {
  if (!service || service.isDefault) {
    return { data: null, source: 'local', error: 'Built-in service types cannot be edited' };
  }
  const clean = String(name || '').trim();
  if (!clean) return { data: null, source: 'local', error: 'Service type name is required' };

  const current = (await fetchServiceTypes()).data;
  if (current.some((s) => s.id !== service.id && s.name.toLowerCase() === clean.toLowerCase())) {
    return { data: null, source: 'local', error: 'A service type with this name already exists' };
  }

  let source = 'local';
  let error = null;

  if (isDbId(service.id) && isSupabaseConfigured()) {
    try {
      const { error: dbError } = await supabase
        .from(SERVICE_TYPES_TABLE)
        .update({ service_name: clean, icon_type: iconType || service.iconType || 'custom' })
        .eq('id', service.id);
      if (dbError) {
        error = dbError.message || 'Unable to update service type in the database';
      } else {
        source = 'supabase';
      }
    } catch (err) {
      error = err?.message || 'Unable to update service type in the database';
    }
  }

  syncLocalRemove(service.name);
  syncLocalAdd(clean);

  const entry = {
    ...service,
    name: clean,
    iconType: iconType || service.iconType || 'custom',
    isCustom: true,
    isActive: true,
  };
  const next = current.map((s) => (s.id === service.id ? entry : s));
  notifyServiceTypesChanged(next);
  return { data: entry, source, error };
}

/**
 * Deletes a custom service type from Supabase and local storage.
 */
export async function deleteServiceType(service) {
  if (!service || service.isDefault) {
    return { data: null, source: 'local', error: 'Built-in service types cannot be deleted' };
  }

  let source = 'local';
  let error = null;

  if (isDbId(service.id) && isSupabaseConfigured()) {
    try {
      const { error: dbError } = await supabase
        .from(SERVICE_TYPES_TABLE)
        .delete()
        .eq('id', service.id);
      if (dbError) {
        error = dbError.message || 'Unable to delete service type from the database';
      } else {
        source = 'supabase';
      }
    } catch (err) {
      error = err?.message || 'Unable to delete service type from the database';
    }
  }

  syncLocalRemove(service.name);
  const next = getFallbackServiceTypes().filter((s) => s.name.toLowerCase() !== service.name.toLowerCase());
  notifyServiceTypesChanged(next);
  return { data: service, source, error };
}
