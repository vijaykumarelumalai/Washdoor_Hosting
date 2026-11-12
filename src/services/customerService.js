// src/services/customerService.js
// 100% Real Database Service connected to Supabase:
// - 'washdoor_orders_master' (Orders and Customers master)
// - 'washdoor_products' (Clothes products catalog)
// - 'washdoor_order_items' (Line items per order)

import { supabase, isSupabaseConfigured } from '../lib/supabaseClient.js';
import { triggerNotification } from './notificationTemplateService.js';
import { logAuditEvent, logWorkflowStep, getActiveStaffProfile } from './auditService.js';
import { normalizeOrderStatus } from '../config/businessRules.js';

// Default fallback products matching the database seed
export const DEFAULT_PRODUCTS = [
  { id: 'shirt', item_code: 'CLOTH-01', name: 'Shirt', category: 'Men', price: 15, base_price: 15, iron_price: 15, wash_price: 25, dry_clean_price: 50, unit: 'piece' },
  { id: 'tshirt', item_code: 'CLOTH-02', name: 'T-Shirt', category: 'Men', price: 12, base_price: 12, iron_price: 12, wash_price: 20, dry_clean_price: 40, unit: 'piece' },
  { id: 'formal_pant', item_code: 'CLOTH-03', name: 'Formal Pant', category: 'Men', price: 20, base_price: 20, iron_price: 20, wash_price: 30, dry_clean_price: 60, unit: 'piece' },
  { id: 'jeans', item_code: 'CLOTH-04', name: 'Jeans', category: 'Men', price: 25, base_price: 25, iron_price: 20, wash_price: 35, dry_clean_price: 70, unit: 'piece' },
  { id: 'saree', item_code: 'CLOTH-05', name: 'Saree', category: 'Women', price: 60, base_price: 60, iron_price: 40, wash_price: 80, dry_clean_price: 150, unit: 'piece' },
  { id: 'towel', item_code: 'CLOTH-06', name: 'Towel', category: 'Home Linen', price: 15, base_price: 15, iron_price: 10, wash_price: 20, dry_clean_price: 35, unit: 'piece' },
  { id: 'chudidar', item_code: 'CLOTH-07', name: 'Chudidar / Salwar', category: 'Women', price: 35, base_price: 35, iron_price: 25, wash_price: 45, dry_clean_price: 90, unit: 'piece' },
  { id: 'kurti', item_code: 'CLOTH-08', name: 'Kurti', category: 'Women', price: 30, base_price: 30, iron_price: 20, wash_price: 40, dry_clean_price: 80, unit: 'piece' },
  { id: 'shorts', item_code: 'CLOTH-09', name: 'Shorts', category: 'Kids', secondaryCategory: 'Men', price: 15, base_price: 15, iron_price: 10, wash_price: 20, dry_clean_price: 35, unit: 'piece' },
  { id: 'bedsheet', item_code: 'CLOTH-10', name: 'Bedsheet', category: 'Home Linen', price: 50, base_price: 50, iron_price: 30, wash_price: 60, dry_clean_price: 110, unit: 'piece' },
  { id: 'pillow_cover', item_code: 'CLOTH-11', name: 'Pillow Cover', category: 'Home Linen', price: 10, base_price: 10, iron_price: 10, wash_price: 15, dry_clean_price: 25, unit: 'piece' },
  { id: 'jacket', item_code: 'CLOTH-12', name: 'Jacket', category: 'Men', secondaryCategory: 'Women', price: 50, base_price: 50, iron_price: 30, wash_price: 60, dry_clean_price: 120, unit: 'piece' },
  { id: 'blazer_suit', item_code: 'CLOTH-13', name: 'Blazer / Suit', category: 'Men', price: 100, base_price: 100, iron_price: 60, wash_price: 120, dry_clean_price: 200, unit: 'piece' },
  { id: 'sweater', item_code: 'CLOTH-14', name: 'Sweater', category: 'Men', secondaryCategory: 'Women', price: 40, base_price: 40, iron_price: 25, wash_price: 50, dry_clean_price: 90, unit: 'piece' },
  { id: 'cap', item_code: 'CLOTH-15', name: 'Cap', category: 'Accessories', secondaryCategory: 'Kids', price: 10, base_price: 10, iron_price: 10, wash_price: 15, dry_clean_price: 25, unit: 'piece' },
  { id: 'curtain', item_code: 'CLOTH-16', name: 'Curtain', category: 'Home Linen', price: 60, base_price: 60, iron_price: 35, wash_price: 70, dry_clean_price: 130, unit: 'piece' },
  { id: 'shoe', item_code: 'CLOTH-17', name: 'Shoe', category: 'Accessories', price: 80, base_price: 80, iron_price: 80, wash_price: 90, dry_clean_price: 140, unit: 'pair' },
];

/**
 * Resolves the appropriate unit rate for a catalog product given a service type.
 */
export function resolveServicePrice(product, serviceType = '') {
  if (!product) return 0;
  const s = String(serviceType || '').toLowerCase();
  if (s.includes('dry')) {
    return Number(product.dry_clean_price || product.base_price || product.price || 0);
  }
  if (s.includes('iron')) {
    return Number(product.iron_price || product.base_price || product.price || 0);
  }
  if (s.includes('wash') || s.includes('laundry') || s.includes('shoe')) {
    return Number(product.wash_price || product.base_price || product.price || 0);
  }
  return Number(product.base_price || product.price || 0);
}

/**
 * Fetches active staff records from Supabase 'washdoor_staff_master'.
 * Returns normalized records: { id, uniqueId, name, zone, city, role, status }.
 */
export async function fetchActiveStaffMaster() {
  if (!isSupabaseConfigured()) {
    return { data: [], error: 'Supabase not configured' };
  }

  try {
    const { data, error } = await supabase
      .from('washdoor_staff_master')
      .select('id, staff_id, staff_name, zone, city, role, status')
      .eq('status', 'Active')
      .order('staff_id', { ascending: true });

    if (error) {
      return { data: [], error: error.message || 'Failed to load active staff records' };
    }

    const normalized = (data || []).map((row) => ({
      id: row.id || row.staff_id,
      uniqueId: row.staff_id,
      name: row.staff_name,
      zone: row.zone || '',
      city: row.city || '',
      role: row.role || 'Counter Staff',
      status: row.status || 'Active',
    }));

    return { data: normalized, error: null };
  } catch (err) {
    return { data: [], error: err?.message || 'Failed to load active staff records' };
  }
}

/**
 * Fetches active pickup & delivery personnel from Supabase 'washdoor_pickup_delivery_master'.
 * Returns normalized records: { id, uniqueId, name, zone, city, phone, vehicleInfo, status }.
 */
export async function fetchActivePickupDeliveryMaster() {
  if (!isSupabaseConfigured()) {
    return { data: [], error: 'Supabase not configured' };
  }

  try {
    const { data, error } = await supabase
      .from('washdoor_pickup_delivery_master')
      .select('id, employee_id, employee_name, zone, city, phone, vehicle_info, status')
      .eq('status', 'Active')
      .order('employee_id', { ascending: true });

    if (error) {
      return { data: [], error: error.message || 'Failed to load active pickup & delivery records' };
    }

    const normalized = (data || []).map((row) => ({
      id: row.id || row.employee_id,
      uniqueId: row.employee_id,
      name: row.employee_name,
      zone: row.zone || '',
      city: row.city || '',
      phone: row.phone || '',
      vehicleInfo: row.vehicle_info || '',
      status: row.status || 'Active',
    }));

    return { data: normalized, error: null };
  } catch (err) {
    return { data: [], error: err?.message || 'Failed to load active pickup & delivery records' };
  }
}

/**
 * Fetches all Staff Master records (Active & Inactive) for UI management.
 */
export async function fetchAllStaffMaster() {
  if (!isSupabaseConfigured()) {
    return { data: [], error: 'Supabase not configured' };
  }
  try {
    const { data, error } = await supabase
      .from('washdoor_staff_master')
      .select('id, staff_id, staff_name, zone, city, phone, role, status, created_at')
      .order('staff_id', { ascending: true });
    if (error) return { data: [], error: error.message || 'Failed to load Staff Master' };
    return {
      data: (data || []).map((row) => ({
        id: row.id,
        uniqueId: row.staff_id,
        name: row.staff_name,
        zone: row.zone || '',
        city: row.city || '',
        phone: row.phone || '',
        role: row.role || 'Counter Staff',
        status: row.status || 'Active',
        created_at: row.created_at,
      })),
      error: null,
    };
  } catch (err) {
    return { data: [], error: err?.message || 'Failed to load Staff Master' };
  }
}

/**
 * Creates or updates a Staff Master record in Supabase 'washdoor_staff_master'.
 */
export async function saveStaffMasterRecord(payload = {}) {
  if (!isSupabaseConfigured()) {
    return { data: null, error: 'Supabase not configured' };
  }
  const staffId = String(payload.uniqueId || payload.staff_id || '').trim().toUpperCase();
  const staffName = String(payload.name || payload.staff_name || '').trim();
  const zone = String(payload.zone || '').trim();
  const status = payload.status === 'Inactive' ? 'Inactive' : 'Active';

  if (!staffId || !staffName || !zone) {
    return { data: null, error: 'Staff ID, Staff Name, and Zone are required.' };
  }

  const cleanPhone = String(payload.phone || '').replace(/\D/g, '');
  if (cleanPhone.length > 0 && cleanPhone.length !== 10) {
    return { data: null, error: 'Phone number must be exactly 10 digits.' };
  }

  const row = {
    staff_id: staffId,
    staff_name: staffName,
    zone,
    city: String(payload.city || '').trim() || null,
    phone: cleanPhone || null,
    role: String(payload.role || 'Counter Staff').trim() || 'Counter Staff',
    status,
  };

  try {
    const query = payload.id
      ? supabase.from('washdoor_staff_master').update(row).eq('id', payload.id).select().single()
      : supabase.from('washdoor_staff_master').insert([row]).select().single();
    const { data, error } = await query;
    if (error) return { data: null, error: error.message || 'Failed to save staff record' };
    return { data, error: null };
  } catch (err) {
    return { data: null, error: err?.message || 'Failed to save staff record' };
  }
}

/**
 * Fetches all Pickup & Delivery Person Master records (Active & Inactive) for UI management.
 */
export async function fetchAllPickupDeliveryMaster() {
  if (!isSupabaseConfigured()) {
    return { data: [], error: 'Supabase not configured' };
  }
  try {
    const { data, error } = await supabase
      .from('washdoor_pickup_delivery_master')
      .select('id, employee_id, employee_name, zone, city, phone, vehicle_info, status, created_at')
      .order('employee_id', { ascending: true });
    if (error) return { data: [], error: error.message || 'Failed to load Pickup & Delivery Master' };
    return {
      data: (data || []).map((row) => ({
        id: row.id,
        uniqueId: row.employee_id,
        name: row.employee_name,
        zone: row.zone || '',
        city: row.city || '',
        phone: row.phone || '',
        vehicleInfo: row.vehicle_info || '',
        status: row.status || 'Active',
        created_at: row.created_at,
      })),
      error: null,
    };
  } catch (err) {
    return { data: [], error: err?.message || 'Failed to load Pickup & Delivery Master' };
  }
}

/**
 * Creates or updates a Pickup & Delivery Person Master record in Supabase 'washdoor_pickup_delivery_master'.
 */
export async function savePickupDeliveryMasterRecord(payload = {}) {
  if (!isSupabaseConfigured()) {
    return { data: null, error: 'Supabase not configured' };
  }
  const employeeId = String(payload.uniqueId || payload.employee_id || '').trim().toUpperCase();
  const employeeName = String(payload.name || payload.employee_name || '').trim();
  const zone = String(payload.zone || '').trim();
  const status = payload.status === 'Inactive' ? 'Inactive' : 'Active';

  if (!employeeId || !employeeName || !zone) {
    return { data: null, error: 'Employee ID, Name, and Zone are required.' };
  }

  const cleanPhone = String(payload.phone || '').replace(/\D/g, '');
  if (cleanPhone.length > 0 && cleanPhone.length !== 10) {
    return { data: null, error: 'Phone number must be exactly 10 digits.' };
  }

  const row = {
    employee_id: employeeId,
    employee_name: employeeName,
    zone,
    city: String(payload.city || '').trim() || null,
    phone: cleanPhone || null,
    vehicle_info: String(payload.vehicleInfo || payload.vehicle_info || '').trim() || null,
    status,
  };

  try {
    const query = payload.id
      ? supabase.from('washdoor_pickup_delivery_master').update(row).eq('id', payload.id).select().single()
      : supabase.from('washdoor_pickup_delivery_master').insert([row]).select().single();
    const { data, error } = await query;
    if (error) return { data: null, error: error.message || 'Failed to save pickup/delivery record' };
    return { data, error: null };
  } catch (err) {
    return { data: null, error: err?.message || 'Failed to save pickup/delivery record' };
  }
}

/**
 * Toggles Active/Inactive status for either Staff Master or Pickup & Delivery Master.
 */
export async function toggleMasterPersonStatus(tableType, id, currentStatus) {
  if (!isSupabaseConfigured() || !id) {
    return { data: null, error: 'Supabase not configured or invalid record ID' };
  }
  const tableName = tableType === 'pickup' ? 'washdoor_pickup_delivery_master' : 'washdoor_staff_master';
  const nextStatus = currentStatus === 'Active' ? 'Inactive' : 'Active';
  try {
    const { data, error } = await supabase
      .from(tableName)
      .update({ status: nextStatus })
      .eq('id', id)
      .select()
      .single();
    if (error) return { data: null, error: error.message || 'Failed to update status' };
    return { data, error: null };
  } catch (err) {
    return { data: null, error: err?.message || 'Failed to update status' };
  }
}

/**
 * Fetches all products from Supabase 'washdoor_products'.
 * Falls back to DEFAULT_PRODUCTS if offline or empty.
 */
export async function getProducts() {
  if (!isSupabaseConfigured()) {
    return { data: DEFAULT_PRODUCTS, error: null };
  }

  try {
    const { data, error } = await supabase
      .from('washdoor_products')
      .select('*')
      .order('display_order', { ascending: true });

    if (error || !data || data.length === 0) {
      if (error) console.warn('getProducts query warning:', error.message);
      return { data: DEFAULT_PRODUCTS, error: null };
    }

    const products = data.map((row) => {
      const fallbackMatch = DEFAULT_PRODUCTS.find(
        (d) => (row.item_code && d.item_code === row.item_code) || d.name.toLowerCase() === String(row.name || '').toLowerCase()
      );
      const slugId = fallbackMatch?.id || String(row.name || row.item_code || '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
      const basePrice = Number(row.base_price ?? fallbackMatch?.base_price ?? 0);
      return {
        id: slugId,
        product_id: row.product_id,
        item_code: row.item_code,
        name: row.name,
        category: row.category || fallbackMatch?.category || 'General',
        secondaryCategory: row.secondary_category || fallbackMatch?.secondaryCategory || undefined,
        price: basePrice,
        base_price: basePrice,
        iron_price: Number(row.iron_price ?? fallbackMatch?.iron_price ?? basePrice),
        wash_price: Number(row.wash_price ?? fallbackMatch?.wash_price ?? basePrice),
        dry_clean_price: Number(row.dry_clean_price ?? fallbackMatch?.dry_clean_price ?? basePrice),
        unit: row.unit || fallbackMatch?.unit || 'piece',
        isActive: row.is_active,
        displayOrder: row.display_order,
      };
    });

    return { data: products, error: null };
  } catch (err) {
    console.warn('getProducts catch fallback:', err);
    return { data: DEFAULT_PRODUCTS, error: null };
  }
}

/**
 * Creates a new product in Supabase 'washdoor_products'.
 */
export async function createProduct(productData) {
  if (!isSupabaseConfigured()) {
    return { data: null, error: new Error('Supabase not configured') };
  }

  try {
    const newCode = productData.item_code || `CLOTH-${Date.now().toString().slice(-4)}`;
    const row = {
      item_code: newCode,
      name: productData.name,
      category: productData.category || 'General',
      secondary_category: productData.secondaryCategory || productData.secondary_category || null,
      base_price: Number(productData.price || productData.base_price || 0),
      unit: productData.unit || 'piece',
      is_active: productData.is_active !== undefined ? Boolean(productData.is_active) : true,
      display_order: Number(productData.display_order || productData.displayOrder || 99),
    };

    const { data, error } = await supabase
      .from('washdoor_products')
      .insert([row])
      .select()
      .single();

    return { data, error };
  } catch (err) {
    return { data: null, error: err };
  }
}

/**
 * Updates a product in Supabase 'washdoor_products'.
 */
export async function updateProduct(identifier, updateData) {
  if (!isSupabaseConfigured()) {
    return { data: null, error: new Error('Supabase not configured') };
  }

  try {
    const updateObj = {
      updated_at: new Date().toISOString(),
    };
    if (updateData.name) updateObj.name = updateData.name;
    if (updateData.category) updateObj.category = updateData.category;
    if (updateData.secondaryCategory !== undefined) updateObj.secondary_category = updateData.secondaryCategory;
    if (updateData.price !== undefined || updateData.base_price !== undefined) {
      updateObj.base_price = Number(updateData.price ?? updateData.base_price);
    }
    if (updateData.unit) updateObj.unit = updateData.unit;
    if (updateData.is_active !== undefined) updateObj.is_active = Boolean(updateData.is_active);
    if (updateData.display_order !== undefined) updateObj.display_order = Number(updateData.display_order);

    let query = supabase.from('washdoor_products').update(updateObj);
    if (String(identifier).match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
      query = query.eq('product_id', identifier);
    } else {
      query = query.eq('item_code', identifier);
    }

    const { data, error } = await query.select();
    return { data, error };
  } catch (err) {
    return { data: null, error: err };
  }
}

/**
 * Deletes a product from Supabase 'washdoor_products'.
 */
export async function deleteProduct(identifier) {
  if (!isSupabaseConfigured()) {
    return { error: new Error('Supabase not configured') };
  }

  try {
    let query = supabase.from('washdoor_products').delete();
    if (String(identifier).match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
      query = query.eq('product_id', identifier);
    } else {
      query = query.eq('item_code', identifier);
    }
    const { error } = await query;
    return { error };
  } catch (err) {
    return { error: err };
  }
}

/**
 * Saves order line items to Supabase 'washdoor_order_items'.
 * Replaces existing items for the order number to ensure synchronization.
 */
export async function saveOrderItems(orderNumber, items = [], workId = null) {
  if (!orderNumber || !isSupabaseConfigured()) {
    return { data: [], error: null };
  }

  const cleanOrderNum = formatOrderId(orderNumber);

  try {
    let resolvedWorkId = workId;
    if (!resolvedWorkId) {
      const resolved = await resolveWorkIdAndNumber(cleanOrderNum);
      resolvedWorkId = resolved?.workId || null;
    }

    // 1. Clear previous items for this order to prevent duplicates
    await supabase
      .from('washdoor_order_items')
      .delete()
      .eq('order_number', cleanOrderNum);

    if (!items || items.length === 0) {
      return { data: [], error: null };
    }

    // 2. Map items to washdoor_order_items schema
    const rows = items.map((item) => {
      const rate = Number(item.rate ?? item.price ?? 0);
      const qty = Math.max(1, parseInt(item.qty || item.quantity || 1, 10));
      const amount = Number(item.amount ?? item.total ?? (rate * qty));

      return {
        order_number: cleanOrderNum,
        ...(resolvedWorkId ? { work_id: resolvedWorkId } : {}),
        product_id: item.product_id || item.item_code || item.id || null,
        product_name: item.product_name || item.name || 'Garment',
        service_type: item.serviceType || item.service_type || item.service || 'Ironing',
        rate: rate,
        quantity: qty,
        line_amount: amount,
        care_instructions: item.careNotes || item.care_instructions || null,
      };
    });

    const { data, error } = await supabase
      .from('washdoor_order_items')
      .insert(rows)
      .select();

    if (error) {
      console.warn('saveOrderItems insert error:', error.message);
      return { data: null, error };
    }

    return { data, error: null };
  } catch (err) {
    console.error('saveOrderItems exception:', err);
    return { data: null, error: err };
  }
}

/**
 * Fetches order line items from Supabase 'washdoor_order_items'.
 */
export async function getOrderItems(orderNumber) {
  if (!orderNumber || !isSupabaseConfigured()) {
    return { data: [], error: null };
  }

  const cleanOrderNum = formatOrderId(orderNumber);

  try {
    const { data, error } = await supabase
      .from('washdoor_order_items')
      .select('*')
      .eq('order_number', cleanOrderNum)
      .order('created_at', { ascending: true });

    if (error) {
      console.warn('getOrderItems query error:', error.message);
      return { data: [], error };
    }

    const items = (data || []).map((row, idx) => ({
      id: row.product_id || `item-${idx + 1}`,
      name: row.product_name,
      serviceType: row.service_type,
      rate: Number(row.rate),
      qty: Number(row.quantity),
      amount: Number(row.line_amount),
      careNotes: row.care_instructions || '',
      tag: `TAG-G${String(idx + 1).padStart(2, '0')}`,
      item_id: row.item_id,
      order_number: row.order_number,
    }));

    return { data: items, error: null };
  } catch (err) {
    console.error('getOrderItems error:', err);
    return { data: [], error: err };
  }
}

/**
 * Resolves a UUID work_id from customer_works by work_number or ID.
 */
async function resolveWorkIdAndNumber(identifier) {
  if (!identifier || !isSupabaseConfigured()) return { workId: null, workNumber: null };
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(identifier);
  if (isUuid) {
    const { data } = await supabase.from('customer_works').select('work_id, work_number').eq('work_id', identifier).maybeSingle();
    return { workId: data?.work_id || identifier, workNumber: data?.work_number || identifier };
  }
  const cleanNum = formatOrderId(identifier);
  const { data } = await supabase.from('customer_works').select('work_id, work_number').eq('work_number', cleanNum).maybeSingle();
  return { workId: data?.work_id || null, workNumber: data?.work_number || cleanNum };
}

/**
 * Synchronizes discrete garment unit cards (washdoor_garment_cards) and
 * care inspections (washdoor_garment_inspections) to normalized database tables.
 */
export const GARMENT_PHOTOS_BUCKET = 'washdoor-garment-photos';

const VALID_PHOTO_TYPES = new Set(['Before_Wash', 'Stain', 'Damage', 'After_Wash', 'After_Press', 'Packed', 'Delivery_Proof']);
const VALID_STAGES = new Set(['Received', 'Sorting', 'Washing', 'Drying', 'Ironing', 'QC', 'Ready', 'Packed', 'Delivered']);
const VALID_SEVERITIES = new Set(['Low', 'Medium', 'High', 'Critical']);
const VALID_ACTION_PLANS = new Set(['Proceed', 'Spot_Treat', 'Customer_Approval', 'Reject']);
const VALID_APPROVALS = new Set(['Not_Required', 'Pending', 'Approved', 'Rejected']);

/**
 * Uploads base64/data-URI photos to Supabase Storage and records/updates metadata in washdoor_garment_photos.
 * Preserves existing persisted photo URLs without creating duplicate DB rows.
 */
export async function uploadGarmentPhotos(workId, workNumber, cardId, photos = [], options = {}) {
  if (!isSupabaseConfigured() || !workId || !Array.isArray(photos) || photos.length === 0) {
    return photos || [];
  }

  const existingByUrl = options.existingByUrl || new Map();
  const inspectionId = options.inspectionId || null;
  const uploadedPhotos = [];
  const rowsToInsert = [];

  for (let idx = 0; idx < photos.length; idx++) {
    const raw = photos[idx];
    if (!raw) continue;
    const p = typeof raw === 'string' ? { url: raw, name: `garment-${idx + 1}.jpg` } : raw;

    let finalUrl = p.url || p.photo_url || '';
    let storagePath = p.storage_path || '';
    const fileName = p.name || p.file_name || `garment-${cardId || workId}-${idx + 1}.jpg`;
    let mimeType = p.mime_type || 'image/jpeg';
    let fileSizeKb = p.file_size_kb || (p.size ? Math.max(1, parseInt(String(p.size), 10) || Math.round(Number(p.size) / 1024)) : null);
    const photoType = VALID_PHOTO_TYPES.has(p.photo_type) ? p.photo_type : 'Before_Wash';
    const caption = p.caption ?? fileName;

    // Upload base64 data URI to Supabase Storage bucket
    if (typeof finalUrl === 'string' && finalUrl.startsWith('data:')) {
      try {
        const match = finalUrl.match(/^data:([^;]+);base64,(.+)$/);
        if (match && supabase?.storage) {
          mimeType = match[1] || 'image/jpeg';
          const ext = mimeType.split('/')[1]?.split('+')[0] || 'jpg';
          const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
          storagePath = `${workNumber || workId}/${cardId || 'order'}/${Date.now()}_${idx}_${safeName}.${ext}`;

          const binaryStr = atob(match[2]);
          const bytes = new Uint8Array(binaryStr.length);
          for (let i = 0; i < binaryStr.length; i++) {
            bytes[i] = binaryStr.charCodeAt(i);
          }
          fileSizeKb = fileSizeKb || Math.max(1, Math.round(bytes.length / 1024));

          const { error: upErr } = await supabase.storage
            .from(GARMENT_PHOTOS_BUCKET)
            .upload(storagePath, bytes, { contentType: mimeType, upsert: true });

          if (!upErr) {
            const { data: pubData } = supabase.storage.from(GARMENT_PHOTOS_BUCKET).getPublicUrl(storagePath);
            if (pubData?.publicUrl) {
              finalUrl = pubData.publicUrl;
            }
          } else {
            console.warn('Garment photo storage upload warning:', upErr.message || upErr);
          }
        }
      } catch (storageErr) {
        console.warn('Garment photo storage upload note:', storageErr?.message || storageErr);
      }
    }

    const updatedPhoto = {
      ...p,
      url: finalUrl,
      photo_url: finalUrl,
      photo_type: photoType,
      caption,
      storage_path: storagePath || p.storage_path || undefined,
    };
    uploadedPhotos.push(updatedPhoto);

    if (finalUrl && !finalUrl.startsWith('data:')) {
      const existingRow = existingByUrl.get(finalUrl);
      if (existingRow) {
        // Update metadata if changed without inserting a duplicate row
        if (existingRow.photo_type !== photoType || existingRow.caption !== caption || existingRow.card_id !== cardId) {
          try {
            await supabase
              .from('washdoor_garment_photos')
              .update({
                card_id: cardId || existingRow.card_id,
                inspection_id: inspectionId || existingRow.inspection_id || null,
                photo_type: photoType,
                caption,
                is_customer_visible: p.is_customer_visible !== false,
              })
              .eq('photo_id', existingRow.photo_id);
          } catch {}
        }
      } else {
        rowsToInsert.push({
          card_id: cardId || null,
          work_id: workId,
          work_number: workNumber || null,
          inspection_id: inspectionId,
          photo_type: photoType,
          storage_bucket: GARMENT_PHOTOS_BUCKET,
          storage_path: storagePath || finalUrl,
          photo_url: finalUrl,
          file_name: fileName,
          file_size_kb: fileSizeKb,
          mime_type: mimeType,
          caption,
          captured_by: p.captured_by || 'POS Inspector',
          is_customer_visible: p.is_customer_visible !== false,
        });
      }
    }
  }

  if (rowsToInsert.length > 0) {
    try {
      const { error } = await supabase.from('washdoor_garment_photos').insert(rowsToInsert);
      if (error && (error.code === 'PGRST204' || String(error.message).includes('column'))) {
        const minimalRows = rowsToInsert.map(({ card_id, work_id, photo_type, storage_path, photo_url, caption, captured_by }) => ({
          card_id,
          work_id,
          photo_type,
          storage_path,
          photo_url,
          caption,
          captured_by,
        }));
        await supabase.from('washdoor_garment_photos').insert(minimalRows);
      }
    } catch (photoErr) {
      console.warn('washdoor_garment_photos insert note:', photoErr?.message || photoErr);
    }
  }

  return uploadedPhotos;
}

export async function syncGarmentCardsAndInspections(workIdentifier, workNumber, items = [], inspections = {}) {
  if (!isSupabaseConfigured() || !workIdentifier) return { success: false };
  try {
    const { workId, workNumber: resolvedNum } = await resolveWorkIdAndNumber(workIdentifier);
    if (!workId) return { success: false, error: 'Could not resolve work_id' };

    const cleanNum = resolvedNum || workNumber || formatOrderId(workIdentifier);

    if (!items || items.length === 0) {
      await supabase.from('washdoor_garment_cards').delete().eq('work_id', workId);
      return { success: true };
    }

    // Fetch existing cards & photos to perform non-destructive upsert without cascading photo loss
    const { data: existingCards } = await supabase
      .from('washdoor_garment_cards')
      .select('card_id, unit_index')
      .eq('work_id', workId);

    const { data: existingPhotos } = await supabase
      .from('washdoor_garment_photos')
      .select('*')
      .eq('work_id', workId);

    const existingPhotosByUrl = new Map();
    const existingPhotosByCardId = new Map();
    (existingPhotos || []).forEach((ph) => {
      if (ph.photo_url) existingPhotosByUrl.set(ph.photo_url, ph);
      if (ph.card_id) {
        if (!existingPhotosByCardId.has(ph.card_id)) existingPhotosByCardId.set(ph.card_id, []);
        existingPhotosByCardId.get(ph.card_id).push(ph);
      }
    });

    // Build 1-based discrete garment cards with complete garment-level fields
    const cardsToUpsert = [];
    const cardPieceLookup = [];
    let globalUnitIndex = 1;

    items.forEach((item) => {
      const qty = Math.max(1, parseInt(item.qty || item.quantity || 1, 10));
      for (let i = 0; i < qty; i++) {
        const pieceNum = i + 1;
        const pieceKey = `${item.id}-piece-${pieceNum}`;
        const altSlug = String(item.name || '').toLowerCase().replace(/[^a-z0-9]+/g, '_');
        const insp = inspections[pieceKey] || inspections[`${altSlug}-piece-${pieceNum}`] || {};
        const tagNum = (insp.tagNumber || insp.garment_tag_number || '').trim() || `${cleanNum}-TAG-${String(globalUnitIndex).padStart(2, '0')}`;
        const stageVal = VALID_STAGES.has(insp.processingStage || insp.processing_stage)
          ? (insp.processingStage || insp.processing_stage)
          : 'Received';
        const hasAck = Boolean(insp.customerAck || insp.customer_ack || insp.customerApproval === 'Approved');

        cardsToUpsert.push({
          work_id: workId,
          work_number: cleanNum,
          unit_index: globalUnitIndex,
          garment_tag_number: tagNum,
          garment_name: insp.name || item.name || item.product_name || 'Garment',
          service_type: item.serviceType || item.service_type || item.service || 'Wash & Steam Press',
          color: insp.color || null,
          brand: insp.brand || null,
          fabric_type: insp.fabric && insp.fabric !== 'Select fabric' ? insp.fabric : null,
          make: insp.make || null,
          stains: insp.stains || null,
          damage: insp.damage || null,
          finish_preference: insp.finishPreference || insp.finish_preference || 'Standard Fold',
          size: insp.size || null,
          garment_condition: insp.condition || insp.garment_condition || 'Good',
          care_instructions: insp.notes || null,
          special_instructions: insp.specialInstructions || item.careNotes || item.care_instructions || null,
          processing_stage: stageVal,
          assigned_staff: insp.assignedStaff || insp.assigned_staff || null,
          qc_passed: Boolean(insp.qcPassed || insp.qc_passed),
          customer_ack: hasAck,
          customer_ack_at: hasAck ? (insp.customer_ack_at || new Date().toISOString()) : null,
          updated_at: new Date().toISOString(),
        });
        cardPieceLookup.push({ unit_index: globalUnitIndex, pieceKey, insp, existingPhotosForOrder: existingPhotos });
        globalUnitIndex++;
      }
    });

    // Remove excess trailing cards if cart quantity decreased
    const maxUnitIndex = cardsToUpsert.length;
    if (Array.isArray(existingCards) && existingCards.some((c) => c.unit_index > maxUnitIndex)) {
      await supabase
        .from('washdoor_garment_cards')
        .delete()
        .eq('work_id', workId)
        .gt('unit_index', maxUnitIndex);
    }

    if (cardsToUpsert.length > 0) {
      let syncedCards = null;
      let cardErr = null;
      const res = await supabase
        .from('washdoor_garment_cards')
        .upsert(cardsToUpsert, { onConflict: 'work_id,unit_index' })
        .select();
      syncedCards = res.data;
      cardErr = res.error;

      if (cardErr && (cardErr.code === 'PGRST204' || String(cardErr.message).includes('column'))) {
        const baseCards = cardsToUpsert.map(({ make, stains, damage, finish_preference, size, assigned_staff, qc_passed, customer_ack, customer_ack_at, ...rest }) => rest);
        const fbRes = await supabase.from('washdoor_garment_cards').upsert(baseCards, { onConflict: 'work_id,unit_index' }).select();
        syncedCards = fbRes.data;
        cardErr = fbRes.error;
      }

      if (cardErr) {
        console.warn('washdoor_garment_cards upsert note:', cardErr.message);
      }

      // Sync inspections & photos for each synced card
      if (syncedCards && syncedCards.length > 0) {
        const cardIds = syncedCards.map((c) => c.card_id).filter(Boolean);
        // Replace inspection log rows for these cards cleanly (without deleting cards or photos)
        if (cardIds.length > 0) {
          try {
            await supabase.from('washdoor_garment_inspections').delete().in('card_id', cardIds);
          } catch {}
        }

        const inspectionsToInsert = [];
        for (const card of syncedCards) {
          const entry = cardPieceLookup.find((c) => c.unit_index === card.unit_index);
          const matchingInsp = entry?.insp || Object.values(inspections).find(
            (p) => (p.piece === card.unit_index || p.unit_index === card.unit_index) || (p.name === card.garment_name && (p.stains || p.notes))
          ) || {};

          const hasExtraCharge = Number(matchingInsp.extraCharge ?? matchingInsp.extra_charge ?? 0) > 0;
          const hasInspectionData = Boolean(
            matchingInsp.stains ||
            matchingInsp.damage ||
            matchingInsp.notes ||
            matchingInsp.defectLocation ||
            matchingInsp.defect_location ||
            hasExtraCharge ||
            (matchingInsp.condition && matchingInsp.condition !== 'Good') ||
            matchingInsp.color ||
            matchingInsp.brand ||
            (matchingInsp.fabric && matchingInsp.fabric !== 'Select fabric') ||
            matchingInsp.make
          );

          let createdInspectionId = null;
          if (hasInspectionData) {
            const severityVal = VALID_SEVERITIES.has(matchingInsp.severity)
              ? matchingInsp.severity
              : (matchingInsp.stains || matchingInsp.damage ? 'Medium' : 'Low');
            const actionVal = VALID_ACTION_PLANS.has(matchingInsp.actionPlan || matchingInsp.action_plan)
              ? (matchingInsp.actionPlan || matchingInsp.action_plan)
              : (matchingInsp.stains || matchingInsp.damage ? 'Spot_Treat' : 'Proceed');
            const approvalVal = VALID_APPROVALS.has(matchingInsp.customerApproval || matchingInsp.customer_approval)
              ? (matchingInsp.customerApproval || matchingInsp.customer_approval)
              : (matchingInsp.customerAck ? 'Approved' : 'Not_Required');

            inspectionsToInsert.push({
              card_id: card.card_id,
              work_id: workId,
              category_name: matchingInsp.stains
                ? 'Stain / Spot Treatment'
                : matchingInsp.damage
                ? 'Damage / Mending'
                : 'Garment Intake Inspection',
              defect_location: matchingInsp.defectLocation || matchingInsp.defect_location || (matchingInsp.stains || matchingInsp.damage ? 'Body' : null),
              severity: severityVal,
              action_plan: actionVal,
              extra_charge: Number(matchingInsp.extraCharge ?? matchingInsp.extra_charge ?? 0) || 0,
              customer_approval: approvalVal,
              customer_notes: matchingInsp.customerNotes || matchingInsp.customer_notes || null,
              inspection_notes: matchingInsp.notes || [matchingInsp.stains, matchingInsp.damage].filter(Boolean).join(' | ') || 'Intake inspection verified',
              inspected_by: matchingInsp.assignedStaff || matchingInsp.assigned_staff || 'QC Staff',
            });
          }

          // Reconcile photos for this card: remove deleted URLs, upload/keep present photos
          const desiredPhotos = Array.isArray(matchingInsp.photos) ? matchingInsp.photos : [];
          const existingForCard = existingPhotosByCardId.get(card.card_id) || [];
          const desiredUrls = new Set(desiredPhotos.map((ph) => (typeof ph === 'string' ? ph : ph?.url || ph?.photo_url)).filter(Boolean));
          const removedIds = existingForCard.filter((ex) => ex.photo_url && !desiredUrls.has(ex.photo_url)).map((ex) => ex.photo_id);
          if (removedIds.length > 0) {
            try {
              await supabase.from('washdoor_garment_photos').delete().in('photo_id', removedIds);
            } catch {}
          }

          if (desiredPhotos.length > 0) {
            await uploadGarmentPhotos(workId, cleanNum, card.card_id, desiredPhotos, {
              existingByUrl: existingPhotosByUrl,
              inspectionId: createdInspectionId,
            });
          }
        }

        if (inspectionsToInsert.length > 0) {
          try {
            await supabase.from('washdoor_garment_inspections').insert(inspectionsToInsert);
          } catch (inspErr) {
            console.warn('washdoor_garment_inspections insert note:', inspErr.message);
          }
        }
      }
    }

    return { success: true };
  } catch (err) {
    console.warn('syncGarmentCardsAndInspections warning:', err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Upserts dedicated Factory / Central Plant Transit & Workshop data into washdoor_factory_orders.
 */
export async function upsertFactoryOrder(workIdentifier, factoryPayload = {}) {
  if (!isSupabaseConfigured() || !workIdentifier) return { success: false };
  try {
    const { workId, workNumber } = await resolveWorkIdAndNumber(workIdentifier);
    if (!workId) return { success: false };

    const row = {
      work_id: workId,
      work_number: workNumber || formatOrderId(workIdentifier),
      routing_type: factoryPayload.routing_type === 'in_store' ? 'in_store' : 'factory',
      store_outlet: factoryPayload.store_outlet || null,
      factory_outlet: factoryPayload.factory_outlet || factoryPayload.factoryPlant || null,
      factory_hub: factoryPayload.factory_hub || factoryPayload.factory_outlet || factoryPayload.factoryPlant || null,
      workshop_station: factoryPayload.workshop_station || null,
      factory_manifest_no: factoryPayload.factory_manifest_no || null,
      dispatch_bag_tag: factoryPayload.dispatch_bag_tag || factoryPayload.dispatchBagTag || null,
      factory_supervisor: factoryPayload.factory_supervisor || null,
      collected_by_staff: factoryPayload.collected_by_staff || null,
      assigned_driver: factoryPayload.assigned_driver || factoryPayload.assignedRider || null,
      driver_phone: factoryPayload.driver_phone || factoryPayload.riderPhone || null,
      vehicle_name: factoryPayload.vehicle_name || factoryPayload.vehicleNo || null,
      mode_of_transport: factoryPayload.mode_of_transport || null,
      route_from_to: factoryPayload.route_from_to || factoryPayload.routeZone || null,
      route_return: factoryPayload.route_return || null,
      weight_kg: factoryPayload.weight_kg !== undefined && factoryPayload.weight_kg !== null ? Number(factoryPayload.weight_kg) : null,
      factory_gate_in: factoryPayload.factory_gate_in || null,
      factory_gate_out: factoryPayload.factory_gate_out || null,
      plant_transit_status: factoryPayload.plant_transit_status || null,
      logistics_status: factoryPayload.logistics_status || factoryPayload.logisticsStatus || null,
      assigned_machine: factoryPayload.assigned_machine || factoryPayload.assignedMachine || null,
      qc_inspector: factoryPayload.qc_inspector || factoryPayload.qcInspector || null,
      rack_shelf_location: factoryPayload.rack_shelf_location || factoryPayload.rackShelfLocation || null,
      driver_instructions: factoryPayload.driver_instructions || factoryPayload.driverInstructions || null,
      factory_remarks: factoryPayload.factory_remarks || null,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('washdoor_factory_orders')
      .upsert(row, { onConflict: 'work_id' })
      .select()
      .maybeSingle();

    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true, data };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/**
 * Persists pickup or delivery schedules into washdoor_pickup_delivery_schedules.
 */
export async function recordPickupDeliverySchedule(workIdentifier, schedulePayload = {}) {
  if (!isSupabaseConfigured() || !workIdentifier) return { success: false };
  try {
    const { workId, workNumber } = await resolveWorkIdAndNumber(workIdentifier);
    if (!workId) return { success: false };

    const row = {
      work_id: workId,
      work_number: workNumber || formatOrderId(workIdentifier),
      schedule_type: schedulePayload.scheduleType === 'Delivery' ? 'Delivery' : 'Pickup',
      scheduled_date: schedulePayload.scheduleDate || new Date().toISOString().split('T')[0],
      slot_label: schedulePayload.scheduleSlot || schedulePayload.deliverySlot || 'Morning (09:00 AM - 12:00 PM)',
      pickup_time_display: schedulePayload.pickupTime || null,
      delivery_slot_display: schedulePayload.deliverySlot || schedulePayload.scheduleSlot || null,
      assigned_driver_name: schedulePayload.assignedDriver || schedulePayload.assignedRider || null,
      assigned_driver_full: schedulePayload.assignedDriverFull || null,
      driver_phone: schedulePayload.riderPhone || null,
      vehicle_number: schedulePayload.vehicleNo || null,
      route_zone: schedulePayload.routeZone || null,
      address_text: schedulePayload.address || null,
      status: schedulePayload.status || 'Scheduled',
      notes: schedulePayload.driverInstructions || schedulePayload.notes || null,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('washdoor_pickup_delivery_schedules')
      .insert([row])
      .select()
      .maybeSingle();

    if (error) return { success: false, error: error.message };
    return { success: true, data };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/**
 * Persists customer additional addresses (1-5) into washdoor_customer_addresses.
 */
export async function saveCustomerAddresses(customerId, addresses = []) {
  if (!isSupabaseConfigured() || !customerId || !Array.isArray(addresses) || addresses.length === 0) {
    return { success: false };
  }
  try {
    const cleanCustId = formatCustomerId(customerId);
    await supabase.from('washdoor_customer_addresses').delete().eq('customer_id', cleanCustId);

    const rows = addresses
      .filter((a) => a && (a.addressLine || a.address_line || a.city))
      .map((a, idx) => ({
        customer_id: cleanCustId,
        address_label: `Additional ${idx + 1}`,
        address_line: a.addressLine || a.address_line || '',
        city: a.city || null,
        pincode: a.pincode && /^[0-9]{6}$/.test(String(a.pincode)) ? String(a.pincode) : null,
        map_link: a.mapLink || a.map_link || null,
        alternate_phone: a.altPhone || a.alternate_phone || null,
        email: a.email || null,
        is_default: idx === 0,
      }));

    if (rows.length === 0) return { success: true };
    const { error } = await supabase.from('washdoor_customer_addresses').insert(rows);
    return { success: !error, error: error?.message || null };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/**
 * Persists a parked/held POS order to washdoor_held_orders.
 */
export async function saveHeldOrder(heldPayload = {}) {
  if (!isSupabaseConfigured()) return { success: false };
  try {
    const row = {
      customer_id: heldPayload.customer_id || null,
      customer_name: heldPayload.customerName || heldPayload.customer_name || 'Walk-In Customer',
      mobile_number: heldPayload.mobile || heldPayload.mobile_number || null,
      cart_items: heldPayload.cart || heldPayload.cart_items || [],
      subtotal: Number(heldPayload.subtotal || 0),
      tax_amount: Number(heldPayload.gstAmount || heldPayload.tax_amount || 0),
      total_amount: Number(heldPayload.grandTotal || heldPayload.total_amount || 0),
      special_notes: heldPayload.specialNotes || heldPayload.special_notes || null,
      held_by: heldPayload.held_by || 'Store Staff',
      status: 'Held',
    };
    const { data, error } = await supabase.from('washdoor_held_orders').insert([row]).select().maybeSingle();
    return { success: !error, data, error: error?.message || null };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/**
 * Inserts an immutable activity log row into washdoor_audit_logs and local audit trail.
 */
export async function recordAuditLogEntry({
  entity_name = 'customer_works',
  record_id,
  work_id = null,
  operation = 'UPDATE',
  old_data = null,
  new_data = null,
  changed_by_name = '',
  changed_by_role = '',
  entity_label = '',
  category = '',
  details = '',
}) {
  const activeStaff = getActiveStaffProfile();
  const staffName = (changed_by_name && String(changed_by_name).trim()) ? String(changed_by_name).trim() : activeStaff.name;
  const staffRole = (changed_by_role && String(changed_by_role).trim()) ? String(changed_by_role).trim() : (activeStaff.role || 'Staff');
  const resolvedCategory = category || (entity_name === 'customers' ? 'customer' : operation === 'DELETE' ? 'system' : 'lifecycle');

  // Always record to local audit trail with exact timestamp & staff details
  logAuditEvent({
    action: `${entity_name === 'customers' ? 'Customer' : 'Order'} ${operation}`,
    module: entity_name === 'customers' ? 'Customer Directory' : 'POS & Order Lifecycle',
    entity: entity_label || new_data?.order_number || new_data?.customer_code || record_id || 'System',
    entityType: entity_name === 'customers' ? 'Customer' : 'Order',
    category: resolvedCategory,
    format: operation,
    actor: staffName,
    actorRole: staffRole,
    details: details || `${operation} on ${entity_name}: ${new_data ? JSON.stringify(new_data) : (entity_label || record_id || '')}`,
    oldValue: old_data,
    newValue: new_data,
    severity: operation === 'DELETE' ? 'danger' : operation === 'INSERT' ? 'success' : 'info',
  });

  if (!isSupabaseConfigured()) return { success: false };
  try {
    let resolvedWorkId = work_id;
    if (!resolvedWorkId && record_id && entity_name !== 'customers') {
      const resolved = await resolveWorkIdAndNumber(record_id);
      resolvedWorkId = resolved.workId;
    }
    const targetId = resolvedWorkId || (
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(record_id || ''))
        ? record_id
        : '00000000-0000-0000-0000-000000000000'
    );

    const { error } = await supabase.from('washdoor_audit_logs').insert([{
      entity_name,
      record_id: targetId,
      work_id: resolvedWorkId || null,
      operation: ['INSERT', 'UPDATE', 'DELETE'].includes(operation) ? operation : 'UPDATE',
      old_data: old_data || null,
      new_data: new_data || null,
      changed_by_name: staffName,
    }]);
    if (error) {
      console.warn('washdoor_audit_logs insert note:', error.message);
    }
    return { success: !error };
  } catch {
    return { success: false };
  }
}

/**
 * Fetches live audit logs & status transitions from washdoor_audit_logs,
 * washdoor_status_history, and washdoor_live_status_actions.
 */
export async function getSupabaseAuditLogs(limit = 150) {
  if (!isSupabaseConfigured()) return { auditLogs: [], statusHistory: [], liveActions: [] };
  try {
    const [audRes, histRes, actRes] = await Promise.all([
      supabase.from('washdoor_audit_logs').select('*').order('created_at', { ascending: false }).limit(limit),
      supabase.from('washdoor_status_history').select('*').order('changed_at', { ascending: false }).limit(limit),
      supabase.from('washdoor_live_status_actions').select('*').order('action_at', { ascending: false }).limit(limit),
    ]);
    return {
      auditLogs: (!audRes.error && Array.isArray(audRes.data)) ? audRes.data : [],
      statusHistory: (!histRes.error && Array.isArray(histRes.data)) ? histRes.data : [],
      liveActions: (!actRes.error && Array.isArray(actRes.data)) ? actRes.data : [],
    };
  } catch {
    return { auditLogs: [], statusHistory: [], liveActions: [] };
  }
}

/**
 * Inserts a double-entry payment transaction into washdoor_payment_ledger.
 */
export async function recordPaymentLedger({
  work_id,
  work_number,
  customer_id,
  amount,
  payment_mode = 'Cash',
  reference_number = null,
  notes = null,
  collected_by = 'Store Staff',
  entry_type = 'Initial_Advance'
}) {
  if (!isSupabaseConfigured() || !amount || Number(amount) <= 0) return { success: false };
  try {
    const { workId, workNumber: resolvedNum } = await resolveWorkIdAndNumber(work_id || work_number);
    if (!workId) return { success: false };

    const cleanMode = ['Cash', 'UPI', 'Card', 'NetBanking', 'Wallet', 'Razorpay', 'PhonePe', 'Credit'].includes(payment_mode)
      ? payment_mode
      : String(payment_mode).toLowerCase().includes('upi') ? 'UPI'
      : String(payment_mode).toLowerCase().includes('card') ? 'Card'
      : 'Cash';

    const { error } = await supabase.from('washdoor_payment_ledger').insert([{
      work_id: workId,
      work_number: resolvedNum || work_number || formatOrderId(work_id),
      customer_id: customer_id || 'Counter Customer',
      entry_type,
      payment_mode: cleanMode,
      amount: Number(amount),
      reference_number: reference_number || null,
      notes: notes || null,
      collected_by: collected_by || 'Store Staff',
    }]);

    if (error) console.warn('washdoor_payment_ledger insert note:', error.message);
    return { success: !error };
  } catch (err) {
    console.warn('recordPaymentLedger warning:', err.message);
    return { success: false };
  }
}

/**
 * Records immutable status history and live status tracking milestone with staff & timestamp attribution.
 */
export async function recordStatusHistory({
  work_id,
  work_number,
  entity_type = 'Order',
  old_status = null,
  new_status,
  changed_by_name = '',
  changed_by_role = '',
  stage = '',
  action_label = '',
  step_name = 'Status Update',
  remarks = null,
}) {
  if (!new_status) return { success: false };
  const activeStaff = getActiveStaffProfile();
  const staffName = (changed_by_name && String(changed_by_name).trim()) ? String(changed_by_name).trim() : activeStaff.name;
  const staffRole = ['Admin', 'Staff', 'Driver', 'QC_Inspector', 'Customer', 'System'].includes(changed_by_role)
    ? changed_by_role
    : (['Admin', 'Staff', 'Driver', 'QC_Inspector', 'Customer', 'System'].includes(activeStaff.role) ? activeStaff.role : 'Staff');

  const resolvedStage = ['Pickup', 'Shop', 'Processing', 'Delivery', 'Payment'].includes(stage)
    ? stage
    : String(new_status).toLowerCase().includes('deliver') ? 'Delivery'
    : String(new_status).toLowerCase().includes('pickup') ? 'Pickup'
    : String(new_status).toLowerCase().includes('paid') ? 'Payment'
    : 'Processing';

  const cleanFallbackNum = work_number || (work_id ? formatOrderId(work_id) : 'Order');

  // Always record workflow step locally for instant UI timeline & staff tracking
  logWorkflowStep({
    workId: work_id,
    orderNumber: cleanFallbackNum,
    stepName: step_name,
    stage: resolvedStage,
    oldStatus: old_status,
    newStatus: new_status,
    staffName,
    staffRole,
    remarks: remarks || `${step_name}: ${old_status ? `${old_status} → ` : ''}${new_status}`,
    entityType: entity_type,
  });

  if (!isSupabaseConfigured()) return { success: false };
  try {
    const { workId, workNumber: resolvedNum } = await resolveWorkIdAndNumber(work_id || work_number);
    if (!workId) return { success: false };

    const cleanNum = resolvedNum || cleanFallbackNum;

    // 1. Insert into washdoor_status_history
    try {
      const { error: shErr } = await supabase.from('washdoor_status_history').insert([{
        work_id: workId,
        work_number: cleanNum,
        entity_type: ['Order', 'Garment_Unit', 'Batch', 'Driver_Assignment'].includes(entity_type) ? entity_type : 'Order',
        old_status: old_status || null,
        new_status: new_status,
        changed_by_name: staffName,
        changed_by_role: staffRole,
        change_source: 'POS_Web',
        remarks: remarks || `Status transitioned to ${new_status}`,
        notify_customer: false,
      }]);
      if (shErr) console.warn('washdoor_status_history insert note:', shErr.message);
    } catch {}

    // 2. Insert into washdoor_live_status_actions
    try {
      const actorType = ['Customer', 'Staff', 'Driver', 'Admin', 'System'].includes(staffRole)
        ? staffRole
        : 'Staff';
      const { error: actErr } = await supabase.from('washdoor_live_status_actions').insert([{
        work_id: workId,
        work_number: cleanNum,
        action_code: String(new_status).toUpperCase().replace(/[^A-Z0-9]+/g, '_').slice(0, 50),
        action_label: action_label || `${step_name}: ${new_status}`,
        stage: resolvedStage,
        actor_type: actorType,
        actor_name: staffName,
        is_customer_visible: true,
      }]);
      if (actErr) console.warn('washdoor_live_status_actions insert note:', actErr.message);
    } catch {}

    return { success: true };
  } catch (err) {
    return { success: false };
  }
}

/**
 * Records customer-specific notes and internal store remarks in washdoor_order_notes.
 */
export async function recordOrderNote({
  work_id,
  work_number,
  note_type = 'Customer_Instruction',
  content,
  author = 'Staff'
}) {
  if (!isSupabaseConfigured() || !content) return { success: false };
  try {
    const { workId } = await resolveWorkIdAndNumber(work_id || work_number);
    if (!workId) return { success: false };

    await supabase.from('washdoor_order_notes').insert([{
      work_id: workId,
      note_type: note_type,
      content: content,
      created_by_name: author || 'Staff',
      is_customer_visible: note_type === 'Customer_Instruction',
    }]);
    return { success: true };
  } catch {
    return { success: false };
  }
}

/**
 * Records dispatched customer messages in washdoor_customer_messages.
 */
export async function recordCustomerMessage({
  work_id,
  work_number,
  customer_id,
  channel = 'WhatsApp',
  category = 'orderReceived',
  recipient_phone,
  message_body,
  sent_by = 'System Bot'
}) {
  if (!isSupabaseConfigured() || !message_body) return { success: false };
  try {
    const { workId } = await resolveWorkIdAndNumber(work_id || work_number);
    if (!workId) return { success: false };

    const cleanChannel = ['WhatsApp', 'SMS', 'Email'].includes(channel) ? channel : 'WhatsApp';

    await supabase.from('washdoor_customer_messages').insert([{
      work_id: workId,
      customer_id: customer_id || 'Counter Customer',
      channel: cleanChannel,
      template_category: category || 'orderReceived',
      recipient_phone: recipient_phone || 'Customer Phone',
      message_body: message_body,
      delivery_status: 'Sent',
      sent_by: sent_by || 'System Bot',
    }]);
    return { success: true };
  } catch {
    return { success: false };
  }
}

// Helper to format any Customer ID into canonical CUST-00001 (5-digit padded) format
export function formatCustomerId(id) {
  if (!id) return 'CUST-00001';
  const str = String(id).trim();
  const match = str.match(/CUST-(\d+)/i) || str.match(/\d+/);
  if (match) {
    const num = parseInt(match[1] || match[0], 10);
    return `CUST-${String(num).padStart(5, '0')}`;
  }
  return str.toUpperCase().startsWith('CUST-') ? str.toUpperCase() : `CUST-${str.toUpperCase()}`;
}

// Helper to format any Order ID into standardized ORD00001 (5-digit zero padded, starting with ORD)
export function formatOrderId(id) {
  if (!id) return 'ORD00001';
  const str = String(id).trim();
  const match = str.match(/(?:ORD|ORDER|WORK)-?(\d+)/i) || str.match(/\d+/);
  if (match) {
    const num = parseInt(match[1] || match[0], 10);
    return `ORD${String(num).padStart(5, '0')}`;
  }
  return str.toUpperCase().startsWith('ORD') ? str.toUpperCase() : `ORD${str.toUpperCase()}`;
}

/**
 * Computes the next unique sequential order identifier starting from ORD00001
 * by querying real existing records in customer_works and washdoor_orders_master.
 */
export async function getNextOrderId() {
  try {
    if (isSupabaseConfigured()) {
      // 1. Try atomic RPC if available in database
      try {
        const { data: rpcVal, error: rpcErr } = await supabase.rpc('get_next_order_number');
        if (!rpcErr && rpcVal) {
          return formatOrderId(rpcVal);
        }
      } catch {}

      let maxNum = 0;
      // 2. Check customer_works table
      try {
        const { data: worksData } = await supabase
          .from('customer_works')
          .select('work_number')
          .order('created_at', { ascending: false })
          .limit(100);

        if (worksData && worksData.length > 0) {
          worksData.forEach((row) => {
            if (row.work_number) {
              const match = String(row.work_number).match(/(?:ORD|ORDER|WORK)-?(\d+)/i) || String(row.work_number).match(/\d+/);
              if (match) {
                const num = parseInt(match[1] || match[0], 10);
                if (num > maxNum) maxNum = num;
              }
            }
          });
        }
      } catch {}

      // 3. Also check washdoor_orders_master if present
      try {
        const { data: masterData } = await supabase
          .from('washdoor_orders_master')
          .select('order_number')
          .order('created_at', { ascending: false })
          .limit(100);

        if (masterData && masterData.length > 0) {
          masterData.forEach((row) => {
            if (row.order_number) {
              const match = String(row.order_number).match(/(?:ORD|ORDER|WORK)-?(\d+)/i) || String(row.order_number).match(/\d+/);
              if (match) {
                const num = parseInt(match[1] || match[0], 10);
                if (num > maxNum) maxNum = num;
              }
            }
          });
        }
      } catch {}

      return `ORD${String(maxNum + 1).padStart(5, '0')}`;
    }
  } catch (err) {
    console.warn('getNextOrderId lookup note:', err);
  }
  return 'ORD00001';
}

export async function getNextCustomerId() {
  try {
    if (isSupabaseConfigured()) {
      let maxNum = 0;

      // 0. Check customers master table
      try {
        const { data: custRows } = await supabase
          .from('customers')
          .select('customer_code, id')
          .order('id', { ascending: false });
        if (custRows && custRows.length > 0) {
          custRows.forEach((row) => {
            const code = row.customer_code || '';
            const match = String(code).match(/(?:CUST-|CUS)(\d+)/i);
            if (match) {
              const num = parseInt(match[1], 10);
              if (num > maxNum) maxNum = num;
            }
          });
        }
      } catch {}

      // 1. Check customer_works
      try {
        const { data: worksData } = await supabase
          .from('customer_works')
          .select('customer_id')
          .order('created_at', { ascending: false });
        if (worksData && worksData.length > 0) {
          worksData.forEach((row) => {
            if (row.customer_id) {
              const match = String(row.customer_id).match(/(?:CUST-|CUS)(\d+)/i);
              if (match) {
                const num = parseInt(match[1], 10);
                if (num > maxNum) maxNum = num;
              }
            }
          });
        }
      } catch (e) {
        // non-blocking fallback
      }

      // 2. Also check washdoor_orders_master
      try {
        const { data: masterData } = await supabase
          .from('washdoor_orders_master')
          .select('customer_id')
          .order('created_at', { ascending: false });
        if (masterData && masterData.length > 0) {
          masterData.forEach((row) => {
            if (row.customer_id) {
              const match = String(row.customer_id).match(/CUST-(\d+)/i);
              if (match) {
                const num = parseInt(match[1], 10);
                if (num > maxNum) maxNum = num;
              }
            }
          });
        }
      } catch (e) {
        // non-blocking fallback
      }

      if (maxNum > 0) {
        return `CUST-${String(maxNum + 1).padStart(5, '0')}`;
      }
    }
  } catch (err) {
    console.warn('getNextCustomerId lookup note:', err);
  }
  return 'CUST-00001';
}

// Convert customer_works row into UI Customer shape
function extractCleanStaffNotes(raw) {
  if (raw === null || raw === undefined) return null;
  if (typeof raw === 'object') {
    const nested = raw.staff_notes || raw.internal_comments || raw.notes;
    return typeof nested === 'string' && nested.trim() ? nested.trim() : null;
  }
  const str = String(raw).trim();
  if (!str) return null;
  if (str.startsWith('{') || str.startsWith('[')) {
    try {
      const parsed = JSON.parse(str);
      if (parsed && typeof parsed === 'object') {
        const nested = parsed.staff_notes || parsed.internal_comments || parsed.notes;
        return typeof nested === 'string' && nested.trim() ? nested.trim() : null;
      }
    } catch {
      const match = str.match(/"staff_notes"\s*:\s*"([^"]*)"/);
      if (match && match[1] && match[1].trim()) return match[1].trim();
      if (str.includes('"factory_hub"') || str.includes('"garment_inspections"')) return null;
    }
  }
  return str;
}

const GENERIC_CUSTOMER_DEFAULTS = {
  customer_classification: 'Regular Customer',
  customerClassification: 'Regular Customer',
  price_list: 'Standard',
  marketing_source: 'Walk-in',
  communication_pref: 'WhatsApp',
  communicationPreference: 'WhatsApp',
  communication_lang: 'English',
  preferred_language: 'English',
  preferredCommunicationLanguage: 'English',
  area_service_zone: 'Zone 1',
  areaServiceZone: 'Zone 1',
  service_zone: 'Zone 1',
  customer_status: 'Active',
  customerStatus: 'Active',
  order_preference: 'Wash & Steam Press',
  orderPreference: 'Wash & Steam Press',
  service_type: 'Wash & Steam Press',
  service_category: 'Wash & Steam Press',
};

function isMeaningfulCustomerField(key, val) {
  if (val === undefined || val === null || val === '') return false;
  if (Array.isArray(val) && val.length === 0) return false;
  if (typeof val === 'number' && val === 0 && (
    key === 'default_discount' ||
    key === 'default_discount_pct' ||
    key === 'defaultDiscountPercentage' ||
    key === 'credit_limit' ||
    key === 'wallet_balance' ||
    key === 'walletBalance'
  )) {
    return false;
  }
  if (typeof val === 'boolean' && val === false && (
    key === 'tax_exemption' ||
    key === 'dnd' ||
    key === 'doNotDisturb'
  )) {
    return false;
  }
  if (GENERIC_CUSTOMER_DEFAULTS[key] && val === GENERIC_CUSTOMER_DEFAULTS[key]) {
    return false;
  }
  return true;
}

function mergeCustomerData(target, source) {
  if (!source) return target;
  if (!target) return { ...source };
  const merged = { ...target };
  Object.keys(source).forEach((key) => {
    const incomingVal = source[key];
    const currentVal = merged[key];
    if (!isMeaningfulCustomerField(key, currentVal) && incomingVal !== undefined && incomingVal !== null && incomingVal !== '') {
      merged[key] = incomingVal;
    }
  });
  return merged;
}

function finalizeCustomerRecord(c) {
  if (!c) return c;
  const cleanInternal = extractCleanStaffNotes(c.internal_comments);
  const cleanNotes = extractCleanStaffNotes(c.notes) || cleanInternal;
  const zone = c.service_zone || c.area_service_zone || c.areaServiceZone || 'Zone 1';
  const lang = c.communication_lang || c.preferred_language || c.preferredCommunicationLanguage || 'English';
  const commPref = c.communication_pref || c.communicationPreference || 'WhatsApp';
  const classification = c.customer_classification || c.customerClassification || 'Regular Customer';
  const status = c.customer_status || c.customerStatus || 'Active';

  return {
    ...c,
    customer_classification: classification,
    customerClassification: classification,
    customer_status: status,
    customerStatus: status,
    price_list: c.price_list || 'Standard',
    service_zone: zone,
    area_service_zone: zone,
    areaServiceZone: zone,
    communication_pref: commPref,
    communicationPreference: commPref,
    communication_lang: lang,
    preferred_language: lang,
    preferredCommunicationLanguage: lang,
    marketing_source: c.marketing_source || 'Walk-in',
    default_discount: c.default_discount ?? c.default_discount_pct ?? 0,
    credit_limit: c.credit_limit ?? 0,
    internal_comments: cleanInternal,
    notes: cleanNotes,
  };
}

function mapMasterCustomerRow(r) {
  if (!r) return null;
  const custId = formatCustomerId(r.customer_code || r.customer_id || (r.id ? formatCustomerId(r.id) : 'CUST-00001'));
  const cleanInternal = extractCleanStaffNotes(r.internal_comments);
  const cleanNotes = extractCleanStaffNotes(r.notes) || cleanInternal;
  return {
    id: custId,
    db_id: r.id,
    customerId: custId,
    customer_id: custId,
    customer_code: r.customer_code || custId,
    customer_name: r.customer_name || null,
    customerName: r.customer_name || null,
    country_code: '+91',
    countryCode: '+91',
    mobile_number: r.mobile_number || null,
    mobileNumber: r.mobile_number || null,
    alternate_phone: r.alternate_phone || null,
    alternatePhoneNumber: r.alternate_phone || null,
    email: r.email || null,
    address: r.address || null,
    streetArea: r.address || null,
    city: r.city || null,
    state: r.state || null,
    pincode: r.pincode || null,
    date_of_birth: r.date_of_birth || null,
    anniversary_date: r.anniversary_date || null,
    map_link: r.map_link || null,
    gst_number: r.gst_number || null,
    gstNumber: r.gst_number || null,
    company_name: r.company_name || null,
    companyName: r.company_name || null,
    tax_exemption: r.tax_exemption !== undefined ? Boolean(r.tax_exemption) : undefined,
    customer_classification: r.customer_classification || null,
    customerClassification: r.customer_classification || null,
    customer_status: r.customer_status || null,
    customerStatus: r.customer_status || null,
    price_list: r.price_list || null,
    service_zone: r.service_zone || null,
    area_service_zone: r.service_zone || null,
    areaServiceZone: r.service_zone || null,
    credit_limit: r.credit_limit !== undefined && r.credit_limit !== null ? Number(r.credit_limit) : null,
    wallet_balance: r.wallet_balance !== undefined && r.wallet_balance !== null ? Number(r.wallet_balance) : null,
    default_discount: r.default_discount !== undefined && r.default_discount !== null ? Number(r.default_discount) : null,
    communication_pref: r.communication_pref || null,
    communicationPreference: r.communication_pref || null,
    communication_lang: r.preferred_language || null,
    preferred_language: r.preferred_language || null,
    preferredCommunicationLanguage: r.preferred_language || null,
    dnd: r.dnd !== undefined ? Boolean(r.dnd) : undefined,
    internal_comments: cleanInternal || cleanNotes,
    notes: cleanNotes,
    tier: r.tier || null,
    membership_id: r.membership_id || null,
    membershipId: r.membership_id || null,
    marketing_source: r.marketing_source || null,
    referral_code: r.referral_code || null,
    additional_addresses: [],
    additionalAddresses: [],
    created_at: r.created_at || null,
    updated_at: r.updated_at || null,
  };
}

export function mapCustomerWorkRow(row) {
  if (!row) return null;
  const custId = formatCustomerId(row.customer_id || 'CUST-00001');

  // Extract customer profile stored in items array (avoid treating garment line items as profile metadata)
  const items = Array.isArray(row.items) ? row.items : [];
  const profileItem = items.find((i) => i && (
    i.type === 'customer_registration' ||
    i.type === 'customer_profile' ||
    i.company_name !== undefined ||
    i.date_of_birth !== undefined ||
    i.price_list !== undefined ||
    i.gst_number !== undefined
  )) || {};

  const cleanInternal =
    extractCleanStaffNotes(profileItem.internal_comments) ||
    extractCleanStaffNotes(row.internal_notes) ||
    null;
  const cleanNotes =
    extractCleanStaffNotes(row.special_instructions) ||
    cleanInternal ||
    null;
  const zone = profileItem.area_service_zone || profileItem.service_zone || null;
  const lang = profileItem.preferred_language || profileItem.communication_lang || null;
  const commPref = profileItem.communication_pref || null;

  return {
    id: custId,
    customerId: custId,
    customer_id: custId,
    customer_code: custId,
    customer_name: row.customer_name || '',
    customerName: row.customer_name || '',
    country_code: '+91',
    countryCode: '+91',
    mobile_number: row.mobile_number || '',
    mobileNumber: row.mobile_number || '',
    alternate_phone: row.alternate_phone || null,
    alternatePhoneNumber: row.alternate_phone || null,
    email: row.email || null,
    address: row.delivery_address || '',
    streetArea: row.delivery_address || '',
    city: profileItem.city || '',
    pincode: profileItem.pincode || null,
    additional_addresses: Array.isArray(profileItem.additional_addresses) ? profileItem.additional_addresses : [],
    additionalAddresses: Array.isArray(profileItem.additional_addresses) ? profileItem.additional_addresses : [],
    company_name: profileItem.company_name || null,
    companyName: profileItem.company_name || null,
    gst_number: profileItem.gst_number || null,
    gstNumber: profileItem.gst_number || null,
    service_zone: zone || 'Zone 1',
    area_service_zone: zone || 'Zone 1',
    areaServiceZone: zone || 'Zone 1',
    tax_exemption: Boolean(profileItem.tax_exemption),
    date_of_birth: profileItem.date_of_birth || null,
    anniversary_date: profileItem.anniversary_date || null,
    special_occasion: profileItem.special_occasion || null,
    special_occasion_date: profileItem.special_occasion_date || null,
    map_link: profileItem.map_link || null,
    communication_pref: commPref || 'WhatsApp',
    communicationPreference: commPref || 'WhatsApp',
    communication_lang: lang || 'English',
    preferred_language: lang || 'English',
    preferredCommunicationLanguage: lang || 'English',
    dnd: profileItem.dnd !== undefined ? Boolean(profileItem.dnd) : false,
    internal_comments: cleanInternal,
    notes: cleanNotes,
    order_preference: row.service_type || profileItem.order_preference || 'Wash & Steam Press',
    orderPreference: row.service_type || profileItem.order_preference || 'Wash & Steam Press',
    service_type: row.service_type || 'Wash & Steam Press',
    service_category: row.service_type || 'Wash & Steam Press',
    price_list: profileItem.price_list || 'Standard',
    customer_classification: profileItem.customer_classification || 'Regular Customer',
    customerClassification: profileItem.customer_classification || 'Regular Customer',
    customer_status: profileItem.customer_status || 'Active',
    tier: profileItem.tier || 'SILVER',
    membership_id: profileItem.membership_id || null,
    membershipId: profileItem.membership_id || null,
    default_discount: profileItem.default_discount || 0,
    credit_limit: profileItem.credit_limit || 0,
    wallet_balance: 0,
    referral_code: profileItem.referral_code || null,
    marketing_source: profileItem.marketing_source || 'Walk-in',
    work_id: row.work_id,
    work_number: row.work_number,
    work_status: row.work_status || 'Received',
    total_amount: Number(row.total_amount) || 0,
    created_at: row.created_at,
  };
}

// Convert washdoor_orders_master row into UI shape
function mapMasterRowToOrder(row) {
  const orderNum = row.order_number ? formatOrderId(row.order_number) : (row.order_id ? formatOrderId(row.order_id) : 'ORD00001');
  const custId = formatCustomerId(row.customer_id);

  const rawStatus = row.order_status || 'Order in Progress';
  let progress = 25;
  if (rawStatus === 'Ready for Billing' || row.customer_history?.progress === 50) {
    progress = 50;
  } else if (
    rawStatus === 'Product Status' ||
    rawStatus === 'Completed' ||
    rawStatus === 'Washing Completed' ||
    row.customer_history?.progress >= 90
  ) {
    progress = 100;
  } else {
    progress = 25;
  }

  return {
    id: orderNum,
    order_id: row.order_id || orderNum,
    order_number: orderNum,
    order_type: row.order_type || 'walk-in',
    preference: row.service_category || 'Standard',
    preference_notes: row.order_notes,
    status: rawStatus,
    progress: progress,
    total_amount: Number(row.total_amount || 0),
    tax_exemption: Boolean(row.tax_exemption),
    item_count: row.customer_history?.items && row.customer_history.items.length > 0
      ? row.customer_history.items.reduce((s, i) => s + (Number(i.qty) || 1), 0)
      : (row.item_count !== undefined && row.item_count !== null ? Number(row.item_count) : 0),
    items: row.customer_history?.items || [],
    customer_history: row.customer_history || {},
    created_at: row.created_at,
    customer: {
      id: custId,
      customerId: custId,
      customer_code: custId,
      customer_name: row.customer_name,
      customerName: row.customer_name,
      country_code: '+91',
      countryCode: '+91',
      mobile_number: row.mobile_number,
      mobileNumber: row.mobile_number,
      address: row.street_area,
      streetArea: row.street_area,
      city: row.city || null,
      pincode: row.pincode,
      area_service_zone: row.area_service_zone || null,
      areaServiceZone: row.area_service_zone || null,
      communication_pref: row.communication_preference || null,
      communicationPreference: row.communication_preference || null,
      preferredCommunicationLanguage: row.preferred_language || null,
      dnd: Boolean(row.do_not_disturb),
      doNotDisturb: Boolean(row.do_not_disturb),
      default_discount: Number(row.default_discount_pct || 0),
      defaultDiscountPercentage: Number(row.default_discount_pct || 0),
      tier: row.tier || null,
      wallet_balance: Number(row.wallet_balance || 0),
      walletBalance: Number(row.wallet_balance || 0),
      email: row.email,
      alternate_phone: row.alternate_phone,
      company_name: row.company_name,
      gst_number: row.gst_number,
      tax_exemption: Boolean(row.tax_exemption),
      map_link: row.map_link,
      date_of_birth: row.date_of_birth,
      anniversary_date: row.anniversary_date,
      special_occasion: row.special_occasion,
      special_occasion_date: row.special_occasion_date,
      price_list: row.price_list,
      credit_limit: row.credit_limit,
      referral_code: row.referral_code,
      marketing_source: row.marketing_source,
      customer_status: row.customer_status || 'Active',
      service_zone: row.area_service_zone,
      membership_id: row.membership_id,
      customer_classification: row.customer_classification || 'Regular Customer',
      customerClassification: row.customer_classification || 'Regular Customer',
      internal_comments: row.internal_comments,
      notes: row.order_notes || row.internal_comments,
      service_category: row.service_category || 'Wash & Steam Press',
      order_preference: row.service_category || 'Wash & Steam Press',
      additional_addresses: row.customer_history?.additional_addresses || [],
      additionalAddresses: row.customer_history?.additional_addresses || [],
    },
  };
}

// Convert normalized customers table row into UI Customer shape
export function mapCustomersTableRow(r) {
  if (!r) return null;
  const custId = formatCustomerId(r.customer_code || r.customer_id || (r.id ? formatCustomerId(r.id) : 'CUST-00001'));
  const cleanInternal = extractCleanStaffNotes(r.internal_comments);
  const cleanNotes = extractCleanStaffNotes(r.notes) || cleanInternal;
  return {
    id: custId,
    db_id: r.id,
    customerId: custId,
    customer_id: custId,
    customer_code: r.customer_code || custId,
    customer_name: r.customer_name || '',
    customerName: r.customer_name || '',
    country_code: '+91',
    countryCode: '+91',
    mobile_number: r.mobile_number || '',
    mobileNumber: r.mobile_number || '',
    alternate_phone: r.alternate_phone || null,
    alternatePhoneNumber: r.alternate_phone || null,
    email: r.email || null,
    address: r.address || '',
    streetArea: r.address || '',
    city: r.city || '',
    state: r.state || null,
    pincode: r.pincode || null,
    date_of_birth: r.date_of_birth || null,
    anniversary_date: r.anniversary_date || null,
    map_link: r.map_link || null,
    gst_number: r.gst_number || null,
    gstNumber: r.gst_number || null,
    company_name: r.company_name || null,
    companyName: r.company_name || null,
    tax_exemption: Boolean(r.tax_exemption),
    customer_classification: r.customer_classification || 'Regular Customer',
    customerClassification: r.customer_classification || 'Regular Customer',
    customer_status: r.customer_status || 'Active',
    price_list: r.price_list || 'Standard',
    area_service_zone: r.service_zone || 'Zone 1',
    areaServiceZone: r.service_zone || 'Zone 1',
    service_zone: r.service_zone || 'Zone 1',
    credit_limit: Number(r.credit_limit || 0),
    wallet_balance: Number(r.wallet_balance || 0),
    default_discount: Number(r.default_discount || 0),
    communication_pref: r.communication_pref || 'WhatsApp',
    communicationPreference: r.communication_pref || 'WhatsApp',
    communication_lang: r.preferred_language || 'English',
    preferredCommunicationLanguage: r.preferred_language || 'English',
    preferred_language: r.preferred_language || 'English',
    dnd: Boolean(r.dnd),
    internal_comments: cleanInternal || cleanNotes,
    notes: cleanNotes,
    tier: r.tier || null,
    membership_id: r.membership_id || null,
    membershipId: r.membership_id || null,
    marketing_source: r.marketing_source || 'Walk-in',
    referral_code: r.referral_code || null,
    additional_addresses: [],
    additionalAddresses: [],
    created_at: r.created_at,
    updated_at: r.updated_at,
  };
}

function createCustomerMerger() {
  const orderedKeys = [];
  const byKey = new Map();
  const keyByPhone = new Map();

  const normalizePhoneKey = (phone) => {
    const digits = String(phone || '').replace(/\D/g, '');
    return digits.length >= 10 ? digits.slice(-10) : '';
  };

  return {
    add(c) {
      if (!c) return;
      const rawId = c.customer_id || c.customerId || c.customer_code || c.id;
      const phoneKey = normalizePhoneKey(c.mobile_number || c.mobileNumber);
      const existingKey =
        (rawId && byKey.has(rawId) ? rawId : null) ||
        (phoneKey && keyByPhone.has(phoneKey) ? keyByPhone.get(phoneKey) : null);

      if (existingKey) {
        byKey.set(existingKey, mergeCustomerData(byKey.get(existingKey), c));
        if (phoneKey && !keyByPhone.has(phoneKey)) keyByPhone.set(phoneKey, existingKey);
      } else {
        const key = rawId || phoneKey;
        if (!key) return;
        orderedKeys.push(key);
        byKey.set(key, { ...c });
        if (phoneKey) keyByPhone.set(phoneKey, key);
      }
    },
    toList() {
      return orderedKeys.map((k) => finalizeCustomerRecord(byKey.get(k)));
    },
  };
}

/**
 * Searches real customer records in Supabase customers, customer_works, and washdoor_orders_master,
 * merging profile fields across rows so order records never mask full customer master details.
 */
export async function searchCustomers(query) {
  if (!query || !query.trim()) {
    return getAllCustomers();
  }

  const q = query.trim().toLowerCase();

  if (!isSupabaseConfigured()) {
    return { data: [], error: null };
  }

  try {
    const merger = createCustomerMerger();

    // Search all three tables in parallel while preserving master merge priority
    const [custResult, worksResult, masterResult] = await Promise.all([
      supabase
        .from('customers')
        .select('*')
        .or(`customer_name.ilike.%${q}%,mobile_number.ilike.%${q}%,address.ilike.%${q}%,customer_code.ilike.%${q}%`)
        .order('created_at', { ascending: false })
        .limit(30)
        .then((res) => res)
        .catch(() => ({ data: null })),
      supabase
        .from('customer_works')
        .select('*')
        .or(`customer_name.ilike.%${q}%,mobile_number.ilike.%${q}%,delivery_address.ilike.%${q}%,customer_id.ilike.%${q}%`)
        .order('created_at', { ascending: false })
        .limit(30)
        .then((res) => res)
        .catch((wErr) => {
          console.warn('customer_works search note:', wErr);
          return { data: null };
        }),
      supabase
        .from('washdoor_orders_master')
        .select('*')
        .or(`customer_name.ilike.%${q}%,mobile_number.ilike.%${q}%,street_area.ilike.%${q}%,city.ilike.%${q}%,customer_id.ilike.%${q}%`)
        .order('created_at', { ascending: false })
        .limit(30)
        .then((res) => res)
        .catch((mErr) => {
          console.warn('washdoor_orders_master search note:', mErr);
          return { data: null };
        }),
    ]);

    if (custResult?.data && custResult.data.length > 0) {
      custResult.data.forEach((r) => merger.add(mapMasterCustomerRow(r)));
    }
    if (!worksResult?.error && worksResult?.data) {
      worksResult.data.forEach((r) => merger.add(mapCustomerWorkRow(r)));
    }
    if (!masterResult?.error && masterResult?.data) {
      masterResult.data.forEach((r) => merger.add(mapMasterRowToOrder(r).customer));
    }

    return { data: merger.toList(), error: null };
  } catch (err) {
    return { data: [], error: err };
  }
}

// Convert customer_works row into UI Order shape with full fidelity
function mapCustomerWorkRowToOrder(row, factoryRow = null, scheduleRow = null, garmentBundle = null) {
  const orderNum = row.work_number ? formatOrderId(row.work_number) : (row.work_id ? `ORD${String(row.work_id).slice(-5)}` : 'ORD00001');
  const custId = formatCustomerId(row.customer_id || 'CUST-00001');
  const rawStatus = row.work_status || 'order recived';
  let internalNotesObj = {};
  let garmentInspections = {};
  if (row.internal_notes) {
    try {
      const parsed = typeof row.internal_notes === 'string' ? JSON.parse(row.internal_notes) : row.internal_notes;
      if (parsed && typeof parsed === 'object') {
        internalNotesObj = parsed;
        if (parsed.garment_inspections && typeof parsed.garment_inspections === 'object') {
          garmentInspections = { ...parsed.garment_inspections };
        }
      }
    } catch {}
  }
  const resolvedStatusRaw = internalNotesObj.order_status || row.order_status || rawStatus;
  const displayStatus = normalizeOrderStatus(resolvedStatusRaw);
  const propertyStatus = internalNotesObj.property_status || (row.priority === 'Yes' ? 'Yes' : 'No') || (row.property_status === 'Yes' ? 'Yes' : 'No') || 'No';

  // Prefer customer_works.items, or reconstruct from washdoor_order_items; merge per-item careNotes
  const dbOrderItems = Array.isArray(garmentBundle?.orderItems) ? garmentBundle.orderItems : [];
  let items = Array.isArray(row.items) && row.items.length > 0
    ? row.items.map((it, idx) => {
        const matchedDb = dbOrderItems[idx];
        return {
          ...it,
          careNotes: it.careNotes || it.care_instructions || matchedDb?.care_instructions || '',
        };
      })
    : dbOrderItems.map((it, idx) => ({
        id: it.product_id || `item-${idx + 1}`,
        name: it.product_name,
        serviceType: it.service_type,
        service: it.service_type,
        rate: Number(it.rate || 0),
        qty: Number(it.quantity || 1),
        amount: Number(it.line_amount || 0),
        careNotes: it.care_instructions || '',
      }));

  const itemCount = row.total_pieces !== undefined && row.total_pieces !== null ? Number(row.total_pieces) : (items.length || 1);
  if (Object.keys(garmentInspections).length === 0 && Array.isArray(items)) {
    items.forEach((it) => {
      if (it.inspections && Array.isArray(it.inspections)) {
        it.inspections.forEach((insp) => {
          if (insp.id) garmentInspections[insp.id] = insp;
        });
      }
    });
  }

  // Hydrate & overlay normalized garment cards, inspections & photos from relational Supabase tables
  const dbCards = Array.isArray(garmentBundle?.cards) ? [...garmentBundle.cards].sort((a, b) => (a.unit_index || 0) - (b.unit_index || 0)) : [];
  const dbInspectionsByCard = {};
  (garmentBundle?.inspections || []).forEach((ins) => {
    if (ins.card_id && !dbInspectionsByCard[ins.card_id]) {
      dbInspectionsByCard[ins.card_id] = ins;
    }
  });
  const dbPhotosByCard = {};
  (garmentBundle?.photos || []).forEach((ph) => {
    const key = ph.card_id || 'order';
    if (!dbPhotosByCard[key]) dbPhotosByCard[key] = [];
    dbPhotosByCard[key].push({
      id: ph.photo_id,
      photo_id: ph.photo_id,
      name: ph.file_name || ph.caption || 'Garment Photo',
      caption: ph.caption || '',
      photo_type: ph.photo_type || 'Before_Wash',
      url: ph.photo_url,
      photo_url: ph.photo_url,
      storage_path: ph.storage_path,
      file_size_kb: ph.file_size_kb,
      mime_type: ph.mime_type,
      is_customer_visible: ph.is_customer_visible,
    });
  });

  if (dbCards.length > 0) {
    // Build unit_index -> cart piece key lookup
    const unitKeyMap = {};
    let uIdx = 1;
    items.forEach((it) => {
      const q = Math.max(1, parseInt(it.qty || it.quantity || 1, 10));
      for (let i = 0; i < q; i++) {
        unitKeyMap[uIdx] = {
          pieceId: `${it.id}-piece-${i + 1}`,
          cartItemId: it.id,
          productId: it.productId || it.id,
          piece: i + 1,
        };
        uIdx++;
      }
    });

    dbCards.forEach((card) => {
      const mapping = unitKeyMap[card.unit_index];
      const slugFallback = String(card.garment_name || 'garment').toLowerCase().replace(/[^a-z0-9]+/g, '_');
      const pieceId = mapping?.pieceId || `${slugFallback}-piece-${card.unit_index}`;
      const existing = garmentInspections[pieceId] || {};
      const insRow = dbInspectionsByCard[card.card_id] || {};
      const cardPhotos = dbPhotosByCard[card.card_id] || [];

      garmentInspections[pieceId] = {
        ...existing,
        id: pieceId,
        card_id: card.card_id,
        cartItemId: mapping?.cartItemId || existing.cartItemId || slugFallback,
        productId: mapping?.productId || existing.productId || slugFallback,
        piece: mapping?.piece || existing.piece || card.unit_index,
        unit_index: card.unit_index,
        name: card.garment_name || existing.name || 'Garment',
        tagNumber: card.garment_tag_number || existing.tagNumber || '',
        color: card.color ?? existing.color ?? '',
        brand: card.brand ?? existing.brand ?? '',
        fabric: card.fabric_type || existing.fabric || 'Select fabric',
        make: card.make ?? existing.make ?? '',
        stains: card.stains ?? existing.stains ?? '',
        damage: card.damage ?? existing.damage ?? '',
        condition: card.garment_condition || existing.condition || 'Good',
        finishPreference: card.finish_preference || existing.finishPreference || 'Standard Fold',
        size: card.size ?? existing.size ?? '',
        specialInstructions: card.special_instructions ?? existing.specialInstructions ?? '',
        processingStage: card.processing_stage || existing.processingStage || 'Received',
        assignedStaff: card.assigned_staff ?? existing.assignedStaff ?? '',
        qcPassed: Boolean(card.qc_passed ?? existing.qcPassed),
        customerAck: Boolean(card.customer_ack ?? existing.customerAck),
        defectLocation: insRow.defect_location ?? existing.defectLocation ?? '',
        severity: insRow.severity || existing.severity || 'Low',
        actionPlan: insRow.action_plan || existing.actionPlan || 'Proceed',
        extraCharge: Number(insRow.extra_charge ?? existing.extraCharge ?? 0),
        customerApproval: insRow.customer_approval || existing.customerApproval || 'Not_Required',
        customerNotes: insRow.customer_notes ?? existing.customerNotes ?? '',
        notes: card.care_instructions ?? insRow.inspection_notes ?? existing.notes ?? '',
        photos: cardPhotos.length > 0 ? cardPhotos : (existing.photos || []),
      };
    });
  }

  const allPhotos = Object.values(garmentInspections).flatMap((p) => p.photos || []);

  const totalAmount = Number(row.total_amount || 0);
  const advancePaid = Number(row.advance_paid || 0);
  const subtotal = Number(row.subtotal !== undefined && row.subtotal !== null ? row.subtotal : (totalAmount ? +(totalAmount / 1.05).toFixed(2) : 0));
  const discountAmount = Number(row.discount_amount || 0);
  const taxAmount = Number(row.tax_amount !== undefined && row.tax_amount !== null ? row.tax_amount : +(subtotal * 0.05).toFixed(2));
  const balanceDue = row.balance_due !== undefined && row.balance_due !== null ? Number(row.balance_due) : Math.max(0, totalAmount - advancePaid);

  const formattedExpectedDelivery = internalNotesObj.expected_delivery_display || (row.target_delivery_date ? new Date(row.target_delivery_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '');

  const factoryData = factoryRow || {};
  const schedData = scheduleRow || {};

  return {
    id: orderNum,
    order_id: row.work_id || orderNum,
    order_number: orderNum,
    work_number: row.work_number || orderNum,
    work_id: row.work_id,
    order_type: row.intake_method ? row.intake_method : 'Walk-in',
    intake_method: row.intake_method || 'Walk-In',
    customer_name: row.customer_name || '',
    mobile_number: row.mobile_number || '',
    alternate_phone: row.alternate_phone || '',
    email: row.email || '',
    address: row.delivery_address || '',
    delivery_address: row.delivery_address || '',
    service_category: row.service_type || 'Wash & Steam Press',
    service_type: row.service_type || 'Wash & Steam Press',
    preference: row.service_type || 'Wash & Steam Press',
    preference_notes: row.special_instructions || '',
    order_notes: row.special_instructions || '',
    special_instructions: row.special_instructions || '',
    comments: row.special_instructions || '',
    order_status: displayStatus,
    status: displayStatus,
    property_status: propertyStatus,
    priority: propertyStatus === 'Yes' ? 'Yes' : (row.priority || 'Normal'),
    progress: displayStatus === 'ready for delvier' ? 75 : (displayStatus === 'dfa' || displayStatus === 'dfa -card' || displayStatus === 'today delivery') ? 100 : 25,
    subtotal: subtotal,
    discount: discountAmount,
    discount_amount: discountAmount,
    discount_pct: Number(row.discount_pct || 0),
    taxable_amount: Number(row.taxable_amount ?? Math.max(0, subtotal - discountAmount)),
    gst_percentage: Number(row.gst_percentage ?? (row.tax_exemption ? 0 : 5)),
    cgst_amount: Number(row.cgst_amount ?? +(taxAmount / 2).toFixed(2)),
    sgst_amount: Number(row.sgst_amount ?? +(taxAmount / 2).toFixed(2)),
    igst_amount: Number(row.igst_amount ?? 0),
    tax: taxAmount,
    tax_amount: taxAmount,
    total_amount: totalAmount,
    grand_total: totalAmount,
    advance_paid: advancePaid,
    balance_due: balanceDue,
    payment_status: row.payment_status || (balanceDue <= 0 ? 'Paid' : advancePaid > 0 ? 'Partially Paid' : 'Unpaid'),
    payment_method: internalNotesObj.payment_method_display || row.payment_method || 'Cash',
    payment: {
      status: row.payment_status || (balanceDue <= 0 ? 'Paid' : advancePaid > 0 ? 'Partially Paid' : 'Unpaid'),
      mode: internalNotesObj.payment_method_display || row.payment_method || 'Cash',
      advancePaid: advancePaid,
      balanceDue: balanceDue,
      subtotal: subtotal,
      tax: taxAmount,
      discount: discountAmount,
      grandTotal: totalAmount,
    },
    item_count: itemCount,
    total_pieces: itemCount,
    items: items,
    garment_inspections: garmentInspections,
    inspections: garmentInspections,
    photos: allPhotos,
    customer_history: { items: items },
    intake_date: row.intake_date || row.created_at,
    created_at: row.created_at,
    updated_at: row.updated_at || row.created_at,
    created_by: row.created_by || row.created_by_name || 'POS Counter',
    updated_by: row.updated_by || row.updated_by_name || 'POS Counter',
    target_delivery_date: row.target_delivery_date,
    scheduled_pickup_at: row.scheduled_pickup_at || internalNotesObj.scheduled_pickup_at || null,
    scheduled_delivery_at: row.scheduled_delivery_at || internalNotesObj.scheduled_delivery_at || null,
    delivery_date: formattedExpectedDelivery,
    expected_delivery: formattedExpectedDelivery,
    assigned_staff: row.assigned_staff || internalNotesObj.attend_staff_name || factoryData.collected_by_staff || '',
    attend_staff_id: row.attend_staff_id || internalNotesObj.attend_staff_id || null,
    attend_staff_name: row.attend_staff_name || internalNotesObj.attend_staff_name || row.assigned_staff || '',
    assigned_pickup_person_id: row.assigned_pickup_person_id || internalNotesObj.assigned_pickup_person_id || null,
    assigned_pickup_delivery_person: row.assigned_pickup_delivery_person || internalNotesObj.assigned_pickup_delivery_person || factoryData.assigned_driver || schedData.assigned_driver_name || internalNotesObj.assigned_driver || '',
    assigned_driver: internalNotesObj.assigned_pickup_delivery_person || factoryData.assigned_driver || schedData.assigned_driver_name || internalNotesObj.assigned_driver || row.assigned_staff || '',
    assigned_driver_full: schedData.assigned_driver_full || internalNotesObj.assigned_driver_full || internalNotesObj.assigned_pickup_delivery_person || row.assigned_staff || '',
    status_updated_at: internalNotesObj.status_updated_at || row.updated_at || row.created_at || null,
    status_updated_by: internalNotesObj.status_updated_by || internalNotesObj.attend_staff_name || row.assigned_staff || 'Counter Staff',
    activity_history: Array.isArray(internalNotesObj.activity_history) ? internalNotesObj.activity_history : [],
    logs: Array.isArray(internalNotesObj.activity_history) ? internalNotesObj.activity_history : [],
    payment_received_at: internalNotesObj.payment_received_at || (advancePaid > 0 ? (row.updated_at || row.created_at) : null),
    payment_received_by: internalNotesObj.payment_received_by || internalNotesObj.attend_staff_name || row.assigned_staff || 'Counter Staff',
    collection_at: internalNotesObj.collection_at || row.delivered_at || null,
    collected_by_person: internalNotesObj.collected_by_person || internalNotesObj.collected_by_staff || factoryData.collected_by_staff || '',
    assigned_for_pickup: Boolean(internalNotesObj.assigned_for_pickup || internalNotesObj.pickup_status === 'Assigned for Pickup' || (row.intake_method === 'On-Call' && (row.assigned_staff || internalNotesObj.assigned_driver))),
    pickup_status: internalNotesObj.pickup_status || (row.assigned_staff || internalNotesObj.assigned_driver ? 'Assigned for Pickup' : ''),
    pickup_delivery: internalNotesObj.pickup_delivery || ((row.assigned_staff || internalNotesObj.assigned_driver) ? `Assigned: ${internalNotesObj.assigned_driver || row.assigned_staff}` : ''),
    rack_shelf_location: row.rack_shelf_location || factoryData.rack_shelf_location || '',
    weight_kg: row.weight_kg !== undefined && row.weight_kg !== null ? Number(row.weight_kg) : (factoryData.weight_kg ?? null),
    completed_at: row.completed_at || null,
    delivered_at: row.delivered_at || null,
    routing_type: factoryData.routing_type || internalNotesObj.routing_type || 'factory',
    store_outlet: factoryData.store_outlet || internalNotesObj.store_outlet || '',
    factory_outlet: factoryData.factory_outlet || internalNotesObj.factory_outlet || '',
    factory_hub: factoryData.factory_hub || internalNotesObj.factory_hub || '',
    workshop_station: factoryData.workshop_station || internalNotesObj.workshop_station || '',
    factory_manifest_no: factoryData.factory_manifest_no || internalNotesObj.factory_manifest_no || '',
    dispatch_bag_tag: factoryData.dispatch_bag_tag || internalNotesObj.dispatch_bag_tag || '',
    factory_supervisor: factoryData.factory_supervisor || internalNotesObj.factory_supervisor || '',
    collected_by_staff: factoryData.collected_by_staff || internalNotesObj.collected_by_staff || '',
    vehicle_name: factoryData.vehicle_name || internalNotesObj.vehicle_name || '',
    mode_of_transport: factoryData.mode_of_transport || internalNotesObj.mode_of_transport || '',
    route_from_to: factoryData.route_from_to || internalNotesObj.route_from_to || '',
    route_return: factoryData.route_return || internalNotesObj.route_return || '',
    factory_gate_in: factoryData.factory_gate_in || internalNotesObj.factory_gate_in || '',
    factory_gate_out: factoryData.factory_gate_out || internalNotesObj.factory_gate_out || '',
    plant_transit_status: factoryData.plant_transit_status || internalNotesObj.plant_transit_status || '',
    logistics: {
      factoryPlant: factoryData.factory_outlet || factoryData.factory_hub || internalNotesObj.factory_outlet || '',
      assignedRider: factoryData.assigned_driver || schedData.assigned_driver_name || row.assigned_staff || '',
      riderPhone: factoryData.driver_phone || schedData.driver_phone || '',
      vehicleNo: factoryData.vehicle_name || schedData.vehicle_number || '',
      routeZone: factoryData.route_from_to || schedData.route_zone || '',
      pickupTime: schedData.pickup_time_display || '',
      deliverySlot: schedData.delivery_slot_display || schedData.slot_label || '',
      dispatchBagTag: factoryData.dispatch_bag_tag || '',
      logisticsStatus: factoryData.logistics_status || schedData.status || '',
      driverInstructions: factoryData.driver_instructions || schedData.notes || '',
    },
    workflow: {
      assignedMachine: factoryData.assigned_machine || '',
      qcInspector: factoryData.qc_inspector || '',
      statusRemark: '',
    },
    staff_notes: row.staff_notes || internalNotesObj.staff_notes || '',
    flags: (row.handling_flags && Object.keys(row.handling_flags).length > 0) ? row.handling_flags : (internalNotesObj.flags || {}),
    status_history: (garmentBundle?.statusHistory || []).map((sh) => ({
      id: sh.history_id,
      title: sh.old_status ? `Status: ${sh.old_status} → ${sh.new_status}` : `Status: ${sh.new_status}`,
      detail: sh.remarks || `${sh.entity_type || 'Order'} transitioned`,
      time: new Date(sh.changed_at || sh.created_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
      timestamp: sh.changed_at || sh.created_at,
      author: sh.changed_by_name || 'Staff',
      role: sh.changed_by_role || 'Staff',
      type: 'lifecycle',
    })),
    workflow_steps: (garmentBundle?.liveActions || []).map((act) => ({
      id: act.action_id,
      title: act.action_label,
      detail: `${act.stage} stage`,
      time: new Date(act.action_at || act.created_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
      timestamp: act.action_at || act.created_at,
      author: act.actor_name || 'Staff',
      role: act.actor_type || 'Staff',
      stage: act.stage,
      type: act.stage === 'Delivery' || act.stage === 'Pickup' ? 'pickup' : 'workflow',
    })),
    audit_logs: (() => {
      const merged = [
        ...(garmentBundle?.statusHistory || []).map((sh) => ({
          id: `sh-${sh.history_id}`,
          title: sh.old_status ? `Status: ${sh.old_status} → ${sh.new_status}` : `Status: ${sh.new_status}`,
          detail: sh.remarks || `${sh.entity_type || 'Order'} transition`,
          time: new Date(sh.changed_at || sh.created_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
          timestamp: sh.changed_at || sh.created_at,
          author: sh.changed_by_name || 'Staff',
          staff: sh.changed_by_name || 'Staff',
          role: sh.changed_by_role || 'Staff',
          category: 'lifecycle',
        })),
        ...(garmentBundle?.liveActions || []).map((act) => ({
          id: `act-${act.action_id}`,
          title: act.action_label,
          detail: `Stage: ${act.stage}`,
          time: new Date(act.action_at || act.created_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
          timestamp: act.action_at || act.created_at,
          author: act.actor_name || 'Staff',
          staff: act.actor_name || 'Staff',
          role: act.actor_type || 'Staff',
          category: act.stage === 'Delivery' || act.stage === 'Pickup' ? 'driver' : 'workflow',
          type: act.stage === 'Delivery' || act.stage === 'Pickup' ? 'pickup' : 'workflow',
        })),
      ];
      return merged.sort((a, b) => (new Date(b.timestamp).getTime() || 0) - (new Date(a.timestamp).getTime() || 0));
    })(),
    pincode: row.pincode || row.pin_code || internalNotesObj.pincode || '',
    pin_code: row.pin_code || row.pincode || internalNotesObj.pincode || '',
    business_name: row.business_name || row.company_name || internalNotesObj.business_name || '',
    communication_pref: row.communication_pref || row.communication_preference || internalNotesObj.communication_pref || 'WhatsApp',
    dob: row.dob || row.date_of_birth || internalNotesObj.dob || '',
    tax_exemption: row.tax_exemption ?? internalNotesObj.tax_exemption ?? false,
    customer: {
      id: custId,
      customerId: custId,
      customer_code: custId,
      customer_name: row.customer_name,
      customerName: row.customer_name,
      country_code: '+91',
      countryCode: '+91',
      mobile_number: row.mobile_number,
      mobileNumber: row.mobile_number,
      alternate_phone: row.alternate_phone || null,
      email: row.email || null,
      address: row.delivery_address || '',
      streetArea: row.delivery_address || '',
      area_service_zone: 'Zone 1',
      tier: 'SILVER',
      service_category: row.service_type || 'Wash & Steam Press',
      pincode: row.pincode || row.pin_code || internalNotesObj.pincode || '',
      business_name: row.business_name || row.company_name || internalNotesObj.business_name || '',
      communication_pref: row.communication_pref || row.communication_preference || internalNotesObj.communication_pref || 'WhatsApp',
      dob: row.dob || row.date_of_birth || internalNotesObj.dob || '',
      tax_exemption: row.tax_exemption ?? internalNotesObj.tax_exemption ?? false,
    },
  };
}

/**
 * Helper to determine if a customer_works row is purely a Customer Master registration
 * and not an actual service/laundry order.
 */
export function isCustomerRegistrationRecord(row) {
  if (!row) return false;
  if (row.internal_notes === 'Customer Registered') return true;
  if (Array.isArray(row.items) && row.items.length === 1 && row.items[0]?.type === 'customer_registration') return true;
  return false;
}

/**
 * Fetches real orders from Supabase customer_works (hydrated with washdoor_factory_orders
 * and washdoor_pickup_delivery_schedules) and falls back to washdoor_orders_master.
 */
export async function getOrders() {
  if (!isSupabaseConfigured()) {
    return { data: [], error: null };
  }

  try {
    // 1. Fetch from customer_works
    const { data: worksData, error: worksError } = await supabase
      .from('customer_works')
      .select('*')
      .order('created_at', { ascending: false });

    if (!worksError && worksData && worksData.length > 0) {
      // Exclude customer master registrations: only real orders with pieces/services
      const realOrdersData = worksData.filter((row) => !isCustomerRegistrationRecord(row));
      const workIds = realOrdersData.map((r) => r.work_id).filter(Boolean);
      const workNumbers = realOrdersData.map((r) => r.work_number).filter(Boolean);

      // Hydrate dedicated logistics, schedules, garment cards, inspections, photos & line items
      const factoryByWorkId = {};
      const scheduleByWorkId = {};
      const cardsByWorkId = {};
      const inspByWorkId = {};
      const photosByWorkId = {};
      const itemsByOrderKey = {};
      const statusHistByWorkId = {};
      const liveActionsByWorkId = {};
      if (workIds.length > 0) {
        try {
          const [facRes, schedRes, cardRes, inspRes, photoRes, orderItemsRes, histRes, actRes] = await Promise.all([
            supabase.from('washdoor_factory_orders').select('*').in('work_id', workIds),
            supabase.from('washdoor_pickup_delivery_schedules').select('*').in('work_id', workIds).order('created_at', { ascending: false }),
            supabase.from('washdoor_garment_cards').select('*').in('work_id', workIds).order('unit_index', { ascending: true }),
            supabase.from('washdoor_garment_inspections').select('*').in('work_id', workIds).order('created_at', { ascending: false }),
            supabase.from('washdoor_garment_photos').select('*').in('work_id', workIds).order('created_at', { ascending: true }),
            workNumbers.length > 0
              ? supabase.from('washdoor_order_items').select('*').in('order_number', workNumbers).order('created_at', { ascending: true })
              : Promise.resolve({ data: [] }),
            supabase.from('washdoor_status_history').select('*').in('work_id', workIds).order('changed_at', { ascending: false }),
            supabase.from('washdoor_live_status_actions').select('*').in('work_id', workIds).order('action_at', { ascending: false }),
          ]);
          if (!facRes.error && Array.isArray(facRes.data)) {
            facRes.data.forEach((f) => { factoryByWorkId[f.work_id] = f; });
          }
          if (!schedRes.error && Array.isArray(schedRes.data)) {
            schedRes.data.forEach((s) => { if (!scheduleByWorkId[s.work_id]) scheduleByWorkId[s.work_id] = s; });
          }
          if (!cardRes.error && Array.isArray(cardRes.data)) {
            cardRes.data.forEach((c) => {
              if (!cardsByWorkId[c.work_id]) cardsByWorkId[c.work_id] = [];
              cardsByWorkId[c.work_id].push(c);
            });
          }
          if (!inspRes.error && Array.isArray(inspRes.data)) {
            inspRes.data.forEach((i) => {
              if (!inspByWorkId[i.work_id]) inspByWorkId[i.work_id] = [];
              inspByWorkId[i.work_id].push(i);
            });
          }
          if (!photoRes.error && Array.isArray(photoRes.data)) {
            photoRes.data.forEach((p) => {
              if (!photosByWorkId[p.work_id]) photosByWorkId[p.work_id] = [];
              photosByWorkId[p.work_id].push(p);
            });
          }
          if (!orderItemsRes?.error && Array.isArray(orderItemsRes?.data)) {
            orderItemsRes.data.forEach((it) => {
              const key = it.work_id || it.order_number;
              if (!key) return;
              if (!itemsByOrderKey[key]) itemsByOrderKey[key] = [];
              itemsByOrderKey[key].push(it);
            });
          }
          if (!histRes?.error && Array.isArray(histRes?.data)) {
            histRes.data.forEach((h) => {
              if (!statusHistByWorkId[h.work_id]) statusHistByWorkId[h.work_id] = [];
              statusHistByWorkId[h.work_id].push(h);
            });
          }
          if (!actRes?.error && Array.isArray(actRes?.data)) {
            actRes.data.forEach((a) => {
              if (!liveActionsByWorkId[a.work_id]) liveActionsByWorkId[a.work_id] = [];
              liveActionsByWorkId[a.work_id].push(a);
            });
          }
        } catch {}
      }

      const orders = realOrdersData.map((row) =>
        mapCustomerWorkRowToOrder(row, factoryByWorkId[row.work_id], scheduleByWorkId[row.work_id], {
          cards: cardsByWorkId[row.work_id] || [],
          inspections: inspByWorkId[row.work_id] || [],
          photos: photosByWorkId[row.work_id] || [],
          orderItems: itemsByOrderKey[row.work_id] || itemsByOrderKey[row.work_number] || [],
          statusHistory: statusHistByWorkId[row.work_id] || [],
          liveActions: liveActionsByWorkId[row.work_id] || [],
        })
      );
      return { data: orders, error: null };
    }

    // 2. Fallback to washdoor_orders_master if present
    try {
      const { data: masterData, error: masterError } = await supabase
        .from('washdoor_orders_master')
        .select('*')
        .order('created_at', { ascending: false });

      if (!masterError && masterData && masterData.length > 0) {
        const orders = masterData.map(mapMasterRowToOrder);
        return { data: orders, error: null };
      }
    } catch {}

    return { data: [], error: null };
  } catch (err) {
    console.warn('getOrders catch:', err);
    return { data: [], error: err };
  }
}

/**
 * Fetches unique real customer records from Supabase customers, customer_works, and washdoor_orders_master,
 * merging profile fields across rows so order records never mask full customer master details.
 */
export async function getAllCustomers() {
  if (!isSupabaseConfigured()) {
    return { data: [], error: null };
  }

  try {
    const merger = createCustomerMerger();

    // Fetch all three tables in parallel while preserving master merge priority
    const [custResult, worksResult, masterResult] = await Promise.all([
      supabase
        .from('customers')
        .select('*')
        .order('created_at', { ascending: false })
        .then((res) => res)
        .catch((cErr) => {
          console.warn('customers getAll notice:', cErr);
          return { data: null, error: cErr };
        }),
      supabase
        .from('customer_works')
        .select('*')
        .order('created_at', { ascending: false })
        .then((res) => res)
        .catch((wErr) => {
          console.warn('customer_works getAll notice:', wErr);
          return { data: null, error: wErr };
        }),
      supabase
        .from('washdoor_orders_master')
        .select('*')
        .order('created_at', { ascending: false })
        .then((res) => res)
        .catch((mErr) => {
          console.warn('washdoor_orders_master getAll notice:', mErr);
          return { data: null, error: mErr };
        }),
    ]);

    if (!custResult?.error && custResult?.data) {
      custResult.data.forEach((r) => merger.add(mapMasterCustomerRow(r)));
    }
    if (!worksResult?.error && worksResult?.data) {
      worksResult.data.forEach((r) => merger.add(mapCustomerWorkRow(r)));
    }
    if (!masterResult?.error && masterResult?.data) {
      masterResult.data.forEach((r) => merger.add(mapMasterRowToOrder(r).customer));
    }

    return { data: merger.toList(), error: null };
  } catch (err) {
    return { data: [], error: err };
  }
}

/**
 * Creates a real customer record in Supabase customers & customer_works tables.
 */
export async function createCustomer(payload) {
  const clean = cleanPayload(payload);
  const custId = formatCustomerId(clean.customer_id || clean.customer_code || await getNextCustomerId());

  if (!isSupabaseConfigured()) {
    return { data: null, error: new Error('Supabase not configured') };
  }

  try {
    // 1. Prepare Customer Profile Object for customer_works JSONB
    const customerProfileItem = {
      type: 'customer_registration',
      city: clean.city || '',
      pincode: clean.pincode || null,
      additional_addresses: Array.isArray(clean.additional_addresses) ? clean.additional_addresses : [],
      company_name: clean.company_name || null,
      gst_number: clean.gst_number || null,
      area_service_zone: clean.service_zone ? (clean.service_zone.startsWith('zone-') ? `Zone ${clean.service_zone.replace('zone-', '')}` : clean.service_zone) : 'Zone 1',
      tax_exemption: Boolean(clean.tax_exemption),
      date_of_birth: clean.date_of_birth || null,
      map_link: clean.map_link || null,
      communication_pref: clean.communication_pref || 'WhatsApp',
      preferred_language: clean.communication_lang || 'English',
      internal_comments: clean.internal_comments || null,
      order_preference: clean.service_category || clean.order_preference || clean.orderPreference || 'Wash & Steam Press',
      price_list: clean.price_list || 'Standard',
      customer_classification: clean.customer_classification || 'Regular Customer',
      tier: clean.tier || 'SILVER',
      membership_id: clean.membership_id || null,
      default_discount: clean.default_discount !== undefined && clean.default_discount !== null ? Number(clean.default_discount) : 0,
      credit_limit: clean.credit_limit !== undefined && clean.credit_limit !== null ? Number(clean.credit_limit) : 0,
      referral_code: clean.referral_code || null,
      marketing_source: clean.marketing_source || 'Walk-in',
    };

    // 2. Insert into normalized customers master table using exact schema columns
    const normMobile = String(clean.mobile_number || '').replace(/\D/g, '').slice(-10);
    const dbClassification = (clean.customer_classification || 'regular').toLowerCase().includes('vip') ? 'vip' :
      (clean.customer_classification || '').toLowerCase().includes('corp') ? 'corporate' :
      (clean.customer_classification || '').toLowerCase().includes('fraud') ? 'fraud' : 'regular';
    const dbStatus = (clean.customer_status || 'active').toLowerCase() === 'inactive' ? 'inactive' :
      (clean.customer_status || '').toLowerCase() === 'archived' ? 'archived' : 'active';
    const dbCommPref = ['sms', 'whatsapp', 'email', 'phone', 'none'].includes(String(clean.communication_pref || '').toLowerCase())
      ? String(clean.communication_pref).toLowerCase()
      : 'sms';
    const dbCommLang = ['en', 'ta', 'hi', 'te', 'kn', 'ml'].includes(String(clean.communication_lang || '').toLowerCase())
      ? String(clean.communication_lang).toLowerCase()
      : 'en';

    let createdCustRow = null;
    try {
      const { data: custInsertData, error: custErr } = await supabase.from('customers').insert([{
        customer_code: custId,
        customer_name: clean.customer_name,
        mobile_number: normMobile,
        alternate_phone: clean.alternate_phone ? String(clean.alternate_phone).replace(/\D/g, '').slice(-10) : null,
        email: clean.email || null,
        address: clean.address || null,
        city: clean.city || 'Ranipet',
        pincode: clean.pincode && /^[0-9]{6}$/.test(String(clean.pincode)) ? String(clean.pincode) : null,
        date_of_birth: clean.date_of_birth || null,
        map_link: clean.map_link || null,
        gst_number: clean.gst_number || null,
        company_name: clean.company_name || null,
        communication_pref: dbCommPref,
        preferred_language: dbCommLang,
        dnd: Boolean(clean.dnd),
        tax_exemption: Boolean(clean.tax_exemption),
        customer_classification: dbClassification,
        customer_status: dbStatus,
        price_list: clean.price_list || 'Standard',
        service_zone: customerProfileItem.area_service_zone,
        credit_limit: customerProfileItem.credit_limit,
        default_discount: customerProfileItem.default_discount,
        internal_comments: clean.internal_comments || null,
        notes: clean.notes || clean.internal_comments || null,
      }]).select().maybeSingle();
      if (!custErr && custInsertData) createdCustRow = custInsertData;
      else if (custErr) console.warn('Customer master insert note:', custErr.message);
    } catch (custErr) {
      console.warn('Customer master auto-insert note:', custErr);
    }

    // 3. Also insert registration row into customer_works for unified lookup & profile JSONB
    const generatedOrderNum = await getNextOrderId();
    const workRow = {
      work_number: generatedOrderNum,
      customer_id: custId,
      customer_name: clean.customer_name,
      mobile_number: normMobile || clean.mobile_number,
      alternate_phone: clean.alternate_phone || null,
      email: clean.email || null,
      delivery_address: clean.address || (clean.city ? `${clean.city}${clean.pincode ? ' - ' + clean.pincode : ''}` : 'Counter Walk-In'),
      service_type: clean.service_category || clean.order_preference || clean.orderPreference || 'Wash & Steam Press',
      work_status: 'Received',
      priority: 'Normal',
      intake_method: clean.intake_type || 'Walk-In',
      items: [customerProfileItem],
      total_pieces: 0,
      subtotal: 0.00,
      discount_amount: 0.00,
      tax_amount: 0.00,
      total_amount: 0.00,
      advance_paid: 0.00,
      payment_status: 'Unpaid',
      payment_method: 'Cash',
      internal_notes: 'Customer Registered',
    };
    Object.keys(workRow).forEach((k) => workRow[k] === undefined && delete workRow[k]);

    const { data: workData, error: workError } = await supabase
      .from('customer_works')
      .insert([workRow])
      .select()
      .single();

    if (Array.isArray(clean.additional_addresses) && clean.additional_addresses.length > 0) {
      saveCustomerAddresses(custId, clean.additional_addresses).catch(() => {});
    }

    if (workError && !createdCustRow) {
      console.error('Error inserting into customer_works:', workError);
      return { data: null, error: workError };
    }

    await recordAuditLogEntry({
      entity_name: 'customers',
      record_id: workData?.work_id || custId,
      work_id: workData?.work_id || null,
      operation: 'INSERT',
      entity_label: `${custId} (${clean.customer_name})`,
      category: 'customer',
      new_data: { customer_code: custId, customer_name: clean.customer_name, mobile_number: normMobile || clean.mobile_number },
      details: `Registered customer ${clean.customer_name} (${custId}, +91 ${normMobile || clean.mobile_number}).`,
    }).catch(() => {});

    return {
      data: workData ? mapCustomerWorkRow(workData) : mapCustomersTableRow(createdCustRow),
      error: null,
    };
  } catch (err) {
    return { data: null, error: err };
  }
}

/**
 * Updates a real customer record in Supabase customers, customer_works, and washdoor_orders_master.
 * Safely preserves order JSON internal_notes on existing laundry orders while updating registration JSONB.
 */
export async function updateCustomer(id, payload) {
  if (!isSupabaseConfigured()) {
    return { data: null, error: new Error('Supabase not configured') };
  }

  const clean = cleanPayload(payload);
  const targetCustId = id || clean.customer_id || clean.customer_code;
  const normMobile = clean.mobile_number ? String(clean.mobile_number).replace(/\D/g, '').slice(-10) : undefined;

  try {
    // 1. Update normalized customers master table
    const dbClassification = clean.customer_classification
      ? (clean.customer_classification.toLowerCase().includes('vip') ? 'vip' :
         clean.customer_classification.toLowerCase().includes('corp') ? 'corporate' :
         clean.customer_classification.toLowerCase().includes('fraud') ? 'fraud' : 'regular')
      : undefined;
    const dbStatus = clean.customer_status
      ? (clean.customer_status.toLowerCase() === 'inactive' ? 'inactive' :
         clean.customer_status.toLowerCase() === 'archived' ? 'archived' : 'active')
      : undefined;
    const dbCommPref = clean.communication_pref
      ? (['sms', 'whatsapp', 'email', 'phone', 'none'].includes(String(clean.communication_pref).toLowerCase())
          ? String(clean.communication_pref).toLowerCase()
          : 'whatsapp')
      : undefined;
    const dbCommLang = clean.communication_lang
      ? (['en', 'ta', 'hi', 'te', 'kn', 'ml'].includes(String(clean.communication_lang).toLowerCase())
          ? String(clean.communication_lang).toLowerCase()
          : 'en')
      : undefined;

    const custTableUpdate = {
      customer_name: clean.customer_name,
      mobile_number: normMobile,
      alternate_phone: clean.alternate_phone !== undefined ? (clean.alternate_phone ? String(clean.alternate_phone).replace(/\D/g, '').slice(-10) : null) : undefined,
      email: clean.email !== undefined ? (clean.email || null) : undefined,
      address: clean.address !== undefined ? (clean.address || null) : undefined,
      city: clean.city !== undefined ? (clean.city || null) : undefined,
      pincode: clean.pincode !== undefined ? (clean.pincode && /^[0-9]{6}$/.test(String(clean.pincode)) ? String(clean.pincode) : null) : undefined,
      date_of_birth: clean.date_of_birth !== undefined ? (clean.date_of_birth || null) : undefined,
      map_link: clean.map_link !== undefined ? (clean.map_link || null) : undefined,
      gst_number: clean.gst_number !== undefined ? (clean.gst_number || null) : undefined,
      company_name: clean.company_name !== undefined ? (clean.company_name || null) : undefined,
      tax_exemption: clean.tax_exemption !== undefined ? Boolean(clean.tax_exemption) : undefined,
      customer_classification: dbClassification,
      customer_status: dbStatus,
      price_list: clean.price_list,
      service_zone: clean.service_zone ? (clean.service_zone.startsWith('zone-') ? `Zone ${clean.service_zone.replace('zone-', '')}` : clean.service_zone) : undefined,
      credit_limit: clean.credit_limit !== undefined && clean.credit_limit !== null ? Number(clean.credit_limit) : undefined,
      default_discount: clean.default_discount !== undefined && clean.default_discount !== null ? Number(clean.default_discount) : undefined,
      communication_pref: dbCommPref,
      preferred_language: dbCommLang,
      dnd: clean.dnd !== undefined ? Boolean(clean.dnd) : undefined,
      internal_comments: clean.internal_comments !== undefined ? (clean.internal_comments || null) : undefined,
      notes: clean.notes !== undefined ? (clean.notes || null) : undefined,
      updated_at: new Date().toISOString(),
    };
    Object.keys(custTableUpdate).forEach((k) => custTableUpdate[k] === undefined && delete custTableUpdate[k]);

    let updatedCustRow = null;
    let custUpdateErr = null;
    try {
      let cQuery = supabase.from('customers').update(custTableUpdate);
      if (targetCustId && String(targetCustId).match(/^(CUS|CUST-)/i)) {
        cQuery = cQuery.eq('customer_code', targetCustId);
      } else if (targetCustId && /^\d+$/.test(String(targetCustId))) {
        cQuery = cQuery.eq('id', Number(targetCustId));
      } else if (normMobile) {
        cQuery = cQuery.eq('mobile_number', normMobile);
      }
      const res = await cQuery.select();
      if (res.error) custUpdateErr = res.error;
      else if (Array.isArray(res.data) && res.data.length > 0) updatedCustRow = res.data;
    } catch {}

    // 2. Update contact columns on customer_works WITHOUT overwriting JSON internal_notes on real orders
    const workUpdate = {
      customer_name: clean.customer_name,
      mobile_number: normMobile || clean.mobile_number,
      alternate_phone: clean.alternate_phone !== undefined ? (clean.alternate_phone || null) : undefined,
      email: clean.email !== undefined ? (clean.email || null) : undefined,
      delivery_address: clean.address || clean.streetArea,
      service_type: clean.service_category || clean.orderPreference,
      updated_at: new Date().toISOString(),
    };
    Object.keys(workUpdate).forEach((k) => workUpdate[k] === undefined && delete workUpdate[k]);

    let workQuery = supabase.from('customer_works').update(workUpdate);
    if (targetCustId) {
      workQuery = workQuery.eq('customer_id', targetCustId);
    } else if (normMobile) {
      workQuery = workQuery.eq('mobile_number', normMobile);
    }
    const { data: workData, error: workError } = await workQuery.select();

    // Update items[0] JSONB on pure customer_registration rows so profile fields (city, pincode, GST, additional_addresses) persist
    if (Array.isArray(workData)) {
      for (const row of workData) {
        if (isCustomerRegistrationRecord(row)) {
          const prevProfile = (Array.isArray(row.items) && row.items[0]) ? row.items[0] : {};
          const updatedProfile = {
            ...prevProfile,
            type: 'customer_registration',
            city: clean.city !== undefined ? clean.city : prevProfile.city,
            pincode: clean.pincode !== undefined ? clean.pincode : prevProfile.pincode,
            additional_addresses: Array.isArray(clean.additional_addresses) ? clean.additional_addresses : prevProfile.additional_addresses,
            company_name: clean.company_name !== undefined ? clean.company_name : prevProfile.company_name,
            gst_number: clean.gst_number !== undefined ? clean.gst_number : prevProfile.gst_number,
            area_service_zone: custTableUpdate.service_zone || prevProfile.area_service_zone,
            tax_exemption: clean.tax_exemption !== undefined ? Boolean(clean.tax_exemption) : prevProfile.tax_exemption,
            date_of_birth: clean.date_of_birth !== undefined ? clean.date_of_birth : prevProfile.date_of_birth,
            map_link: clean.map_link !== undefined ? clean.map_link : prevProfile.map_link,
            communication_pref: clean.communication_pref || prevProfile.communication_pref,
            preferred_language: clean.communication_lang || prevProfile.preferred_language,
            internal_comments: clean.internal_comments !== undefined ? clean.internal_comments : prevProfile.internal_comments,
            order_preference: clean.order_preference || clean.orderPreference || prevProfile.order_preference,
            price_list: clean.price_list || prevProfile.price_list,
            customer_classification: clean.customer_classification || prevProfile.customer_classification,
            membership_id: clean.membership_id !== undefined ? clean.membership_id : prevProfile.membership_id,
            default_discount: clean.default_discount !== undefined && clean.default_discount !== null ? Number(clean.default_discount) : prevProfile.default_discount,
            credit_limit: clean.credit_limit !== undefined && clean.credit_limit !== null ? Number(clean.credit_limit) : prevProfile.credit_limit,
            referral_code: clean.referral_code !== undefined ? clean.referral_code : prevProfile.referral_code,
            marketing_source: clean.marketing_source || prevProfile.marketing_source,
          };
          await supabase.from('customer_works').update({ items: [updatedProfile] }).eq('work_id', row.work_id);
        }
      }
    }

    if (Array.isArray(clean.additional_addresses) && targetCustId) {
      saveCustomerAddresses(targetCustId, clean.additional_addresses).catch(() => {});
    }

    // 3. Best-effort sync to washdoor_orders_master if present
    try {
      const updateObj = {
        customer_name: clean.customer_name,
        mobile_number: normMobile || clean.mobile_number,
        alternate_phone: clean.alternate_phone,
        email: clean.email,
        company_name: clean.company_name,
        gst_number: clean.gst_number,
        tax_exemption: clean.tax_exemption !== undefined ? Boolean(clean.tax_exemption) : undefined,
        street_area: clean.address,
        city: clean.city,
        pincode: clean.pincode,
        date_of_birth: clean.date_of_birth,
        map_link: clean.map_link,
        communication_preference: clean.communication_pref,
        preferred_language: clean.communication_lang,
        do_not_disturb: clean.dnd !== undefined ? Boolean(clean.dnd) : undefined,
        internal_comments: clean.internal_comments,
        order_notes: clean.notes || clean.internal_comments,
        customer_classification: clean.customer_classification || 'Regular Customer',
        customer_status: clean.customer_status || 'Active',
        price_list: clean.price_list || 'Standard',
        area_service_zone: custTableUpdate.service_zone,
        default_discount_pct: clean.default_discount !== undefined && clean.default_discount !== null ? Number(clean.default_discount) : undefined,
        credit_limit: clean.credit_limit !== undefined && clean.credit_limit !== null ? Number(clean.credit_limit) : undefined,
        membership_id: clean.membership_id,
        referral_code: clean.referral_code,
        marketing_source: clean.marketing_source,
        service_category: clean.service_category || clean.orderPreference,
        updated_at: new Date().toISOString(),
      };
      Object.keys(updateObj).forEach((k) => updateObj[k] === undefined && delete updateObj[k]);

      let mQuery = supabase.from('washdoor_orders_master').update(updateObj);
      if (targetCustId) mQuery = mQuery.eq('customer_id', targetCustId);
      else if (normMobile) mQuery = mQuery.eq('mobile_number', normMobile);
      await mQuery;
    } catch {}

    if (custUpdateErr && workError) {
      return { data: null, error: custUpdateErr || workError };
    }

    await recordAuditLogEntry({
      entity_name: 'customers',
      record_id: workData?.work_id || targetCustId,
      work_id: workData?.work_id || null,
      operation: 'UPDATE',
      entity_label: `${targetCustId}${clean.customer_name ? ` (${clean.customer_name})` : ''}`,
      category: 'customer',
      new_data: { customer_id: targetCustId, customer_name: clean.customer_name, mobile_number: normMobile },
      details: `Updated customer profile ${clean.customer_name || targetCustId}.`,
    }).catch(() => {});

    return { data: updatedCustRow || workData, error: null };
  } catch (err) {
    return { data: null, error: err };
  }
}

/**
 * Deletes real customer records from Supabase customers, customer_works, and washdoor_orders_master.
 */
export async function deleteCustomer(id) {
  if (!isSupabaseConfigured()) {
    return { error: new Error('Supabase not configured') };
  }

  try {
    let custErr = null;
    // 1. Delete from normalized customers table
    try {
      let cDel = supabase.from('customers').delete();
      if (/^\d+$/.test(String(id))) {
        cDel = cDel.eq('id', Number(id));
      } else {
        cDel = cDel.or(`customer_code.eq.${id},mobile_number.eq.${id}`);
      }
      const res = await cDel;
      if (res.error) custErr = res.error;
    } catch {}

    // 2. Delete from customer_works
    const { error: workErr } = await supabase.from('customer_works').delete().eq('customer_id', id);

    // 3. Best-effort delete from washdoor_orders_master if exists
    try {
      await supabase
        .from('washdoor_orders_master')
        .delete()
        .eq('customer_id', id);
    } catch {}

    if (!(workErr || custErr)) {
      await recordAuditLogEntry({
        entity_name: 'customers',
        record_id: String(id),
        operation: 'DELETE',
        entity_label: String(id),
        category: 'customer',
        old_data: { customer_id: id },
        details: `Deleted customer profile ${id}.`,
      }).catch(() => {});
    }

    return { error: workErr || custErr };
  } catch (err) {
    return { error: err };
  }
}

/**
 * Transactional Order Creation into Supabase washdoor_orders_master.
 */
export async function createOrderWithCustomer({
  existingCustomerId = null,
  customerData = {},
  orderType = 'walk-in',
  orderPreference = '',
  orderPreferenceNotes = '',
  totalAmount = 0.00,
  items = [],
}) {
  const cleanCust = cleanPayload(customerData);

  if (!isSupabaseConfigured()) {
    return { data: null, error: new Error('Supabase not configured') };
  }

  try {
    const nextOrderId = await getNextOrderId();
    const generatedOrderNumber = cleanCust.order_number ? formatOrderId(cleanCust.order_number) : nextOrderId;
    
    // Resolve customer ID in standard CUST-00001 format
    let finalCustId = existingCustomerId || cleanCust.customer_code || cleanCust.customerId || cleanCust.customer_id || cleanCust.id;
    let isNewCustomer = false;

    const normMobile = String(cleanCust.mobile_number || '').replace(/\D/g, '').slice(-10);

    // If no existingCustomerId passed, check if a customer with this normalized 10-digit mobile already exists
    if (!finalCustId && normMobile.length === 10) {
      try {
        // 1. Check customers table
        const { data: cMatches } = await supabase
          .from('customers')
          .select('id, customer_code, customer_name, mobile_number')
          .ilike('mobile_number', `%${normMobile}%`)
          .limit(1);
        if (cMatches && cMatches.length > 0) {
          finalCustId = cMatches[0].customer_code || cMatches[0].customer_id || (cMatches[0].id ? formatCustomerId(cMatches[0].id) : null);
        }
      } catch {}

      // 2. If not found in customers table, check customer_works
      if (!finalCustId) {
        try {
          const { data: wMatches } = await supabase
            .from('customer_works')
            .select('customer_id, customer_name')
            .ilike('mobile_number', `%${normMobile}%`)
            .order('created_at', { ascending: false })
            .limit(1);
          if (wMatches && wMatches.length > 0 && wMatches[0].customer_id) {
            finalCustId = formatCustomerId(wMatches[0].customer_id);
          }
        } catch {}
      }
    }

    if (finalCustId) {
      finalCustId = formatCustomerId(finalCustId);
    } else {
      finalCustId = await getNextCustomerId();
      isNewCustomer = true;
    }

    // Try creating record in customers table if it is a newly registered customer
    if (isNewCustomer) {
      try {
        const dbClassification = (cleanCust.customer_classification || 'regular').toLowerCase().includes('vip') ? 'vip' :
          (cleanCust.customer_classification || '').toLowerCase().includes('corp') ? 'corporate' :
          (cleanCust.customer_classification || '').toLowerCase().includes('fraud') ? 'fraud' : 'regular';
        const dbStatus = (cleanCust.customer_status || 'active').toLowerCase() === 'inactive' ? 'inactive' :
          (cleanCust.customer_status || '').toLowerCase() === 'archived' ? 'archived' : 'active';
        const dbCommPref = ['sms', 'whatsapp', 'email', 'phone', 'none'].includes(String(cleanCust.communication_pref || '').toLowerCase())
          ? String(cleanCust.communication_pref).toLowerCase()
          : 'sms';
        const dbCommLang = ['en', 'ta', 'hi', 'te', 'kn', 'ml'].includes(String(cleanCust.communication_lang || '').toLowerCase())
          ? String(cleanCust.communication_lang).toLowerCase()
          : 'en';

        await supabase.from('customers').insert([{
          customer_code: finalCustId,
          customer_name: cleanCust.customer_name,
          mobile_number: normMobile,
          alternate_phone: cleanCust.alternate_phone ? String(cleanCust.alternate_phone).replace(/\D/g, '').slice(-10) : null,
          email: cleanCust.email || null,
          address: cleanCust.address || null,
          city: cleanCust.city || 'Ranipet',
          pincode: cleanCust.pincode && /^[0-9]{6}$/.test(String(cleanCust.pincode)) ? String(cleanCust.pincode) : null,
          map_link: cleanCust.map_link || null,
          date_of_birth: cleanCust.date_of_birth || null,
          gst_number: cleanCust.gst_number || null,
          company_name: cleanCust.company_name || null,
          communication_pref: dbCommPref,
          preferred_language: dbCommLang,
          dnd: Boolean(cleanCust.dnd),
          tax_exemption: Boolean(cleanCust.tax_exemption),
          customer_classification: dbClassification,
          customer_status: dbStatus,
          price_list: cleanCust.price_list || 'Standard',
          service_zone: cleanCust.service_zone || 'Zone 1',
          credit_limit: Number(cleanCust.credit_limit || 0),
          default_discount: Number(cleanCust.default_discount || 0),
          internal_comments: cleanCust.internal_comments || null,
          notes: cleanCust.notes || cleanCust.internal_comments || null,
        }]);
      } catch (custErr) {
        console.warn('Customer master auto-insert note:', custErr);
      }
    }

    const calculatedItemCount = (items && items.length > 0)
      ? items.reduce((s, i) => s + (Number(i.qty) || 1), 0)
      : (cleanCust.item_count !== undefined && cleanCust.item_count !== null ? Number(cleanCust.item_count) : 0);

    const masterInsert = {
      order_number: generatedOrderNumber,
      customer_id: finalCustId,
      customer_name: cleanCust.customer_name,
      mobile_number: cleanCust.mobile_number,
      alternate_phone: cleanCust.alternate_phone || null,
      email: cleanCust.email || null,
      company_name: cleanCust.company_name || null,
      gst_number: cleanCust.gst_number || null,
      tax_exemption: Boolean(cleanCust.tax_exemption),
      street_area: cleanCust.address || null,
      city: cleanCust.city || null,
      pincode: cleanCust.pincode || null,
      area_service_zone: cleanCust.service_zone ? (cleanCust.service_zone.startsWith('zone-') ? `Zone ${cleanCust.service_zone.replace('zone-', '')}` : cleanCust.service_zone) : null,
      map_link: cleanCust.map_link || null,
      intake_type: cleanCust.intake_type || (orderType === 'on-call' ? 'On-Call' : 'Walk-In'),
      communication_preference: cleanCust.communication_pref || null,
      preferred_language: cleanCust.communication_lang || null,
      do_not_disturb: Boolean(cleanCust.dnd),
      internal_comments: cleanCust.internal_comments || null,
      order_notes: orderPreferenceNotes || cleanCust.notes || null,
      service_category: orderPreference || cleanCust.service_category || 'Wash & Steam Press',
      item_count: calculatedItemCount,
      customer_classification: cleanCust.customer_classification || null,
      customer_status: 'Active',
      tier: cleanCust.tier || null,
      membership_id: cleanCust.membership_id || null,
      price_list: cleanCust.price_list || null,
      default_discount_pct: Number(cleanCust.default_discount || 0),
      credit_limit: Number(cleanCust.credit_limit || 0),
      wallet_balance: Number(cleanCust.wallet_balance || 0),
      referral_code: cleanCust.referral_code || null,
      marketing_source: cleanCust.marketing_source || 'Walk-in',
      order_type: orderType || 'walk-in',
      order_status: 'Received',
      total_amount: Number(totalAmount) || 0.00,
      customer_history: {
        items: items || [],
        additional_addresses: Array.isArray(cleanCust.additional_addresses) ? cleanCust.additional_addresses : [],
        created_at: new Date().toISOString(),
      },
    };

    // 1. Primary: Insert into customer_works table
    let insertedOrderNum = generatedOrderNumber;
    let insertedOrderId = generatedOrderNumber;

    // Normalize intake method to strict check constraint values: 'Walk-In', 'On-Call', 'Pickup & Delivery'
    const normalizedIntake = (orderType === 'on-call' || cleanCust.intake_type === 'On-Call')
      ? 'On-Call'
      : (orderType === 'pickup' || orderType === 'pickup & delivery' || orderType === 'home delivery' || cleanCust.intake_type === 'Pickup & Delivery')
      ? 'Pickup & Delivery'
      : 'Walk-In';

    // All newly created orders have an initial status of 'Received'
    const initialWorkStatus = 'Received';
    const rawDelivery = cleanCust.target_delivery_date || cleanCust.deliveryDate || cleanCust.delivery_date || cleanCust.expected_delivery || cleanCust.expectedDelivery;

    try {
      // Compute exact financial metrics
      const calculatedSubtotal = cleanCust.subtotal !== undefined && cleanCust.subtotal !== null
        ? Number(cleanCust.subtotal)
        : (items && items.length > 0)
        ? items.reduce((sum, it) => sum + (Number(it.qty || 1) * Number(it.rate || it.price || 0)), 0)
        : Number(totalAmount) || 0.00;

      const calculatedDiscount = Number(cleanCust.discount_amount || cleanCust.discount || 0);

      const calculatedTax = cleanCust.tax_amount !== undefined && cleanCust.tax_amount !== null
        ? Number(cleanCust.tax_amount)
        : (cleanCust.tax_exemption || cleanCust.taxExempt) ? 0.00 : +(calculatedSubtotal * 0.05).toFixed(2);

      const calculatedGrandTotal = Number(totalAmount) || +(calculatedSubtotal + calculatedTax - calculatedDiscount).toFixed(2);
      const advancePaidVal = Number(cleanCust.advance_paid || 0.00);
      const calculatedPaymentStatus = cleanCust.payment_status || (advancePaidVal >= calculatedGrandTotal && calculatedGrandTotal > 0 ? 'Paid' : advancePaidVal > 0 ? 'Partially Paid' : 'Unpaid');
      const calculatedPaymentMethod = normalizeDbPaymentMethod(cleanCust.payment_method || cleanCust.payment_mode || 'Cash');

      // Parse target delivery date
      let targetDeliveryDateIso = null;
      const rawDelivery = cleanCust.target_delivery_date || cleanCust.deliveryDate || cleanCust.delivery_date || cleanCust.expected_delivery || cleanCust.expectedDelivery;
      if (rawDelivery) {
        const d = new Date(rawDelivery);
        if (!isNaN(d.getTime())) {
          targetDeliveryDateIso = d.toISOString();
        }
      }

      // Parse On-Call scheduling timestamps (On-Call orders only; Walk-In remains null)
      const isOnCallIntake = normalizedIntake === 'On-Call';
      const parseIsoOrNull = (val) => {
        if (!val) return null;
        const d = new Date(val);
        return !isNaN(d.getTime()) ? d.toISOString() : null;
      };
      const scheduledPickupAtIso = isOnCallIntake
        ? parseIsoOrNull(cleanCust.scheduled_pickup_at || cleanCust.scheduledPickupAt)
        : null;
      const scheduledDeliveryAtIso = isOnCallIntake
        ? parseIsoOrNull(cleanCust.scheduled_delivery_at || cleanCust.scheduledDeliveryAt)
        : null;

      // Weight & shelf location
      const weightVal = cleanCust.weight_kg !== undefined && cleanCust.weight_kg !== null
        ? Number(cleanCust.weight_kg)
        : cleanCust.product_weight ? Number(cleanCust.product_weight) : null;
      const rackLocation = cleanCust.rack_shelf_location || cleanCust.rackShelfLocation || null;

      const attendStaffIdVal = cleanCust.attend_staff_id || null;
      const pickupPersonIdVal = cleanCust.assigned_pickup_person_id || null;
      const attendStaffVal = cleanCust.attend_staff_name || cleanCust.assigned_staff || 'Counter Staff';
      const pickupPersonVal = cleanCust.assigned_pickup_delivery_person || cleanCust.assigned_driver || '';
      const nowCreatedIso = cleanCust.intake_date ? new Date(cleanCust.intake_date).toISOString() : new Date().toISOString();
      const initialActivity = [
        ...(advancePaidVal > 0 ? [{
          id: `act_pay_${Date.now()}`,
          type: 'payment',
          title: 'Payment Received',
          detail: `₹${advancePaidVal.toFixed(2)} received via ${cleanCust.payment_method || cleanCust.payment_mode || 'Cash'}`,
          staff: attendStaffVal,
          timestamp: nowCreatedIso,
        }] : []),
        {
          id: `act_recv_${Date.now() + 1}`,
          type: 'received',
          title: 'Order Received',
          detail: `New order placed (${normalizedIntake})${pickupPersonVal ? ` • Pickup/Delivery: ${pickupPersonVal}` : ''}`,
          staff: attendStaffVal,
          timestamp: nowCreatedIso,
        },
      ];

      // Structured internal notes for inspections and extra metadata
      const structuredInternalNotes = {
        factory_hub: cleanCust.factory_hub || 'Main Plant (Unit 1)',
        vehicle_name: cleanCust.vehicle_name || 'TN-23-AX-8910 (Tata Ace Mini Van)',
        mode_of_transport: cleanCust.mode_of_transport || 'Mini Van',
        route_from_to: cleanCust.route_from_to || 'Store Central (Vellore Main) ➔ Factory Plant Unit 1',
        route_return: cleanCust.route_return || 'Factory Plant Unit 1 ➔ Store Central (Vellore Main)',
        collected_by_staff: cleanCust.collected_by_staff || attendStaffVal,
        plant_transit_status: cleanCust.plant_transit_status || 'Washing in Progress',
        garment_inspections: cleanCust.garment_inspections || cleanCust.inspections || {},
        expected_delivery_display: rawDelivery || '',
        scheduled_pickup_at: scheduledPickupAtIso,
        scheduled_delivery_at: scheduledDeliveryAtIso,
        payment_method_display: cleanCust.payment_method || cleanCust.payment_mode || 'Cash',
        attend_staff_id: attendStaffIdVal,
        attend_staff_name: attendStaffVal,
        assigned_pickup_person_id: pickupPersonIdVal,
        assigned_pickup_delivery_person: pickupPersonVal,
        assigned_driver: pickupPersonVal || attendStaffVal,
        assigned_driver_full: cleanCust.assigned_driver_full || pickupPersonVal,
        status_updated_at: cleanCust.status_updated_at || nowCreatedIso,
        status_updated_by: cleanCust.status_updated_by || attendStaffVal,
        activity_history: Array.isArray(cleanCust.activity_history) && cleanCust.activity_history.length > 0 ? cleanCust.activity_history : initialActivity,
        payment_received_at: advancePaidVal > 0 ? nowCreatedIso : null,
        payment_received_by: advancePaidVal > 0 ? attendStaffVal : '',
        collection_at: null,
        collected_by_person: cleanCust.collected_by_person || '',
        staff_notes: cleanCust.internal_comments || cleanCust.notes || '',
        flags: cleanCust.flags || {},
        order_status: cleanCust.order_status || 'order recived',
        property_status: cleanCust.property_status || (cleanCust.priority === 'Yes' ? 'Yes' : 'No') || 'No',
      };

      const calculatedTaxable = Math.max(0, +(calculatedSubtotal - calculatedDiscount).toFixed(2));
      const isTaxExempt = Boolean(cleanCust.tax_exemption || cleanCust.taxExempt);
      const gstPercentage = isTaxExempt ? 0 : Number(cleanCust.gst_percentage ?? 5);
      const cgstAmount = isTaxExempt ? 0 : +(calculatedTax / 2).toFixed(2);
      const sgstAmount = isTaxExempt ? 0 : +(calculatedTax - cgstAmount).toFixed(2);

      // Assign standardized ORD00001 order identifier to work_number
      // Omit balance_due because PostgreSQL has it defined as a generated column
      const workRow = {
        work_number: generatedOrderNumber,
        customer_id: finalCustId,
        customer_name: cleanCust.customer_name,
        mobile_number: cleanCust.mobile_number,
        alternate_phone: cleanCust.alternate_phone || null,
        email: cleanCust.email || null,
        delivery_address: cleanCust.address || cleanCust.street_area || (normalizedIntake === 'Walk-In' ? 'Counter Walk-In' : 'Pending Address'),
        service_type: orderPreference || cleanCust.service_category || 'Wash & Steam Press',
        work_status: initialWorkStatus,
        priority: normalizeDbPriority(cleanCust.property_status || cleanCust.priority),
        intake_method: normalizedIntake,
        items: items || [],
        total_pieces: calculatedItemCount || 1,
        weight_kg: weightVal,
        rack_shelf_location: rackLocation,
        subtotal: Number(calculatedSubtotal.toFixed(2)),
        discount_amount: Number(calculatedDiscount.toFixed(2)),
        discount_pct: Number(cleanCust.discount_pct || 0),
        taxable_amount: calculatedTaxable,
        gst_percentage: gstPercentage,
        cgst_amount: cgstAmount,
        sgst_amount: sgstAmount,
        igst_amount: 0,
        tax_exemption: isTaxExempt,
        tax_amount: Number(calculatedTax.toFixed(2)),
        total_amount: Number(calculatedGrandTotal.toFixed(2)),
        advance_paid: Number(advancePaidVal.toFixed(2)),
        payment_status: calculatedPaymentStatus,
        payment_method: calculatedPaymentMethod,
        intake_date: cleanCust.intake_date ? new Date(cleanCust.intake_date).toISOString() : new Date().toISOString(),
        target_delivery_date: targetDeliveryDateIso,
        scheduled_pickup_at: scheduledPickupAtIso,
        scheduled_delivery_at: scheduledDeliveryAtIso,
        attend_staff_id: attendStaffIdVal,
        attend_staff_name: cleanCust.attend_staff_name || null,
        assigned_staff: cleanCust.attend_staff_name || cleanCust.assigned_staff || cleanCust.assigned_driver || null,
        assigned_pickup_person_id: pickupPersonIdVal,
        assigned_pickup_delivery_person: cleanCust.assigned_pickup_delivery_person || null,
        special_instructions: orderPreferenceNotes || cleanCust.notes || cleanCust.special_instructions || null,
        staff_notes: cleanCust.internal_comments || cleanCust.staff_notes || null,
        handling_flags: cleanCust.flags || {},
        created_by_name: cleanCust.created_by_name || attendStaffVal || 'POS Counter',
        updated_by_name: cleanCust.updated_by_name || attendStaffVal || 'POS Counter',
        internal_notes: JSON.stringify(structuredInternalNotes),
      };
      Object.keys(workRow).forEach((k) => workRow[k] === undefined && delete workRow[k]);
      let { data: wData, error: wErr } = await supabase.from('customer_works').insert([workRow]).select().single();

      // If extended columns are not yet migrated in live DB, strip them and insert base row
      if (wErr && (wErr.code === 'PGRST204' || String(wErr.message).includes('column'))) {
        const {
          discount_pct, taxable_amount, gst_percentage, cgst_amount, sgst_amount, igst_amount,
          tax_exemption, staff_notes, handling_flags, created_by_name, updated_by_name,
          attend_staff_id, attend_staff_name, assigned_pickup_person_id, assigned_pickup_delivery_person,
          scheduled_pickup_at, scheduled_delivery_at,
          ...baseWorkRow
        } = workRow;
        const baseRes = await supabase.from('customer_works').insert([baseWorkRow]).select().single();
        wData = baseRes.data;
        wErr = baseRes.error;
      }

      if (!wErr && wData) {
        insertedOrderNum = wData.work_number || generatedOrderNumber;
        insertedOrderId = wData.work_id || generatedOrderNumber;
      } else if (wErr) {
        console.warn('customer_works insert warning:', wErr);
        // Handle concurrency collision: If work_number already taken, increment and retry
        let retryOrderNum = generatedOrderNumber;
        if (wErr.code === '23505' || String(wErr.message).toLowerCase().includes('unique')) {
          const digits = parseInt(String(generatedOrderNumber).replace(/\D/g, '') || '1', 10);
          retryOrderNum = formatOrderId(digits + 1);
        }
        const {
          discount_pct, taxable_amount, gst_percentage, cgst_amount, sgst_amount, igst_amount,
          tax_exemption, staff_notes, handling_flags, created_by_name, updated_by_name,
          attend_staff_id, attend_staff_name, assigned_pickup_person_id, assigned_pickup_delivery_person,
          scheduled_pickup_at, scheduled_delivery_at,
          ...baseWorkRow
        } = workRow;
        const fallbackRow = { ...baseWorkRow, work_number: retryOrderNum };
        const { data: fbData, error: fbErr } = await supabase.from('customer_works').insert([fallbackRow]).select().single();
        if (fbData) {
          insertedOrderNum = fbData.work_number || retryOrderNum;
          insertedOrderId = fbData.work_id || retryOrderNum;
        } else {
          console.error('customer_works insert fatal error:', fbErr || wErr);
          return { data: null, error: fbErr || wErr };
        }
      }
    } catch (workSyncErr) {
      console.warn('customer_works order sync note:', workSyncErr);
    }

    // 2. Also try washdoor_orders_master if exists
    try {
      const masterWithStaff = {
        ...masterInsert,
        attend_staff_id: cleanCust.attend_staff_id || null,
        attend_staff_name: cleanCust.attend_staff_name || null,
        assigned_pickup_person_id: cleanCust.assigned_pickup_person_id || null,
        assigned_pickup_delivery_person: cleanCust.assigned_pickup_delivery_person || null,
        scheduled_pickup_at: cleanCust.order_type === 'on-call' || orderType === 'on-call' ? (cleanCust.scheduled_pickup_at || null) : null,
        scheduled_delivery_at: cleanCust.order_type === 'on-call' || orderType === 'on-call' ? (cleanCust.scheduled_delivery_at || null) : null,
      };
      const { error: mErr } = await supabase
        .from('washdoor_orders_master')
        .insert([masterWithStaff]);
      if (mErr && (mErr.code === 'PGRST204' || String(mErr.message).includes('column'))) {
        await supabase.from('washdoor_orders_master').insert([masterInsert]);
      }
    } catch {}

    // 3. Synchronize dedicated washdoor_factory_orders and washdoor_customer_addresses
    try {
      await upsertFactoryOrder(insertedOrderId, {
        work_number: insertedOrderNum,
        routing_type: cleanCust.routing_type || 'factory',
        store_outlet: cleanCust.store_outlet || 'Store Outlet #1 (Central Vellore Main)',
        factory_outlet: cleanCust.factory_outlet || cleanCust.factory_hub || 'Main Plant (Unit 1)',
        factory_hub: cleanCust.factory_hub || 'Main Plant (Unit 1)',
        vehicle_name: cleanCust.vehicle_name || 'TN-23-AX-8910 (Tata Ace Mini Van)',
        mode_of_transport: cleanCust.mode_of_transport || 'Mini Van',
        route_from_to: cleanCust.route_from_to || 'Store Central (Vellore Main) ➔ Factory Plant Unit 1',
        route_return: cleanCust.route_return || 'Factory Plant Unit 1 ➔ Store Central (Vellore Main)',
        collected_by_staff: cleanCust.collected_by_staff || attendStaffVal,
        assigned_driver: cleanCust.assigned_pickup_delivery_person || cleanCust.assigned_driver || cleanCust.assigned_staff || null,
        plant_transit_status: cleanCust.plant_transit_status || 'Order Intake Logged',
        rack_shelf_location: cleanCust.rack_shelf_location || cleanCust.rackShelfLocation || null,
        weight_kg: cleanCust.weight_kg ?? cleanCust.product_weight ?? null,
      });
    } catch {}

    if (Array.isArray(cleanCust.additional_addresses) && cleanCust.additional_addresses.length > 0) {
      try {
        await saveCustomerAddresses(finalCustId, cleanCust.additional_addresses);
      } catch {}
    }

    const actorName = cleanCust.created_by_name || cleanCust.attend_staff_name || cleanCust.assigned_staff || getActiveStaffProfile().name;
    try {
      await recordAuditLogEntry({
        entity_name: 'customer_works',
        record_id: insertedOrderId,
        work_id: insertedOrderId,
        operation: 'INSERT',
        entity_label: insertedOrderNum,
        category: 'lifecycle',
        new_data: { order_number: insertedOrderNum, customer_id: finalCustId, total_amount: Number(totalAmount) || 0, pieces: items?.length || 0 },
        changed_by_name: actorName,
        details: `Created order ${insertedOrderNum} for ${cleanCust.customer_name} (${finalCustId}) • Total ₹${Number(totalAmount || 0).toFixed(2)}.`,
      });
    } catch {}

    // Synchronize item records to washdoor_order_items table if exists
    if (items && Array.isArray(items) && items.length > 0) {
      try {
        await saveOrderItems(insertedOrderNum, items, insertedOrderId);
      } catch (itemErr) {
        console.warn('saveOrderItems async note:', itemErr);
      }

      // Synchronize discrete garment unit cards (washdoor_garment_cards) and inspections
      try {
        await syncGarmentCardsAndInspections(
          insertedOrderId,
          insertedOrderNum,
          items,
          cleanCust.garment_inspections || cleanCust.inspections || {}
        );
      } catch (cardErr) {
        console.warn('syncGarmentCardsAndInspections async note:', cardErr);
      }
    }

    // Persist payment ledger transaction if advance is paid
    if (Number(cleanCust.advance_paid || 0) > 0) {
      try {
        await recordPaymentLedger({
          work_id: insertedOrderId,
          work_number: insertedOrderNum,
          customer_id: finalCustId,
          amount: Number(cleanCust.advance_paid),
          payment_mode: cleanCust.payment_method || 'Cash',
          reference_number: cleanCust.payment_reference || 'Advance_Counter',
          notes: 'Advance payment collected at counter',
          collected_by: actorName,
          entry_type: 'Initial_Advance',
        });
        await recordStatusHistory({
          work_id: insertedOrderId,
          work_number: insertedOrderNum,
          step_name: 'Initial Payment Collected',
          stage: 'Payment',
          new_status: `₹${Number(cleanCust.advance_paid).toFixed(2)} (${cleanCust.payment_method || 'Cash'})`,
          changed_by_name: actorName,
          remarks: `Advance payment collected at intake by ${actorName}`,
        });
      } catch (payLedgerErr) {
        console.warn('recordPaymentLedger async note:', payLedgerErr);
      }
    }

    // Persist initial status history & intake workflow steps
    try {
      await recordStatusHistory({
        work_id: insertedOrderId,
        work_number: insertedOrderNum,
        step_name: 'Order Intake Received',
        stage: 'Shop',
        old_status: null,
        new_status: initialWorkStatus,
        changed_by_name: actorName,
        remarks: `Order ${insertedOrderNum} received at counter (${orderType || 'Walk-In'}) by ${actorName}`,
      });

      const inspCount = Object.keys(cleanCust.garment_inspections || cleanCust.inspections || {}).length;
      if (inspCount > 0) {
        await recordStatusHistory({
          work_id: insertedOrderId,
          work_number: insertedOrderNum,
          entity_type: 'Garment_Unit',
          step_name: 'Garment Inspection & Tagging',
          stage: 'Processing',
          new_status: `${inspCount} garment piece(s) tagged`,
          changed_by_name: actorName,
          remarks: `${inspCount} garment inspection card(s) logged during intake`,
        });
      }

      const driverAssigned = cleanCust.assigned_pickup_delivery_person || cleanCust.assigned_driver;
      if (driverAssigned) {
        await recordStatusHistory({
          work_id: insertedOrderId,
          work_number: insertedOrderNum,
          entity_type: 'Driver_Assignment',
          step_name: 'Pickup Rider Assigned',
          stage: 'Pickup',
          new_status: driverAssigned,
          changed_by_name: actorName,
          remarks: `Assigned driver ${driverAssigned} for pickup`,
        });
      }
    } catch {}

    // Persist order notes & instructions if present
    if (orderPreferenceNotes || cleanCust.notes || cleanCust.special_instructions) {
      try {
        await recordOrderNote({
          work_id: insertedOrderId,
          work_number: insertedOrderNum,
          note_type: 'Customer_Instruction',
          content: orderPreferenceNotes || cleanCust.notes || cleanCust.special_instructions,
          author: cleanCust.assigned_staff || 'Counter Staff',
        });
      } catch {}
    }

    // Persist customer notification message log
    try {
      await recordCustomerMessage({
        work_id: insertedOrderId,
        work_number: insertedOrderNum,
        customer_id: finalCustId,
        channel: cleanCust.communication_pref || 'WhatsApp',
        category: 'orderReceived',
        recipient_phone: cleanCust.mobile_number,
        message_body: `Dear ${cleanCust.customer_name}, your order ${insertedOrderNum} for ${calculatedItemCount} item(s) has been received. Total: ₹${totalAmount}. Status: Received.`,
        sent_by: 'System Bot',
      });
    } catch {}

    // Automated Business Event: Order Created Notification Dispatch
    try {
      triggerNotification({
        eventType: 'order_created',
        channel: 'whatsapp',
        order: {
          order_id: insertedOrderId,
          order_number: insertedOrderNum,
          customer_name: cleanCust.customer_name,
          mobile_number: cleanCust.mobile_number,
          email: cleanCust.email,
          total_amount: Number(totalAmount) || 0,
          service_category: orderPreference || 'Standard Wash',
          expected_delivery: rawDelivery || 'Tomorrow, 06:00 PM',
          item_count: calculatedItemCount,
        },
        customer: cleanCust,
      }).catch(() => {});
    } catch (notifErr) {
      console.warn('Notification trigger notice:', notifErr);
    }

    return {
      data: {
        order_id: insertedOrderId,
        order_number: insertedOrderNum,
        customer_id: finalCustId,
        isNewCustomer,
        status: 'success',
      },
      error: null,
    };
  } catch (err) {
    return { data: null, error: err };
  }
}

/**
 * Updates order status and progress stage in Supabase washdoor_orders_master.
 * Supported stages:
 * - 'Order in Progress' (25%)
 * - 'Ready for Billing' (50%)
 * - 'Product Status' (90%)
 */
export async function updateOrderStatus(orderIdentifier, newStatus, progressPercentage = 25) {
  if (!isSupabaseConfigured()) {
    return { data: null, error: new Error('Supabase not configured') };
  }

  try {
    const formattedId = orderIdentifier ? String(orderIdentifier).trim() : '';

    // 1. Update customer_works using strict PostgreSQL constraint normalizer
    const dbWorkStatus = normalizeDbStatus(newStatus);
    const workUpdate = {
      work_status: dbWorkStatus,
      updated_at: new Date().toISOString(),
    };
    if (dbWorkStatus === 'Ready for Delivery') {
      workUpdate.completed_at = new Date().toISOString();
    } else if (dbWorkStatus === 'Delivered') {
      workUpdate.delivered_at = new Date().toISOString();
    }

    try {
      const numMatch = String(formattedId).match(/\d+/);
      const num = numMatch ? parseInt(numMatch[0], 10) : null;
      const ordId = num ? `ORD${String(num).padStart(5, '0')}` : formattedId;
      const workId = num ? `WORK-${String(num).padStart(5, '0')}` : formattedId;
      const orderIdPattern = num ? `ORDER-${String(num).padStart(5, '0')}` : formattedId;
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(formattedId);

      let wQuery = supabase.from('customer_works').update(workUpdate);
      if (isUuid) {
        wQuery = wQuery.or(`work_number.eq.${ordId},work_number.eq.${workId},work_number.eq.${orderIdPattern},work_id.eq.${formattedId}`);
      } else {
        wQuery = wQuery.or(`work_number.eq.${ordId},work_number.eq.${workId},work_number.eq.${orderIdPattern},work_number.eq.${formattedId}`);
      }
      await wQuery;
    } catch {}

    // 2. Also try washdoor_orders_master if present
    try {
      const updateObj = {
        order_status: newStatus,
        updated_at: new Date().toISOString(),
        customer_history: {
          last_status: newStatus,
          progress: progressPercentage,
          updated_at: new Date().toISOString(),
        },
      };

      let query = supabase.from('washdoor_orders_master').update(updateObj);
      if (formattedId.startsWith('ORDER-')) {
        query = query.eq('order_number', formattedId);
      } else {
        query = query.or(`order_number.eq.${formattedId},order_id.eq.${formattedId}`);
      }
      await query;
    } catch {}

    // 3. Record immutable status history & audit log with active staff attribution
    const staffName = getActiveStaffProfile().name;
    try {
      await recordStatusHistory({
        work_id: formattedId,
        work_number: formattedId,
        step_name: 'Order Status Transition',
        stage: dbWorkStatus === 'Delivered' ? 'Delivery' : 'Processing',
        new_status: dbWorkStatus,
        changed_by_name: staffName,
        remarks: `Status updated to ${newStatus} (${progressPercentage}%)`,
      });
      await recordAuditLogEntry({
        entity_name: 'customer_works',
        record_id: formattedId,
        operation: 'UPDATE',
        entity_label: formattedId,
        new_data: { work_status: dbWorkStatus, display_status: newStatus, progress: progressPercentage },
        changed_by_name: staffName,
        details: `Order ${formattedId} status changed to "${newStatus}" (${progressPercentage}%) by ${staffName}.`,
      });
    } catch {}

    return { data: [{ order_number: formattedId, order_status: newStatus }], error: null };
  } catch (err) {
    console.error('updateOrderStatus catch:', err);
    return { data: null, error: err };
  }
}

/**
 * Helper normalizers matching customer_works PostgreSQL constraints:
 */
function normalizeDbStatus(val) {
  if (!val) return 'Received';
  const s = String(val).trim().toLowerCase();
  if (s === 'ready for delvier' || s === 'ready for delivery' || s === 'ready') return 'Ready for Delivery';
  if (s === 'dfa' || s === 'dfa -card' || s === 'today delivery' || s === 'delivered') return 'Delivered';
  if (s === 'landry in progress' || s === 'ladaery in pro emer' || s === 'in progress' || s === 'not cleared' || s.includes('progress')) return 'In Progress';
  if (s === 'cancelled' || s === 'other') return 'Cancelled';
  return 'Received';
}

function normalizeDbIntakeMethod(val) {
  if (!val) return 'Walk-In';
  const lower = String(val).toLowerCase();
  if (lower.includes('pickup') || lower.includes('delivery')) return 'Pickup & Delivery';
  if (lower.includes('call')) return 'On-Call';
  return 'Walk-In';
}

function normalizeDbPriority(val) {
  if (!val) return 'Normal';
  const lower = String(val).toLowerCase();
  if (lower === 'yes' || lower === 'true') return 'Urgent';
  if (lower === 'no' || lower === 'false') return 'Normal';
  if (lower.includes('urgent') || lower.includes('high') || lower.includes('express')) return 'Urgent';
  return 'Normal';
}

function normalizeDbPaymentStatus(val) {
  if (!val) return 'Unpaid';
  const lower = String(val).toLowerCase();
  if (lower.includes('part')) return 'Partially Paid';
  if (lower.includes('refund')) return 'Refunded';
  if (lower.includes('paid')) return 'Paid';
  return 'Unpaid';
}

function normalizeDbPaymentMethod(val) {
  if (!val) return 'Cash';
  const lower = String(val).toLowerCase();
  if (lower.includes('cash')) return 'Cash';
  if (lower.includes('card')) return 'Card';
  if (lower.includes('bank')) return 'Net Banking';
  if (lower.includes('wallet') || lower.includes('upi') || lower.includes('pay') || lower.includes('qr')) return 'Wallet';
  return 'Cash';
}

/**
 * Updates order details, cart items, customer contact, service type and pricing in Supabase customer_works.
 */
export async function updateOrder(orderIdentifier, updatePayload = {}) {
  if (!isSupabaseConfigured()) {
    return { data: null, error: new Error('Supabase not configured') };
  }

  try {
    const formattedId = orderIdentifier ? String(orderIdentifier).trim() : '';

    const updateObj = {
      updated_at: new Date().toISOString(),
    };

    // 1. Build workUpdate for customer_works (Primary Table)
    const workUpdate = {
      updated_at: new Date().toISOString(),
    };

    const grandTotal = updatePayload.totalAmount ?? updatePayload.total_amount ?? updatePayload.grand_total;
    if (grandTotal !== undefined && grandTotal !== null) {
      workUpdate.total_amount = Number(grandTotal);
      updateObj.total_amount = Number(grandTotal);
    }

    if (updatePayload.subtotal !== undefined && updatePayload.subtotal !== null) {
      workUpdate.subtotal = Number(updatePayload.subtotal);
    }

    const discountVal = updatePayload.discountAmount ?? updatePayload.discount ?? updatePayload.discount_amount;
    if (discountVal !== undefined && discountVal !== null) {
      workUpdate.discount_amount = Number(discountVal);
    }

    const taxVal = updatePayload.taxAmount ?? updatePayload.tax ?? updatePayload.tax_amount;
    if (taxVal !== undefined && taxVal !== null) {
      workUpdate.tax_amount = Number(taxVal);
    }

    if (updatePayload.itemCount !== undefined && updatePayload.itemCount !== null) {
      workUpdate.total_pieces = Number(updatePayload.itemCount);
      updateObj.item_count = Number(updatePayload.itemCount);
    } else if (updatePayload.total_pieces !== undefined && updatePayload.total_pieces !== null) {
      workUpdate.total_pieces = Number(updatePayload.total_pieces);
    }

    if (updatePayload.serviceCategory) {
      workUpdate.service_type = updatePayload.serviceCategory;
      updateObj.service_category = updatePayload.serviceCategory;
    } else if (updatePayload.service_type) {
      workUpdate.service_type = updatePayload.service_type;
    }

    if (updatePayload.customerName || updatePayload.customer_name) {
      const cName = updatePayload.customerName || updatePayload.customer_name;
      workUpdate.customer_name = cName;
      updateObj.customer_name = cName;
    }

    if (updatePayload.mobileNumber || updatePayload.mobile_number) {
      const raw = String(updatePayload.mobileNumber || updatePayload.mobile_number).replace(/\D/g, '');
      const cleanPhone = raw.length === 12 && raw.startsWith('91') ? raw.slice(2) : raw.length === 11 && raw.startsWith('0') ? raw.slice(1) : raw;
      workUpdate.mobile_number = cleanPhone;
      updateObj.mobile_number = cleanPhone;
    }

    if (updatePayload.alternatePhone !== undefined || updatePayload.alternate_phone !== undefined) {
      const raw = String(updatePayload.alternatePhone ?? updatePayload.alternate_phone ?? '').replace(/\D/g, '');
      const cleanAlt = raw ? (raw.length === 12 && raw.startsWith('91') ? raw.slice(2) : raw.length === 11 && raw.startsWith('0') ? raw.slice(1) : raw) : null;
      workUpdate.alternate_phone = cleanAlt;
      updateObj.alternate_phone = cleanAlt;
    }

    if (updatePayload.email !== undefined) {
      workUpdate.email = updatePayload.email || null;
      updateObj.email = updatePayload.email || null;
    }

    if (updatePayload.address !== undefined || updatePayload.delivery_address !== undefined) {
      const addr = updatePayload.address ?? updatePayload.delivery_address ?? null;
      workUpdate.delivery_address = addr;
      updateObj.street_area = addr;
    }

    if (updatePayload.orderNotes !== undefined || updatePayload.comments !== undefined || updatePayload.special_instructions !== undefined) {
      const notes = updatePayload.orderNotes ?? updatePayload.comments ?? updatePayload.special_instructions ?? null;
      workUpdate.special_instructions = notes;
      updateObj.order_notes = notes;
    }

    if (updatePayload.status || updatePayload.order_status) {
      const rawSt = updatePayload.status || updatePayload.order_status;
      workUpdate.work_status = normalizeDbStatus(rawSt);
      updateObj.order_status = rawSt;
    }

    if (updatePayload.priority) {
      workUpdate.priority = normalizeDbPriority(updatePayload.priority);
    }

    if (updatePayload.orderType || updatePayload.order_type || updatePayload.intake_method) {
      const intakeVal = updatePayload.orderType || updatePayload.order_type || updatePayload.intake_method;
      workUpdate.intake_method = normalizeDbIntakeMethod(intakeVal);
    }

    if (updatePayload.advancePaid !== undefined || updatePayload.advance_paid !== undefined) {
      workUpdate.advance_paid = Number(updatePayload.advancePaid ?? updatePayload.advance_paid ?? 0);
    }

    if (updatePayload.paymentStatus || updatePayload.payment_status) {
      workUpdate.payment_status = normalizeDbPaymentStatus(updatePayload.paymentStatus || updatePayload.payment_status);
    }

    if (updatePayload.paymentMethod || updatePayload.payment_method || updatePayload.paymentMode) {
      const rawMethod = updatePayload.paymentMethod || updatePayload.payment_method || updatePayload.paymentMode;
      workUpdate.payment_method = normalizeDbPaymentMethod(rawMethod);
    }

    if (updatePayload.attend_staff_id !== undefined) {
      workUpdate.attend_staff_id = updatePayload.attend_staff_id || null;
    }
    if (updatePayload.attend_staff_name !== undefined) {
      workUpdate.attend_staff_name = updatePayload.attend_staff_name || null;
    }
    if (updatePayload.assigned_pickup_person_id !== undefined) {
      workUpdate.assigned_pickup_person_id = updatePayload.assigned_pickup_person_id || null;
    }
    if (updatePayload.assigned_pickup_delivery_person !== undefined) {
      workUpdate.assigned_pickup_delivery_person = updatePayload.assigned_pickup_delivery_person || null;
    }
    if (updatePayload.attend_staff_name || updatePayload.assignedStaff || updatePayload.assigned_staff || updatePayload.assignedDriver || updatePayload.assigned_driver) {
      workUpdate.assigned_staff = updatePayload.attend_staff_name || updatePayload.assignedStaff || updatePayload.assigned_staff || updatePayload.assignedDriver || updatePayload.assigned_driver;
    }

    if (updatePayload.rackShelfLocation || updatePayload.rack_shelf_location) {
      workUpdate.rack_shelf_location = updatePayload.rackShelfLocation || updatePayload.rack_shelf_location;
    }

    if (updatePayload.weight_kg !== undefined || updatePayload.product_weight !== undefined) {
      workUpdate.weight_kg = Number(updatePayload.weight_kg ?? updatePayload.product_weight);
    }

    // Fetch existing customer_works record so partial updates preserve internal_notes & allow diffing
    const numMatch = String(formattedId).match(/\d+/);
    const num = numMatch ? parseInt(numMatch[0], 10) : null;
    const ordId = num ? `ORD${String(num).padStart(5, '0')}` : formattedId;
    const workIdPattern = num ? `WORK-${String(num).padStart(5, '0')}` : formattedId;
    const orderIdPattern = num ? `ORDER-${String(num).padStart(5, '0')}` : formattedId;
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(formattedId);
    const orFilter = isUuid
      ? `work_number.eq.${ordId},work_number.eq.${workIdPattern},work_number.eq.${orderIdPattern},work_id.eq.${formattedId}`
      : `work_number.eq.${ordId},work_number.eq.${workIdPattern},work_number.eq.${orderIdPattern},work_number.eq.${formattedId}`;

    let existingRow = null;
    let prevNotesObj = {};
    try {
      const { data: exData } = await supabase.from('customer_works').select('*').or(orFilter).limit(1).maybeSingle();
      if (exData) {
        existingRow = exData;
        if (exData.internal_notes) {
          prevNotesObj = typeof exData.internal_notes === 'string' ? JSON.parse(exData.internal_notes) : exData.internal_notes;
        }
      }
    } catch {}

    // Auto-capture completion and delivery timestamps (checking normalized 'Ready for Delivery')
    if (
      (workUpdate.work_status === 'Ready for Delivery' || workUpdate.work_status === 'Ready' || updatePayload.status === 'Ready') &&
      !updatePayload.completed_at
    ) {
      workUpdate.completed_at = new Date().toISOString();
    }
    if ((workUpdate.work_status === 'Delivered' || updatePayload.status === 'Delivered') && !updatePayload.delivered_at) {
      workUpdate.delivered_at = new Date().toISOString();
    }
    if (updatePayload.completed_at) {
      workUpdate.completed_at = new Date(updatePayload.completed_at).toISOString();
    }
    if (updatePayload.delivered_at) {
      workUpdate.delivered_at = new Date(updatePayload.delivered_at).toISOString();
    }

    // Delivery & Intake date parsing
    const rawIntake = updatePayload.intakeDate || updatePayload.intake_date || updatePayload.pickupDate;
    if (rawIntake) {
      const dIn = new Date(rawIntake);
      if (!isNaN(dIn.getTime())) workUpdate.intake_date = dIn.toISOString();
    }
    const rawDelivery = updatePayload.deliveryDate || updatePayload.expectedDelivery || updatePayload.target_delivery_date;
    const expectedDeliveryDisplay = rawDelivery || prevNotesObj.expected_delivery_display || '';
    if (rawDelivery) {
      const d = new Date(rawDelivery);
      if (!isNaN(d.getTime())) {
        workUpdate.target_delivery_date = d.toISOString();
      }
    }

    // On-Call Pickup & Delivery scheduling timestamps
    const hasScheduledPickup = updatePayload.scheduled_pickup_at !== undefined || updatePayload.scheduledPickupAt !== undefined;
    const rawScheduledPickup = updatePayload.scheduled_pickup_at !== undefined ? updatePayload.scheduled_pickup_at : updatePayload.scheduledPickupAt;
    let nextScheduledPickupAt = prevNotesObj.scheduled_pickup_at ?? existingRow?.scheduled_pickup_at ?? null;
    if (hasScheduledPickup) {
      if (!rawScheduledPickup) {
        nextScheduledPickupAt = null;
        workUpdate.scheduled_pickup_at = null;
        updateObj.scheduled_pickup_at = null;
      } else {
        const dPickup = new Date(rawScheduledPickup);
        if (!isNaN(dPickup.getTime())) {
          nextScheduledPickupAt = dPickup.toISOString();
          workUpdate.scheduled_pickup_at = nextScheduledPickupAt;
          updateObj.scheduled_pickup_at = nextScheduledPickupAt;
        }
      }
    }

    const hasScheduledDelivery = updatePayload.scheduled_delivery_at !== undefined || updatePayload.scheduledDeliveryAt !== undefined;
    const rawScheduledDelivery = updatePayload.scheduled_delivery_at !== undefined ? updatePayload.scheduled_delivery_at : updatePayload.scheduledDeliveryAt;
    let nextScheduledDeliveryAt = prevNotesObj.scheduled_delivery_at ?? existingRow?.scheduled_delivery_at ?? null;
    if (hasScheduledDelivery) {
      if (!rawScheduledDelivery) {
        nextScheduledDeliveryAt = null;
        workUpdate.scheduled_delivery_at = null;
        updateObj.scheduled_delivery_at = null;
      } else {
        const dDeliv = new Date(rawScheduledDelivery);
        if (!isNaN(dDeliv.getTime())) {
          nextScheduledDeliveryAt = dDeliv.toISOString();
          workUpdate.scheduled_delivery_at = nextScheduledDeliveryAt;
          updateObj.scheduled_delivery_at = nextScheduledDeliveryAt;
        }
      }
    }

    // GST & Tax Exemption breakdown
    const hasTaxExemptFlag = updatePayload.taxExemption !== undefined || updatePayload.tax_exemption !== undefined;
    const isTaxExempt = hasTaxExemptFlag ? Boolean(updatePayload.taxExemption ?? updatePayload.tax_exemption) : Boolean(existingRow?.tax_exemption);
    if (hasTaxExemptFlag) {
      workUpdate.tax_exemption = isTaxExempt;
    }
    if (workUpdate.subtotal !== undefined || workUpdate.tax_amount !== undefined) {
      const effSub = Number(workUpdate.subtotal ?? existingRow?.subtotal ?? 0);
      const effDisc = Number(workUpdate.discount_amount ?? existingRow?.discount_amount ?? 0);
      const effTax = Number(workUpdate.tax_amount ?? existingRow?.tax_amount ?? 0);
      workUpdate.taxable_amount = Math.max(0, +(effSub - effDisc).toFixed(2));
      workUpdate.gst_percentage = isTaxExempt ? 0 : 5;
      workUpdate.cgst_amount = isTaxExempt ? 0 : +(effTax / 2).toFixed(2);
      workUpdate.sgst_amount = isTaxExempt ? 0 : +(effTax - workUpdate.cgst_amount).toFixed(2);
      workUpdate.igst_amount = 0;
    }
    if (updatePayload.staff_notes !== undefined) {
      workUpdate.staff_notes = updatePayload.staff_notes || null;
    }
    if (updatePayload.flags !== undefined) {
      workUpdate.handling_flags = updatePayload.flags || {};
    }
    workUpdate.updated_by_name = updatePayload.updated_by_name || updatePayload.attend_staff_name || updatePayload.status_updated_by || updatePayload.assignedStaff || 'POS Counter';

    if (updatePayload.items) {
      workUpdate.items = updatePayload.items;
      workUpdate.total_pieces = updatePayload.items.reduce((s, i) => s + (Number(i.qty) || 1), 0);
      updateObj.customer_history = {
        ...(updateObj.customer_history || {}),
        items: updatePayload.items,
        updated_at: new Date().toISOString(),
      };
    }

    // Merge internal notes cleanly without overwriting existing fields on partial updates
    const inspData = updatePayload.garment_inspections || updatePayload.inspections || prevNotesObj.garment_inspections || {};
    const targetStatus = updatePayload.status || updatePayload.order_status;
    const targetPropertyStatus = updatePayload.property_status || (updatePayload.priority === 'Yes' ? 'Yes' : prevNotesObj.property_status || 'No');
    const nextAttendStaff = updatePayload.attend_staff_name ?? updatePayload.status_updated_by ?? updatePayload.assignedStaff ?? prevNotesObj.attend_staff_name ?? '';
    const nextPickupPerson = updatePayload.assigned_pickup_delivery_person ?? updatePayload.assigned_driver ?? prevNotesObj.assigned_pickup_delivery_person ?? '';
    const notesPayload = {
      ...prevNotesObj,
      garment_inspections: inspData,
      expected_delivery_display: expectedDeliveryDisplay,
      scheduled_pickup_at: nextScheduledPickupAt,
      scheduled_delivery_at: nextScheduledDeliveryAt,
      payment_method_display: updatePayload.paymentMethod || updatePayload.payment_method || updatePayload.paymentMode || prevNotesObj.payment_method_display || '',
      assigned_driver: nextPickupPerson || updatePayload.assignedStaff || prevNotesObj.assigned_driver || '',
      assigned_driver_full: updatePayload.assigned_driver_full ?? (nextPickupPerson || prevNotesObj.assigned_driver_full || ''),
      attend_staff_id: updatePayload.attend_staff_id !== undefined ? updatePayload.attend_staff_id : (prevNotesObj.attend_staff_id ?? null),
      attend_staff_name: nextAttendStaff,
      assigned_pickup_person_id: updatePayload.assigned_pickup_person_id !== undefined ? updatePayload.assigned_pickup_person_id : (prevNotesObj.assigned_pickup_person_id ?? null),
      assigned_pickup_delivery_person: nextPickupPerson,
      status_updated_at: updatePayload.status_updated_at ?? (targetStatus ? new Date().toISOString() : prevNotesObj.status_updated_at) ?? new Date().toISOString(),
      status_updated_by: updatePayload.status_updated_by ?? (nextAttendStaff || prevNotesObj.status_updated_by || ''),
      activity_history: Array.isArray(updatePayload.activity_history) ? updatePayload.activity_history : (Array.isArray(updatePayload.audit_logs) ? updatePayload.audit_logs : (Array.isArray(prevNotesObj.activity_history) ? prevNotesObj.activity_history : [])),
      payment_received_at: updatePayload.payment_received_at !== undefined ? updatePayload.payment_received_at : (prevNotesObj.payment_received_at ?? null),
      payment_received_by: updatePayload.payment_received_by ?? (nextAttendStaff || prevNotesObj.payment_received_by || ''),
      collection_at: updatePayload.collection_at !== undefined ? updatePayload.collection_at : ((targetStatus === 'Delivered' || workUpdate.work_status === 'Delivered') ? (prevNotesObj.collection_at || new Date().toISOString()) : (prevNotesObj.collection_at ?? null)),
      collected_by_person: updatePayload.collected_by_person ?? prevNotesObj.collected_by_person ?? '',
      assigned_for_pickup: updatePayload.assigned_for_pickup ?? prevNotesObj.assigned_for_pickup ?? Boolean(updatePayload.pickupStatus === 'Assigned for Pickup'),
      pickup_status: updatePayload.pickupStatus ?? updatePayload.pickup_status ?? prevNotesObj.pickup_status ?? '',
      pickup_delivery: updatePayload.pickupDelivery ?? updatePayload.pickup_delivery ?? prevNotesObj.pickup_delivery ?? '',
      routing_type: updatePayload.routing_type ?? prevNotesObj.routing_type ?? 'factory',
      factory_hub: updatePayload.factory_hub ?? updatePayload.factory_outlet ?? prevNotesObj.factory_hub ?? 'Main Plant (Unit 1)',
      factory_outlet: updatePayload.factory_outlet ?? updatePayload.factory_hub ?? prevNotesObj.factory_outlet ?? 'Main Plant (Unit 1)',
      store_outlet: updatePayload.store_outlet ?? prevNotesObj.store_outlet ?? 'Store Outlet #1 (Central Vellore Main)',
      workshop_station: updatePayload.workshop_station ?? prevNotesObj.workshop_station ?? '',
      factory_manifest_no: updatePayload.factory_manifest_no ?? prevNotesObj.factory_manifest_no ?? '',
      dispatch_bag_tag: updatePayload.dispatch_bag_tag ?? updatePayload.dispatchBagTag ?? prevNotesObj.dispatch_bag_tag ?? '',
      factory_gate_in: updatePayload.factory_gate_in ?? prevNotesObj.factory_gate_in ?? '',
      factory_gate_out: updatePayload.factory_gate_out ?? prevNotesObj.factory_gate_out ?? '',
      factory_supervisor: updatePayload.factory_supervisor ?? prevNotesObj.factory_supervisor ?? 'Murugan (Plant Supervisor)',
      vehicle_name: updatePayload.vehicle_name ?? updatePayload.vehicleNo ?? prevNotesObj.vehicle_name ?? '',
      mode_of_transport: updatePayload.mode_of_transport ?? prevNotesObj.mode_of_transport ?? 'Mini Van',
      weight_kg: updatePayload.weight_kg !== undefined ? updatePayload.weight_kg : (prevNotesObj.weight_kg ?? existingRow?.weight_kg ?? null),
      route_from_to: updatePayload.route_from_to ?? updatePayload.routeZone ?? prevNotesObj.route_from_to ?? '',
      route_return: updatePayload.route_return ?? prevNotesObj.route_return ?? '',
      collected_by_staff: updatePayload.collected_by_staff ?? updatePayload.assignedStaff ?? prevNotesObj.collected_by_staff ?? '',
      plant_transit_status: updatePayload.plant_transit_status ?? prevNotesObj.plant_transit_status ?? '',
      staff_notes: updatePayload.staff_notes ?? prevNotesObj.staff_notes ?? '',
      flags: updatePayload.flags ?? prevNotesObj.flags ?? {},
      order_status: targetStatus ? normalizeOrderStatus(targetStatus) : prevNotesObj.order_status,
      property_status: targetPropertyStatus,
    };
    workUpdate.internal_notes = JSON.stringify(notesPayload);
    updateObj.customer_history = {
      ...(updateObj.customer_history || {}),
      garment_inspections: inspData,
      ...notesPayload,
    };

    // Execute customer_works update (with automatic fallback if extended columns aren't migrated yet)
    try {
      const { error: cwUpdateErr } = await supabase.from('customer_works').update(workUpdate).or(orFilter);
      if (cwUpdateErr && (cwUpdateErr.code === 'PGRST204' || String(cwUpdateErr.message).includes('column'))) {
        const {
          tax_exemption, taxable_amount, gst_percentage, cgst_amount, sgst_amount, igst_amount,
          staff_notes, handling_flags, updated_by_name,
          attend_staff_id, attend_staff_name, assigned_pickup_person_id, assigned_pickup_delivery_person,
          scheduled_pickup_at, scheduled_delivery_at,
          ...baseWorkUpdate
        } = workUpdate;
        await supabase.from('customer_works').update(baseWorkUpdate).or(orFilter);
      }
    } catch (cwErr) {
      console.warn('customer_works update error:', cwErr);
    }

    // 2. Also try washdoor_orders_master if present
    try {
      let query = supabase.from('washdoor_orders_master').update(updateObj);

      if (formattedId.startsWith('ORDER-') || formattedId.startsWith('WD-')) {
        query = query.eq('order_number', formattedId);
      } else {
        query = query.or(`order_number.eq.${formattedId},order_id.eq.${formattedId}`);
      }
      await query;
    } catch {}

    // 3. Synchronize item records, garment cards, inspections & photos
    const targetWorkKey = existingRow?.work_id || formattedId;
    const targetWorkNum = existingRow?.work_number || ordId;
    const hasInspectionsUpdate = Boolean(updatePayload.garment_inspections || updatePayload.inspections);
    const itemsForSync = Array.isArray(updatePayload.items) ? updatePayload.items : (existingRow?.items || []);
    if (updatePayload.items && Array.isArray(updatePayload.items)) {
      try {
        await saveOrderItems(targetWorkNum, updatePayload.items, targetWorkKey);
      } catch (itemErr) {
        console.warn('saveOrderItems update note:', itemErr);
      }
    }
    if ((updatePayload.items && Array.isArray(updatePayload.items)) || hasInspectionsUpdate) {
      try {
        await syncGarmentCardsAndInspections(targetWorkKey, targetWorkNum, itemsForSync, inspData);
      } catch (cardErr) {
        console.warn('syncGarmentCardsAndInspections update note:', cardErr);
      }
    }

    // 4. Sync dedicated washdoor_factory_orders table
    const hasFactoryOrLogistics = Boolean(
      updatePayload.factory_hub || updatePayload.factory_outlet || updatePayload.factoryPlant ||
      updatePayload.store_outlet || updatePayload.workshop_station || updatePayload.factory_manifest_no ||
      updatePayload.vehicle_name || updatePayload.vehicleNo || updatePayload.plant_transit_status ||
      updatePayload.assignedMachine || updatePayload.qcInspector || updatePayload.dispatchBagTag ||
      updatePayload.logisticsStatus || updatePayload.routing_type
    );
    if (hasFactoryOrLogistics) {
      try {
        await upsertFactoryOrder(targetWorkKey, {
          ...updatePayload,
          work_number: targetWorkNum,
          weight_kg: workUpdate.weight_kg ?? notesPayload.weight_kg,
          rack_shelf_location: workUpdate.rack_shelf_location,
        });
      } catch {}
    }

    // 5. Sync dedicated washdoor_pickup_delivery_schedules table
    if (
      updatePayload.scheduleType || updatePayload.scheduleDate || updatePayload.scheduleSlot ||
      updatePayload.pickupTime || updatePayload.deliverySlot || updatePayload.pickupStatus || updatePayload.logisticsStatus
    ) {
      try {
        await recordPickupDeliverySchedule(targetWorkKey, {
          scheduleType: updatePayload.scheduleType || 'Delivery',
          scheduleDate: updatePayload.scheduleDate,
          scheduleSlot: updatePayload.scheduleSlot || updatePayload.deliverySlot,
          pickupTime: updatePayload.pickupTime,
          deliverySlot: updatePayload.deliverySlot,
          assignedDriver: updatePayload.assigned_driver || updatePayload.assignedStaff,
          assignedDriverFull: updatePayload.assigned_driver_full,
          riderPhone: updatePayload.riderPhone,
          vehicleNo: updatePayload.vehicleNo || updatePayload.vehicle_name,
          routeZone: updatePayload.routeZone || updatePayload.route_from_to,
          address: updatePayload.address,
          status: updatePayload.pickupStatus || updatePayload.logisticsStatus || 'Scheduled',
          driverInstructions: updatePayload.driverInstructions,
        });
      } catch {}
    }

    // 6. Record granular workflow steps & status transitions with timestamps & staff details
    const staffName = updatePayload.attend_staff_name || updatePayload.status_updated_by || updatePayload.updated_by_name || updatePayload.changed_by_name || getActiveStaffProfile().name;
    workUpdate.updated_by_name = staffName;
    try {
      if (workUpdate.work_status && workUpdate.work_status !== existingRow?.work_status) {
        await recordStatusHistory({
          work_id: targetWorkKey,
          work_number: targetWorkNum,
          step_name: 'Order Status Update',
          stage: workUpdate.work_status === 'Delivered' ? 'Delivery' : 'Processing',
          old_status: existingRow?.work_status || null,
          new_status: workUpdate.work_status,
          changed_by_name: staffName,
          remarks: updatePayload.statusRemark || `Status transitioned from "${existingRow?.work_status || 'New'}" to "${targetStatus || workUpdate.work_status}"`,
        });
      }

      if (notesPayload.plant_transit_status && notesPayload.plant_transit_status !== prevNotesObj.plant_transit_status) {
        await recordStatusHistory({
          work_id: targetWorkKey,
          work_number: targetWorkNum,
          entity_type: 'Batch',
          step_name: 'Factory Processing / Transit Stage',
          stage: String(notesPayload.plant_transit_status).toLowerCase().includes('store') ? 'Delivery' : 'Processing',
          old_status: prevNotesObj.plant_transit_status || null,
          new_status: notesPayload.plant_transit_status,
          changed_by_name: staffName,
          remarks: `Factory plant stage updated to ${notesPayload.plant_transit_status} (${notesPayload.factory_outlet || notesPayload.factory_hub || 'Plant'})`,
        });
      }

      const nextDriver = updatePayload.assigned_pickup_delivery_person || updatePayload.assigned_driver || updatePayload.assignedDriver;
      if (nextDriver && nextDriver !== (prevNotesObj.assigned_driver || existingRow?.assigned_staff)) {
        await recordStatusHistory({
          work_id: targetWorkKey,
          work_number: targetWorkNum,
          entity_type: 'Driver_Assignment',
          step_name: 'Driver Assigned / Reassigned',
          stage: updatePayload.scheduleType === 'Pickup' || updatePayload.pickupStatus ? 'Pickup' : 'Delivery',
          old_status: prevNotesObj.assigned_driver || existingRow?.assigned_staff || null,
          new_status: nextDriver,
          changed_by_name: staffName,
          remarks: `Assigned driver ${nextDriver}${updatePayload.pickupDelivery ? ` (${updatePayload.pickupDelivery})` : ''}`,
        });
      }

      if (workUpdate.rack_shelf_location && workUpdate.rack_shelf_location !== existingRow?.rack_shelf_location) {
        await recordStatusHistory({
          work_id: targetWorkKey,
          work_number: targetWorkNum,
          step_name: 'Rack / Shelf Assigned',
          stage: 'Shop',
          old_status: existingRow?.rack_shelf_location || null,
          new_status: workUpdate.rack_shelf_location,
          changed_by_name: staffName,
          remarks: `Order placed on shelf ${workUpdate.rack_shelf_location}`,
        });
      }

      if (hasInspectionsUpdate && Object.keys(inspData || {}).length > 0) {
        const prevInsp = prevNotesObj.garment_inspections || {};
        const changedStages = Object.entries(inspData).filter(([k, val]) => {
          const prev = prevInsp[k];
          return val && (!prev || prev.processingStage !== val.processingStage || Boolean(prev.qcPassed) !== Boolean(val.qcPassed));
        });
        if (changedStages.length > 0) {
          const summaryStr = changedStages.slice(0, 3).map(([, v]) => `${v.name} (${v.processingStage || 'Received'}${v.qcPassed ? ', QC✓' : ''})`).join(', ');
          await recordStatusHistory({
            work_id: targetWorkKey,
            work_number: targetWorkNum,
            entity_type: 'Garment_Unit',
            step_name: 'Garment Unit Workflow / QC Update',
            stage: 'Processing',
            new_status: summaryStr,
            changed_by_name: staffName,
            remarks: `Updated ${changedStages.length} garment unit(s): ${summaryStr}`,
          });
        }
      }
    } catch {}

    // 7. Record incremental payment in washdoor_payment_ledger if advance_paid increased
    if (workUpdate.advance_paid !== undefined) {
      const prevPaid = Number(existingRow?.advance_paid || 0);
      const deltaPaid = Number((workUpdate.advance_paid - prevPaid).toFixed(2));
      if (deltaPaid > 0) {
        try {
          await recordPaymentLedger({
            work_id: targetWorkKey,
            work_number: targetWorkNum,
            customer_id: existingRow?.customer_id || 'Counter Customer',
            amount: deltaPaid,
            payment_mode: updatePayload.paymentMethod || updatePayload.payment_method || updatePayload.paymentMode || 'Cash',
            reference_number: updatePayload.transactionRef || null,
            notes: updatePayload.paymentNote || 'Payment recorded via POS edit',
            collected_by: staffName,
            entry_type: workUpdate.payment_status === 'Paid' ? 'Full_Payment' : 'Partial_Payment',
          });
          await recordStatusHistory({
            work_id: targetWorkKey,
            work_number: targetWorkNum,
            step_name: 'Payment Settlement',
            stage: 'Payment',
            new_status: `+₹${deltaPaid.toFixed(2)} (${workUpdate.payment_status || 'Paid'})`,
            changed_by_name: staffName,
            remarks: `Collected ₹${deltaPaid.toFixed(2)} via ${updatePayload.paymentMethod || updatePayload.payment_method || 'Cash'}`,
          });
        } catch {}
      }
    }

    // 8. Record activity in washdoor_audit_logs
    try {
      await recordAuditLogEntry({
        entity_name: 'customer_works',
        record_id: targetWorkKey,
        work_id: existingRow?.work_id || null,
        operation: 'UPDATE',
        entity_label: targetWorkNum,
        old_data: existingRow ? { work_status: existingRow.work_status, total_amount: existingRow.total_amount, advance_paid: existingRow.advance_paid } : null,
        new_data: { order_number: targetWorkNum, work_status: workUpdate.work_status || existingRow?.work_status, total_amount: workUpdate.total_amount, advance_paid: workUpdate.advance_paid },
        changed_by_name: staffName,
        details: `Order ${targetWorkNum} updated by ${staffName}${targetStatus ? ` (Status: ${targetStatus})` : ''}.`,
      });
    } catch {}

    // Instant local cache sync
    try {
      if (typeof localStorage !== 'undefined') {
        const cachedRaw = localStorage.getItem('washdoor_orders_cache');
        if (cachedRaw) {
          const cachedList = JSON.parse(cachedRaw);
          const updatedList = cachedList.map((o) => {
            if (o.order_number === formattedId || o.id === formattedId || o.order_id === formattedId) {
              return {
                ...o,
                total_amount: workUpdate.total_amount !== undefined ? workUpdate.total_amount : o.total_amount,
                subtotal: workUpdate.subtotal !== undefined ? workUpdate.subtotal : o.subtotal,
                discount_amount: workUpdate.discount_amount !== undefined ? workUpdate.discount_amount : o.discount_amount,
                tax_amount: workUpdate.tax_amount !== undefined ? workUpdate.tax_amount : o.tax_amount,
                advance_paid: workUpdate.advance_paid !== undefined ? workUpdate.advance_paid : o.advance_paid,
                balance_due: workUpdate.total_amount !== undefined && workUpdate.advance_paid !== undefined ? Math.max(0, workUpdate.total_amount - workUpdate.advance_paid) : o.balance_due,
                item_count: workUpdate.total_pieces !== undefined ? workUpdate.total_pieces : o.item_count,
                total_pieces: workUpdate.total_pieces !== undefined ? workUpdate.total_pieces : o.total_pieces,
                preference: updatePayload.serviceCategory || updatePayload.service_type || o.preference,
                service_category: updatePayload.serviceCategory || updatePayload.service_type || o.service_category,
                service_type: updatePayload.serviceCategory || updatePayload.service_type || o.service_type,
                preference_notes: updatePayload.orderNotes || updatePayload.comments || o.preference_notes,
                order_notes: updatePayload.orderNotes || updatePayload.comments || o.order_notes,
                special_instructions: updatePayload.orderNotes || updatePayload.comments || o.special_instructions,
                comments: updatePayload.comments || updatePayload.orderNotes || o.comments,
                customer_name: updatePayload.customerName || updatePayload.customer_name || o.customer_name,
                mobile_number: updatePayload.mobileNumber || updatePayload.mobile_number || o.mobile_number,
                alternate_phone: updatePayload.alternatePhone || updatePayload.alternate_phone || o.alternate_phone,
                email: updatePayload.email || o.email,
                address: updatePayload.address || updatePayload.delivery_address || o.address,
                delivery_address: updatePayload.address || updatePayload.delivery_address || o.delivery_address,
                status: targetStatus ? normalizeOrderStatus(targetStatus) : o.status,
                order_status: targetStatus ? normalizeOrderStatus(targetStatus) : o.order_status,
                property_status: targetPropertyStatus || o.property_status || 'No',
                priority: targetPropertyStatus === 'Yes' ? 'Yes' : (updatePayload.priority || o.priority || 'Normal'),
                order_type: updatePayload.orderType || updatePayload.order_type || o.order_type,
                intake_method: updatePayload.orderType || updatePayload.order_type || o.intake_method,
                expected_delivery: expectedDeliveryDisplay || o.expected_delivery,
                delivery_date: expectedDeliveryDisplay || o.delivery_date,
                scheduled_pickup_at: hasScheduledPickup ? nextScheduledPickupAt : o.scheduled_pickup_at,
                scheduled_delivery_at: hasScheduledDelivery ? nextScheduledDeliveryAt : o.scheduled_delivery_at,
                payment_status: updatePayload.paymentStatus || updatePayload.payment_status || o.payment_status,
                payment_method: updatePayload.paymentMethod || updatePayload.payment_method || updatePayload.paymentMode || o.payment_method,
                assigned_staff: workUpdate.assigned_staff || o.assigned_staff,
                attend_staff_name: notesPayload.attend_staff_name || o.attend_staff_name,
                assigned_pickup_delivery_person: notesPayload.assigned_pickup_delivery_person !== undefined ? notesPayload.assigned_pickup_delivery_person : o.assigned_pickup_delivery_person,
                assigned_driver: notesPayload.assigned_driver || o.assigned_driver,
                assigned_driver_full: notesPayload.assigned_driver_full || o.assigned_driver_full,
                status_updated_at: notesPayload.status_updated_at || o.status_updated_at,
                status_updated_by: notesPayload.status_updated_by || o.status_updated_by,
                activity_history: notesPayload.activity_history && notesPayload.activity_history.length > 0 ? notesPayload.activity_history : o.activity_history,
                payment_received_at: notesPayload.payment_received_at !== undefined ? notesPayload.payment_received_at : o.payment_received_at,
                payment_received_by: notesPayload.payment_received_by || o.payment_received_by,
                collection_at: notesPayload.collection_at !== undefined ? notesPayload.collection_at : o.collection_at,
                collected_by_person: notesPayload.collected_by_person !== undefined ? notesPayload.collected_by_person : o.collected_by_person,
                updated_at: workUpdate.updated_at,
                items: updatePayload.items || o.items,
                garment_inspections: inspData,
                inspections: inspData,
                customer_history: {
                  ...(o.customer_history || {}),
                  items: updatePayload.items || o.customer_history?.items || [],
                },
              };
            }
            return o;
          });
          localStorage.setItem('washdoor_orders_cache', JSON.stringify(updatedList));
        }
      }
    } catch (cacheErr) {
      console.warn('Cache sync error:', cacheErr);
    }

    return { data: [{ order_number: formattedId }], error: null };
  } catch (err) {
    console.error('updateOrder catch:', err);
    return { data: null, error: err };
  }
}

/**
 * Dedicated Supabase Update Service:
 * Directly updates an order in Supabase customer_works (and washdoor_orders_master).
 * Guarantees immutability of canonical identifiers: order_id, work_id, order_number, work_number, created_at.
 * Automatically injects updated_at timestamp.
 */
export async function updateOrderInSupabase(orderNumberOrId, updatePayload = {}) {
  return updateOrder(orderNumberOrId, updatePayload);
}

/**
 * Fetches the latest single order data from Supabase customer_works.
 */
export async function getOrderById(identifier) {
  if (!isSupabaseConfigured() || !identifier) {
    return { data: null, error: 'Supabase not configured' };
  }
  try {
    const numMatch = String(identifier).match(/\d+/);
    const num = numMatch ? parseInt(numMatch[0], 10) : null;
    const ordId = num ? `ORD${String(num).padStart(5, '0')}` : identifier;
    const workId = num ? `WORK-${String(num).padStart(5, '0')}` : identifier;
    const orderIdPattern = num ? `ORDER-${String(num).padStart(5, '0')}` : identifier;
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(identifier);

    let query = supabase.from('customer_works').select('*');
    if (isUuid) {
      query = query.or(`work_number.eq.${ordId},work_number.eq.${workId},work_number.eq.${orderIdPattern},work_id.eq.${identifier}`);
    } else {
      query = query.or(`work_number.eq.${ordId},work_number.eq.${workId},work_number.eq.${orderIdPattern},work_number.eq.${identifier}`);
    }

    const { data, error } = await query.limit(1).maybeSingle();

    if (error || !data) {
      return { data: null, error: error?.message || 'Order not found' };
    }
    return { data: mapCustomerWorkRowToOrder(data), error: null };
  } catch (err) {
    return { data: null, error: err.message };
  }
}

/**
 * Deletes an order from Supabase customer_works and washdoor_orders_master.
 */
export async function deleteOrderFromSupabase(identifier) {
  if (!isSupabaseConfigured() || !identifier) {
    return { success: false, error: 'Supabase not configured' };
  }
  try {
    const numMatch = String(identifier).match(/\d+/);
    const num = numMatch ? parseInt(numMatch[0], 10) : null;
    const ordId = num ? `ORD${String(num).padStart(5, '0')}` : identifier;
    const workId = num ? `WORK-${String(num).padStart(5, '0')}` : identifier;
    const orderIdPattern = num ? `ORDER-${String(num).padStart(5, '0')}` : identifier;
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(identifier);

    // 1. Delete from customer_works
    let delQuery = supabase.from('customer_works').delete();
    if (isUuid) {
      delQuery = delQuery.or(`work_number.eq.${ordId},work_number.eq.${workId},work_number.eq.${orderIdPattern},work_id.eq.${identifier}`);
    } else {
      delQuery = delQuery.or(`work_number.eq.${ordId},work_number.eq.${workId},work_number.eq.${orderIdPattern},work_number.eq.${identifier}`);
    }
    const { error: workErr } = await delQuery;

    // 2. Also best-effort delete from washdoor_orders_master if present
    try {
      await supabase
        .from('washdoor_orders_master')
        .delete()
        .or(`order_number.eq.${identifier},order_id.eq.${identifier}`);
    } catch {}

    if (workErr) {
      console.warn('Supabase deleteOrder warning:', workErr);
      return { success: false, error: workErr.message };
    }

    await recordAuditLogEntry({
      entity_name: 'customer_works',
      record_id: String(identifier),
      operation: 'DELETE',
      entity_label: ordId,
      old_data: { order_identifier: identifier },
      details: `Deleted order ${ordId} (${identifier}).`,
    }).catch(() => {});

    return { success: true, error: null };
  } catch (err) {
    console.error('deleteOrderFromSupabase catch:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Sanitizes form payload by turning empty strings into nulls and standardizing numbers
 */
function cleanPayload(obj) {
  if (!obj) return {};
  const cleaned = { ...obj };
  if (cleaned.mobile_number) {
    const raw = String(cleaned.mobile_number).replace(/\D/g, '');
    cleaned.mobile_number = raw.length === 12 && raw.startsWith('91') ? raw.slice(2) : raw.length === 11 && raw.startsWith('0') ? raw.slice(1) : raw;
  }
  if (cleaned.alternate_phone) {
    const rawAlt = String(cleaned.alternate_phone).replace(/\D/g, '');
    cleaned.alternate_phone = rawAlt.length === 12 && rawAlt.startsWith('91') ? rawAlt.slice(2) : rawAlt.length === 11 && rawAlt.startsWith('0') ? rawAlt.slice(1) : rawAlt;
  }
  Object.keys(cleaned).forEach((key) => {
    if (typeof cleaned[key] === 'string' && cleaned[key].trim() === '') {
      cleaned[key] = null;
    }
  });
  return cleaned;
}
