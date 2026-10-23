// src/services/customerService.js
// 100% Real Database Service connected to Supabase 'washdoor_orders_master'
// Zero hardcoded mock customer data.

import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';

// Helper to format any Customer ID into canonical CUST-00001 (5-digit padded) format
export function formatCustomerId(id) {
  if (!id) return 'CUST-00001';
  const str = String(id).trim();
  const match = str.match(/\d+/);
  if (match) {
    const num = parseInt(match[0], 10);
    return `CUST-${String(num).padStart(5, '0')}`;
  }
  return str.toUpperCase();
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
  return {
    id: row.order_id || row.id,
    order_number: row.order_number,
    order_type: row.order_type || 'walk-in',
    preference: row.service_category || 'Standard',
    preference_notes: row.order_notes,
    status: row.order_status || 'Laundry In Progress',
    total_amount: Number(row.total_amount || 0),
    created_at: row.created_at,
    customer: {
      id: row.customer_id || 'CUST-00001',
      customerId: row.customer_id || 'CUST-00001',
      customer_code: row.customer_id || 'CUST-00001',
      customer_name: row.customer_name,
      customerName: row.customer_name,
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
      membership_id: row.membership_id,
      customer_classification: row.customer_classification || 'Regular Customer',
      customerClassification: row.customer_classification || 'Regular Customer',
      internal_comments: row.internal_comments,
      notes: row.order_notes,
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

    // Deduplicate unique customers by mobile_number or customer_id
    const seen = new Set();
    const uniqueCustomers = [];
    (data || []).forEach((r) => {
      const c = mapMasterRowToOrder(r).customer;
      const key = c.mobile_number || c.customer_id;
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

    const seen = new Set();
    const uniqueCustomers = [];
    (data || []).forEach((r) => {
      const c = mapMasterRowToOrder(r).customer;
      const key = c.mobile_number || c.customer_id;
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
    const generatedOrderNum = `WD-${Math.floor(112000 + (Date.now() % 880000))}`;
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
    const { data, error } = await supabase
      .from('washdoor_orders_master')
      .update({
        customer_name: clean.customer_name,
        street_area: clean.address,
        city: clean.city,
        pincode: clean.pincode,
        email: clean.email,
        alternate_phone: clean.alternate_phone,
        internal_comments: clean.internal_comments,
        do_not_disturb: Boolean(clean.dnd),
        tier: clean.tier || 'SILVER',
        tax_exemption: Boolean(clean.tax_exemption),
        updated_at: new Date().toISOString(),
      })
      .or(`customer_id.eq.${id},mobile_number.eq.${clean.mobile_number}`)
      .select();

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
}) {
  const cleanCust = cleanPayload(customerData);

  if (!isSupabaseConfigured()) {
    return { data: null, error: new Error('Supabase not configured') };
  }

  try {
    const generatedOrderNumber = `WD-${Math.floor(112000 + (Date.now() % 880000))}`;
    
    // Resolve customer ID in standard CUST-00001 format
    let finalCustId = existingCustomerId || cleanCust.customer_code || cleanCust.customerId || cleanCust.id;
    if (finalCustId && String(finalCustId).toUpperCase().includes('CUST-')) {
      finalCustId = formatCustomerId(finalCustId);
    } else {
      finalCustId = await getNextCustomerId();
    }

    const masterInsert = {
      order_number: cleanCust.order_number || generatedOrderNumber,
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
 * Sanitizes form payload by turning empty strings into nulls
 */
function cleanPayload(obj) {
  if (!obj) return {};
  const cleaned = { ...obj };
  Object.keys(cleaned).forEach((key) => {
    if (typeof cleaned[key] === 'string' && cleaned[key].trim() === '') {
      cleaned[key] = null;
    }
  });
  return cleaned;
}
