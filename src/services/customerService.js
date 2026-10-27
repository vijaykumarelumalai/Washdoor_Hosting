// src/services/customerService.js
// 100% Real Database Service connected to Supabase 'washdoor_orders_master'
// Zero hardcoded mock customer data.

import { supabase, isSupabaseConfigured } from '../lib/supabaseClient.js';

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

// Helper to format any Order ID into canonical ORDER-00001 (5-digit padded, starting with ORDER)
export function formatOrderId(id) {
  if (!id) return 'ORDER-00001';
  const str = String(id).trim();
  const match = str.match(/ORDER-(\d+)/i) || str.match(/\d+/);
  if (match) {
    const num = parseInt(match[1] || match[0], 10);
    return `ORDER-${String(num).padStart(5, '0')}`;
  }
  return str.toUpperCase().startsWith('ORDER-') ? str.toUpperCase() : `ORDER-${str.toUpperCase()}`;
}

/**
 * Computes the next unique sequential order identifier starting from ORDER-00001
 * by querying real existing records in washdoor_orders_master.
 */
export async function getNextOrderId() {
  try {
    if (isSupabaseConfigured()) {
      const { data, error } = await supabase
        .from('washdoor_orders_master')
        .select('order_number')
        .order('created_at', { ascending: false });

      if (!error && data && data.length > 0) {
        let maxNum = 0;
        data.forEach((row) => {
          if (row.order_number) {
            const match = row.order_number.match(/ORDER-(\d+)/i);
            if (match) {
              const num = parseInt(match[1], 10);
              if (num > maxNum) maxNum = num;
            }
          }
        });
        return `ORDER-${String(maxNum + 1).padStart(5, '0')}`;
      }
    }
  } catch (err) {
    console.warn('getNextOrderId lookup note:', err);
  }
  return 'ORDER-00001';
}

/**
 * Computes the next unique sequential customer identifier in the format CUST-00001
 * by querying real existing records in washdoor_orders_master.
 */
export async function getNextCustomerId() {
  try {
    if (isSupabaseConfigured()) {
      const { data, error } = await supabase
        .from('washdoor_orders_master')
        .select('customer_id')
        .order('created_at', { ascending: false });

      if (!error && data && data.length > 0) {
        let maxNum = 0;
        data.forEach((row) => {
          if (row.customer_id) {
            const match = row.customer_id.match(/CUST-(\d+)/i);
            if (match) {
              const num = parseInt(match[1], 10);
              if (num > maxNum) maxNum = num;
            }
          }
        });
        if (maxNum > 0) {
          return `CUST-${String(maxNum + 1).padStart(5, '0')}`;
        }
      }
    }
  } catch (err) {
    console.warn('getNextCustomerId lookup note:', err);
  }
  return 'CUST-00001';
}

// Convert washdoor_orders_master row into UI shape
function mapMasterRowToOrder(row) {
  const orderNum = row.order_number ? formatOrderId(row.order_number) : (row.order_id ? formatOrderId(row.order_id) : 'ORDER-00001');
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
    item_count: Number(row.item_count || (row.customer_history?.items?.reduce((s, i) => s + (Number(i.qty) || 1), 0)) || 1),
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
      city: row.city || 'Vellore',
      pincode: row.pincode,
      area_service_zone: row.area_service_zone || 'Zone 1',
      areaServiceZone: row.area_service_zone || 'Zone 1',
      communication_pref: row.communication_preference || 'WhatsApp',
      communicationPreference: row.communication_preference || 'WhatsApp',
      preferredCommunicationLanguage: row.preferred_language || 'English',
      dnd: Boolean(row.do_not_disturb),
      doNotDisturb: Boolean(row.do_not_disturb),
      default_discount: Number(row.default_discount_pct || 0),
      defaultDiscountPercentage: Number(row.default_discount_pct || 0),
      tier: row.tier || 'SILVER',
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
    },
  };
}

/**
 * Searches real customer records in Supabase washdoor_orders_master.
 */
export async function searchCustomers(query) {
  if (!query || !query.trim()) {
    return { data: [], error: null };
  }

  const q = query.trim().toLowerCase();

  if (!isSupabaseConfigured()) {
    return { data: [], error: null };
  }

  try {
    const { data, error } = await supabase
      .from('washdoor_orders_master')
      .select('*')
      .or(`customer_name.ilike.%${q}%,mobile_number.ilike.%${q}%,street_area.ilike.%${q}%,city.ilike.%${q}%,customer_id.ilike.%${q}%`)
      .order('created_at', { ascending: false })
      .limit(30);

    if (error) {
      return { data: [], error };
    }

    // Deduplicate unique customer profiles strictly by customer_id
    // This allows multiple distinct family profiles to share a contact number without auto-merging
    const seen = new Set();
    const uniqueCustomers = [];
    (data || []).forEach((r) => {
      const c = mapMasterRowToOrder(r).customer;
      const key = c.customer_id || c.customerId || c.id;
      if (key && !seen.has(key)) {
        seen.add(key);
        uniqueCustomers.push(c);
      }
    });

    return { data: uniqueCustomers, error: null };
  } catch (err) {
    return { data: [], error: err };
  }
}

/**
 * Fetches real orders from Supabase washdoor_orders_master.
 */
export async function getOrders() {
  if (!isSupabaseConfigured()) {
    return { data: [], error: null };
  }

  try {
    const { data, error } = await supabase
      .from('washdoor_orders_master')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('Orders query note:', error.message);
      return { data: [], error };
    }

    const orders = (data || []).map(mapMasterRowToOrder);
    return { data: orders, error: null };
  } catch (err) {
    return { data: [], error: err };
  }
}

/**
 * Fetches unique real customer records from Supabase washdoor_orders_master.
 */
export async function getAllCustomers() {
  if (!isSupabaseConfigured()) {
    return { data: [], error: null };
  }

  try {
    const { data, error } = await supabase
      .from('washdoor_orders_master')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      return { data: [], error };
    }

    // Deduplicate unique customer profiles strictly by customer_id
    const seen = new Set();
    const uniqueCustomers = [];
    (data || []).forEach((r) => {
      const c = mapMasterRowToOrder(r).customer;
      const key = c.customer_id || c.customerId || c.id;
      if (key && !seen.has(key)) {
        seen.add(key);
        uniqueCustomers.push(c);
      }
    });

    return { data: uniqueCustomers, error: null };
  } catch (err) {
    return { data: [], error: err };
  }
}

/**
 * Creates a real customer record in Supabase washdoor_orders_master.
 */
export async function createCustomer(payload) {
  const clean = cleanPayload(payload);
  const custId = clean.customer_id || clean.customer_code || await getNextCustomerId();

  if (!isSupabaseConfigured()) {
    return { data: null, error: new Error('Supabase not configured') };
  }

  try {
    const generatedOrderNum = await getNextOrderId();
    const { data, error } = await supabase
      .from('washdoor_orders_master')
      .insert([{
        order_number: generatedOrderNum,
        customer_id: custId,
        customer_name: clean.customer_name,
        mobile_number: clean.mobile_number,
        street_area: clean.address,
        city: clean.city || 'Vellore',
        pincode: clean.pincode,
        email: clean.email,
        alternate_phone: clean.alternate_phone,
        intake_type: clean.intake_type || 'Walk-In',
        communication_preference: clean.communication_pref || 'WhatsApp',
        preferred_language: clean.communication_lang || 'English',
        do_not_disturb: Boolean(clean.dnd),
        tier: clean.tier || 'SILVER',
        order_type: 'walk-in',
        order_status: 'Customer Registered',
        total_amount: 0.00,
      }])
      .select()
      .single();

    if (!error && data) {
      return { data: mapMasterRowToOrder(data).customer, error: null };
    }

    return { data: null, error };
  } catch (err) {
    return { data: null, error: err };
  }
}

/**
 * Updates a real customer record in Supabase washdoor_orders_master.
 */
export async function updateCustomer(id, payload) {
  if (!isSupabaseConfigured()) {
    return { data: null, error: new Error('Supabase not configured') };
  }

  const clean = cleanPayload(payload);

  try {
    const updateObj = {
      customer_name: clean.customer_name,
      mobile_number: clean.mobile_number,
      alternate_phone: clean.alternate_phone,
      email: clean.email,
      company_name: clean.company_name,
      gst_number: clean.gst_number,
      tax_exemption: Boolean(clean.tax_exemption),
      street_area: clean.address,
      city: clean.city,
      pincode: clean.pincode,
      date_of_birth: clean.date_of_birth,
      map_link: clean.map_link,
      communication_preference: clean.communication_pref || 'WhatsApp',
      preferred_language: clean.communication_lang || 'English',
      do_not_disturb: Boolean(clean.dnd),
      internal_comments: clean.internal_comments,
      order_notes: clean.notes || clean.internal_comments,
      customer_classification: clean.customer_classification || 'Regular Customer',
      customer_status: clean.customer_status || 'Active',
      price_list: clean.price_list || 'Standard',
      area_service_zone: clean.service_zone ? (clean.service_zone.startsWith('zone-') ? `Zone ${clean.service_zone.replace('zone-', '')}` : clean.service_zone) : undefined,
      default_discount_pct: clean.default_discount !== undefined && clean.default_discount !== null ? Number(clean.default_discount) : undefined,
      credit_limit: clean.credit_limit !== undefined && clean.credit_limit !== null ? Number(clean.credit_limit) : undefined,
      membership_id: clean.membership_id,
      referral_code: clean.referral_code,
      marketing_source: clean.marketing_source,
      anniversary_date: clean.anniversary_date,
      special_occasion: clean.special_occasion,
      special_occasion_date: clean.special_occasion_date,
      tier: clean.tier || 'SILVER',
      service_category: clean.service_category || clean.orderPreference,
      item_count: clean.item_count !== undefined && clean.item_count !== null ? Number(clean.item_count) : undefined,
      order_notes: clean.order_notes || clean.notes || clean.internal_comments,
      updated_at: new Date().toISOString(),
    };

    // Remove undefined properties
    Object.keys(updateObj).forEach((k) => updateObj[k] === undefined && delete updateObj[k]);

    let query = supabase.from('washdoor_orders_master').update(updateObj);

    if (id) {
      query = query.eq('customer_id', id);
    } else if (clean.customer_id) {
      query = query.eq('customer_id', clean.customer_id);
    } else if (clean.mobile_number) {
      query = query.eq('mobile_number', clean.mobile_number);
    }

    const { data, error } = await query.select();

    return { data, error };
  } catch (err) {
    return { data: null, error: err };
  }
}

/**
 * Deletes real customer orders from Supabase washdoor_orders_master.
 */
export async function deleteCustomer(id) {
  if (!isSupabaseConfigured()) {
    return { error: new Error('Supabase not configured') };
  }

  try {
    const { error } = await supabase
      .from('washdoor_orders_master')
      .delete()
      .eq('customer_id', id);

    return { error };
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
    if (finalCustId && String(finalCustId).toUpperCase().includes('CUST-')) {
      finalCustId = formatCustomerId(finalCustId);
    } else {
      finalCustId = await getNextCustomerId();
    }

    const calculatedItemCount = (items && items.length > 0)
      ? items.reduce((s, i) => s + (Number(i.qty) || 1), 0)
      : (cleanCust.item_count ? Number(cleanCust.item_count) : 1);

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
      city: cleanCust.city || 'Vellore',
      pincode: cleanCust.pincode || null,
      area_service_zone: cleanCust.service_zone ? (cleanCust.service_zone.startsWith('zone-') ? `Zone ${cleanCust.service_zone.replace('zone-', '')}` : cleanCust.service_zone) : 'Zone 1',
      map_link: cleanCust.map_link || null,
      intake_type: cleanCust.intake_type || (orderType === 'on-call' ? 'On-Call' : 'Walk-In'),
      communication_preference: cleanCust.communication_pref || 'WhatsApp',
      preferred_language: cleanCust.communication_lang || 'English',
      do_not_disturb: Boolean(cleanCust.dnd),
      internal_comments: cleanCust.internal_comments || null,
      order_notes: orderPreferenceNotes || cleanCust.notes || null,
      service_category: orderPreference || cleanCust.service_category || 'Wash & Steam Press',
      item_count: calculatedItemCount,
      customer_classification: cleanCust.customer_classification || 'Regular Customer',
      customer_status: 'Active',
      tier: cleanCust.tier || 'SILVER',
      membership_id: cleanCust.membership_id || null,
      price_list: cleanCust.price_list || 'Standard',
      default_discount_pct: Number(cleanCust.default_discount || 0),
      credit_limit: Number(cleanCust.credit_limit || 0),
      wallet_balance: Number(cleanCust.wallet_balance || 0),
      referral_code: cleanCust.referral_code || null,
      marketing_source: cleanCust.marketing_source || 'Walk-in',
      order_type: orderType || 'walk-in',
      order_status: 'Laundry In Progress',
      total_amount: Number(totalAmount) || 0.00,
      customer_history: {
        items: items || [],
        created_at: new Date().toISOString(),
      },
    };

    const { data: insertedMaster, error: insertMasterErr } = await supabase
      .from('washdoor_orders_master')
      .insert([masterInsert])
      .select()
      .single();

    if (!insertMasterErr && insertedMaster) {
      return {
        data: {
          order_id: insertedMaster.order_id,
          order_number: insertedMaster.order_number,
          customer_id: insertedMaster.customer_id,
          status: 'success',
        },
        error: null,
      };
    }

    return { data: null, error: insertMasterErr };
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

    const { data, error } = await query.select();
    if (error) {
      console.error('Supabase updateOrderStatus error:', error);
      return { data: null, error };
    }
    return { data, error: null };
  } catch (err) {
    console.error('updateOrderStatus catch:', err);
    return { data: null, error: err };
  }
}

/**
 * Updates order details, cart items, customer contact, service type and pricing in Supabase washdoor_orders_master.
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

    if (updatePayload.totalAmount !== undefined && updatePayload.totalAmount !== null) {
      updateObj.total_amount = Number(updatePayload.totalAmount);
    }
    if (updatePayload.itemCount !== undefined && updatePayload.itemCount !== null) {
      updateObj.item_count = Number(updatePayload.itemCount);
    }
    if (updatePayload.serviceCategory) {
      updateObj.service_category = updatePayload.serviceCategory;
    }
    if (updatePayload.orderNotes !== undefined) {
      updateObj.order_notes = updatePayload.orderNotes || null;
    }
    if (updatePayload.customerName) {
      updateObj.customer_name = updatePayload.customerName;
    }
    if (updatePayload.mobileNumber) {
      const raw = String(updatePayload.mobileNumber).replace(/\D/g, '');
      updateObj.mobile_number = raw.length === 12 && raw.startsWith('91') ? raw.slice(2) : raw.length === 11 && raw.startsWith('0') ? raw.slice(1) : raw;
    }
    if (updatePayload.alternatePhone !== undefined) {
      const raw = String(updatePayload.alternatePhone || '').replace(/\D/g, '');
      updateObj.alternate_phone = raw ? (raw.length === 12 && raw.startsWith('91') ? raw.slice(2) : raw.length === 11 && raw.startsWith('0') ? raw.slice(1) : raw) : null;
    }
    if (updatePayload.email !== undefined) {
      updateObj.email = updatePayload.email || null;
    }
    if (updatePayload.address !== undefined) {
      updateObj.street_area = updatePayload.address || null;
    }
    if (updatePayload.taxExemption !== undefined) {
      updateObj.tax_exemption = Boolean(updatePayload.taxExemption);
    }
    if (updatePayload.status) {
      updateObj.order_status = updatePayload.status;
    }
    if (updatePayload.items) {
      updateObj.customer_history = {
        items: updatePayload.items,
        updated_at: new Date().toISOString(),
      };
    }

    let query = supabase.from('washdoor_orders_master').update(updateObj);

    if (formattedId.startsWith('ORDER-')) {
      query = query.eq('order_number', formattedId);
    } else {
      query = query.or(`order_number.eq.${formattedId},order_id.eq.${formattedId}`);
    }

    const { data, error } = await query.select();
    if (error) {
      console.error('Supabase updateOrder error:', error);
      return { data: null, error };
    }
    return { data, error: null };
  } catch (err) {
    console.error('updateOrder catch:', err);
    return { data: null, error: err };
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
