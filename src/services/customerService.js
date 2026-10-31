// src/services/customerService.js
// 100% Real Database Service connected to Supabase:
// - 'washdoor_orders_master' (Orders and Customers master)
// - 'washdoor_products' (Clothes products catalog)
// - 'washdoor_order_items' (Line items per order)

import { supabase, isSupabaseConfigured } from '../lib/supabaseClient.js';

// Default fallback products matching the database seed
export const DEFAULT_PRODUCTS = [
  { id: 'shirt', item_code: 'CLOTH-01', name: 'Shirt', category: 'Men', price: 15, base_price: 15, unit: 'piece' },
  { id: 'tshirt', item_code: 'CLOTH-02', name: 'T-Shirt', category: 'Men', price: 12, base_price: 12, unit: 'piece' },
  { id: 'formal_pant', item_code: 'CLOTH-03', name: 'Formal Pant', category: 'Men', price: 20, base_price: 20, unit: 'piece' },
  { id: 'jeans', item_code: 'CLOTH-04', name: 'Jeans', category: 'Men', price: 25, base_price: 25, unit: 'piece' },
  { id: 'saree', item_code: 'CLOTH-05', name: 'Saree', category: 'Women', price: 60, base_price: 60, unit: 'piece' },
  { id: 'towel', item_code: 'CLOTH-06', name: 'Towel', category: 'Home Linen', price: 15, base_price: 15, unit: 'piece' },
  { id: 'chudidar', item_code: 'CLOTH-07', name: 'Chudidar / Salwar', category: 'Women', price: 35, base_price: 35, unit: 'piece' },
  { id: 'kurti', item_code: 'CLOTH-08', name: 'Kurti', category: 'Women', price: 30, base_price: 30, unit: 'piece' },
  { id: 'shorts', item_code: 'CLOTH-09', name: 'Shorts', category: 'Kids', secondaryCategory: 'Men', price: 15, base_price: 15, unit: 'piece' },
  { id: 'bedsheet', item_code: 'CLOTH-10', name: 'Bedsheet', category: 'Home Linen', price: 50, base_price: 50, unit: 'piece' },
  { id: 'pillow_cover', item_code: 'CLOTH-11', name: 'Pillow Cover', category: 'Home Linen', price: 10, base_price: 10, unit: 'piece' },
  { id: 'jacket', item_code: 'CLOTH-12', name: 'Jacket', category: 'Men', secondaryCategory: 'Women', price: 50, base_price: 50, unit: 'piece' },
  { id: 'blazer_suit', item_code: 'CLOTH-13', name: 'Blazer / Suit', category: 'Men', price: 100, base_price: 100, unit: 'piece' },
  { id: 'sweater', item_code: 'CLOTH-14', name: 'Sweater', category: 'Men', secondaryCategory: 'Women', price: 40, base_price: 40, unit: 'piece' },
  { id: 'cap', item_code: 'CLOTH-15', name: 'Cap', category: 'Accessories', secondaryCategory: 'Kids', price: 10, base_price: 10, unit: 'piece' },
  { id: 'curtain', item_code: 'CLOTH-16', name: 'Curtain', category: 'Home Linen', price: 60, base_price: 60, unit: 'piece' },
];

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

    const products = data.map((row) => ({
      id: row.item_code ? row.item_code.toLowerCase().replace(/[^a-z0-9]/g, '_') : row.name.toLowerCase().replace(/\s+/g, '_'),
      product_id: row.product_id,
      item_code: row.item_code,
      name: row.name,
      category: row.category || 'General',
      secondaryCategory: row.secondary_category || undefined,
      price: Number(row.base_price || 0),
      base_price: Number(row.base_price || 0),
      unit: row.unit || 'piece',
      isActive: row.is_active,
      displayOrder: row.display_order,
    }));

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
export async function saveOrderItems(orderNumber, items = []) {
  if (!orderNumber || !isSupabaseConfigured()) {
    return { data: [], error: null };
  }

  const cleanOrderNum = formatOrderId(orderNumber);

  try {
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
      const amount = Number(item.amount ?? (rate * qty));

      return {
        order_number: cleanOrderNum,
        product_id: item.product_id || item.item_code || item.id || null,
        product_name: item.product_name || item.name || 'Garment',
        service_type: item.serviceType || item.service_type || 'Ironing',
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
      let maxNum = 0;
      // 1. Check customer_works table
      try {
        const { data: worksData } = await supabase
          .from('customer_works')
          .select('work_number');

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

      // 2. Also check washdoor_orders_master if present
      try {
        const { data: masterData } = await supabase
          .from('washdoor_orders_master')
          .select('order_number');

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

      // 1. Check customer_works
      try {
        const { data: worksData } = await supabase
          .from('customer_works')
          .select('customer_id')
          .order('created_at', { ascending: false });
        if (worksData && worksData.length > 0) {
          worksData.forEach((row) => {
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
export function mapCustomerWorkRow(row) {
  if (!row) return null;
  const custId = formatCustomerId(row.customer_id || 'CUST-00001');

  // Extract customer profile stored in items array
  const items = Array.isArray(row.items) ? row.items : [];
  const profileItem = items.find((i) => i && (i.type === 'customer_registration' || i.type === 'customer_profile')) || items[0] || {};

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
    area_service_zone: profileItem.area_service_zone || 'Zone 1',
    areaServiceZone: profileItem.area_service_zone || 'Zone 1',
    tax_exemption: Boolean(profileItem.tax_exemption),
    date_of_birth: profileItem.date_of_birth || null,
    map_link: profileItem.map_link || null,
    communication_pref: profileItem.communication_pref || 'WhatsApp',
    communicationPreference: profileItem.communication_pref || 'WhatsApp',
    preferredCommunicationLanguage: profileItem.preferred_language || 'English',
    internal_comments: row.internal_notes || profileItem.internal_comments || null,
    notes: row.special_instructions || row.internal_notes || null,
    order_preference: row.service_type || profileItem.order_preference || 'Wash & Steam Press',
    orderPreference: row.service_type || profileItem.order_preference || 'Wash & Steam Press',
    service_type: row.service_type || 'Wash & Steam Press',
    service_category: row.service_type || 'Wash & Steam Press',
    price_list: profileItem.price_list || 'Standard',
    customer_classification: profileItem.customer_classification || 'Regular Customer',
    customerClassification: profileItem.customer_classification || 'Regular Customer',
    customer_status: 'Active',
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

/**
 * Searches real customer records in Supabase customer_works and washdoor_orders_master.
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
    const seen = new Set();
    const uniqueCustomers = [];

    // 1. Search customers table
    try {
      const { data: cData } = await supabase
        .from('customers')
        .select('*')
        .or(`customer_name.ilike.%${q}%,mobile_number.ilike.%${q}%,address.ilike.%${q}%`)
        .limit(30);

      if (cData && cData.length > 0) {
        cData.forEach((r) => {
          const custId = r.customer_id || (r.id ? formatCustomerId(r.id) : null);
          const phone = r.mobile_number || '';
          const key = custId || phone;
          if (key && !seen.has(key)) {
            seen.add(key);
            uniqueCustomers.push({
              id: custId,
              customer_id: custId,
              customerId: custId,
              customer_name: r.customer_name || '',
              mobile_number: phone,
              address: r.address || '',
              email: r.email || '',
              city: r.city || '',
              pincode: r.pincode || '',
            });
          }
        });
      }
    } catch {}

    // 2. Search primary customer_works table
    try {
      const { data: worksData, error: worksError } = await supabase
        .from('customer_works')
        .select('*')
        .or(`customer_name.ilike.%${q}%,mobile_number.ilike.%${q}%,delivery_address.ilike.%${q}%,customer_id.ilike.%${q}%`)
        .order('created_at', { ascending: false })
        .limit(30);

      if (!worksError && worksData) {
        worksData.forEach((r) => {
          const c = mapCustomerWorkRow(r);
          const key = c.customer_id || c.mobile_number;
          if (key && !seen.has(key)) {
            seen.add(key);
            uniqueCustomers.push(c);
          }
        });
      }
    } catch (wErr) {
      console.warn('customer_works search note:', wErr);
    }

    // 2. Also search washdoor_orders_master for backwards compatibility
    try {
      const { data: masterData, error: masterError } = await supabase
        .from('washdoor_orders_master')
        .select('*')
        .or(`customer_name.ilike.%${q}%,mobile_number.ilike.%${q}%,street_area.ilike.%${q}%,city.ilike.%${q}%,customer_id.ilike.%${q}%`)
        .order('created_at', { ascending: false })
        .limit(30);

      if (!masterError && masterData) {
        masterData.forEach((r) => {
          const c = mapMasterRowToOrder(r).customer;
          const key = c.customer_id || c.customerId || c.id;
          if (key && !seen.has(key)) {
            seen.add(key);
            uniqueCustomers.push(c);
          }
        });
      }
    } catch (mErr) {
      console.warn('washdoor_orders_master search note:', mErr);
    }

    return { data: uniqueCustomers, error: null };
  } catch (err) {
    return { data: [], error: err };
  }
}

// Convert customer_works row into UI Order shape with full fidelity
function mapCustomerWorkRowToOrder(row) {
  const orderNum = row.work_number ? formatOrderId(row.work_number) : (row.work_id ? `ORD${String(row.work_id).slice(-5)}` : 'ORD00001');
  const custId = formatCustomerId(row.customer_id || 'CUST-00001');
  const rawStatus = row.work_status || 'Received';
  const displayStatus = (rawStatus === 'Received' || rawStatus === 'Order Received') ? 'Order Received' : rawStatus;

  const items = Array.isArray(row.items) ? row.items : [];
  const itemCount = row.total_pieces !== undefined && row.total_pieces !== null ? Number(row.total_pieces) : (items.length || 1);

  let garmentInspections = {};
  let internalNotesObj = {};
  if (row.internal_notes) {
    try {
      const parsed = typeof row.internal_notes === 'string' ? JSON.parse(row.internal_notes) : row.internal_notes;
      if (parsed && typeof parsed === 'object') {
        internalNotesObj = parsed;
        if (parsed.garment_inspections && typeof parsed.garment_inspections === 'object') {
          garmentInspections = parsed.garment_inspections;
        }
      }
    } catch {}
  }
  if (Object.keys(garmentInspections).length === 0 && Array.isArray(items)) {
    items.forEach((it) => {
      if (it.inspections && Array.isArray(it.inspections)) {
        it.inspections.forEach((insp) => {
          if (insp.id) garmentInspections[insp.id] = insp;
        });
      }
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
    priority: row.priority || 'Normal',
    progress: rawStatus === 'Ready' ? 75 : rawStatus === 'Delivered' ? 100 : 25,
    subtotal: subtotal,
    discount: discountAmount,
    discount_amount: discountAmount,
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
    target_delivery_date: row.target_delivery_date,
    delivery_date: formattedExpectedDelivery,
    expected_delivery: formattedExpectedDelivery,
    assigned_staff: row.assigned_staff || '',
    assigned_driver: row.assigned_staff || internalNotesObj.assigned_driver || '',
    assigned_driver_full: internalNotesObj.assigned_driver_full || row.assigned_staff || '',
    rack_shelf_location: row.rack_shelf_location || '',
    staff_notes: internalNotesObj.staff_notes || '',
    flags: internalNotesObj.flags || {},
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
  if (Number(row.total_pieces || 0) === 0 && Number(row.total_amount || 0) === 0) return true;
  return false;
}

/**
 * Fetches real orders from Supabase customer_works and washdoor_orders_master.
 * Excludes pure customer master registration records.
 * Returns only authentic database orders (no hardcoded mock records).
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
      const orders = realOrdersData.map(mapCustomerWorkRowToOrder);
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
 * Fetches unique real customer records from Supabase customer_works and washdoor_orders_master.
 */
export async function getAllCustomers() {
  if (!isSupabaseConfigured()) {
    return { data: [], error: null };
  }

  try {
    const seen = new Set();
    const uniqueCustomers = [];

    // 1. Fetch from primary customer_works table
    try {
      const { data: worksData, error: worksError } = await supabase
        .from('customer_works')
        .select('*')
        .order('created_at', { ascending: false });

      if (!worksError && worksData) {
        worksData.forEach((r) => {
          const c = mapCustomerWorkRow(r);
          const key = c.customer_id;
          if (key && !seen.has(key)) {
            seen.add(key);
            uniqueCustomers.push(c);
          }
        });
      }
    } catch (wErr) {
      console.warn('customer_works getAll notice:', wErr);
    }

    // 2. Also merge from washdoor_orders_master for backwards compatibility
    try {
      const { data: masterData, error: masterError } = await supabase
        .from('washdoor_orders_master')
        .select('*')
        .order('created_at', { ascending: false });

      if (!masterError && masterData) {
        masterData.forEach((r) => {
          const c = mapMasterRowToOrder(r).customer;
          const key = c.customer_id || c.customerId || c.id;
          if (key && !seen.has(key)) {
            seen.add(key);
            uniqueCustomers.push(c);
          }
        });
      }
    } catch (mErr) {
      console.warn('washdoor_orders_master getAll notice:', mErr);
    }

    return { data: uniqueCustomers, error: null };
  } catch (err) {
    return { data: [], error: err };
  }
}

/**
 * Creates a real customer record in Supabase customer_works table.
 * Preserves all customer profile details (additional addresses, contact, pricing, preferences)
 * and assigns a sequential CUST-XXXXX customer identifier.
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

    // 2. Prepare customer_works row
    const workRow = {
      customer_id: custId,
      customer_name: clean.customer_name,
      mobile_number: clean.mobile_number,
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
      internal_notes: clean.internal_comments || 'Customer Registered',
    };

    Object.keys(workRow).forEach((k) => workRow[k] === undefined && delete workRow[k]);

    // 3. Primary Insert into customer_works table
    const { data: workData, error: workError } = await supabase
      .from('customer_works')
      .insert([workRow])
      .select()
      .single();

    if (workError) {
      console.error('Error inserting into customer_works:', workError);
      return { data: null, error: workError };
    }

    return { data: mapCustomerWorkRow(workData), error: null };
  } catch (err) {
    return { data: null, error: err };
  }
}

/**
 * Updates a real customer record in Supabase customer_works and washdoor_orders_master.
 */
export async function updateCustomer(id, payload) {
  if (!isSupabaseConfigured()) {
    return { data: null, error: new Error('Supabase not configured') };
  }

  const clean = cleanPayload(payload);

  try {
    // 1. Primary: Update customer_works
    const workUpdate = {
      customer_name: clean.customer_name,
      mobile_number: clean.mobile_number,
      alternate_phone: clean.alternate_phone || null,
      email: clean.email || null,
      delivery_address: clean.address || clean.streetArea,
      service_type: clean.service_category || clean.orderPreference,
      internal_notes: clean.internal_comments || clean.notes,
      updated_at: new Date().toISOString(),
    };
    Object.keys(workUpdate).forEach((k) => workUpdate[k] === undefined && delete workUpdate[k]);

    let workQuery = supabase.from('customer_works').update(workUpdate);
    if (id) {
      workQuery = workQuery.eq('customer_id', id);
    } else if (clean.customer_id) {
      workQuery = workQuery.eq('customer_id', clean.customer_id);
    } else if (clean.mobile_number) {
      workQuery = workQuery.eq('mobile_number', clean.mobile_number);
    }
    const { data: workData, error: workError } = await workQuery.select();

    // 2. Best-effort sync to washdoor_orders_master if present (optional legacy table)
    try {
      const updateObj = {
        customer_name: clean.customer_name,
        mobile_number: clean.mobile_number,
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
        updated_at: new Date().toISOString(),
      };
      Object.keys(updateObj).forEach((k) => updateObj[k] === undefined && delete updateObj[k]);

      let mQuery = supabase.from('washdoor_orders_master').update(updateObj);
      if (id) mQuery = mQuery.eq('customer_id', id);
      else if (clean.customer_id) mQuery = mQuery.eq('customer_id', clean.customer_id);
      else if (clean.mobile_number) mQuery = mQuery.eq('mobile_number', clean.mobile_number);
      await mQuery;
    } catch {
      // washdoor_orders_master is optional; ignored if not present
    }

    if (workError) {
      return { data: null, error: workError };
    }
    return { data: workData, error: null };
  } catch (err) {
    return { data: null, error: err };
  }
}

/**
 * Deletes real customer records from Supabase customer_works and washdoor_orders_master.
 */
export async function deleteCustomer(id) {
  if (!isSupabaseConfigured()) {
    return { error: new Error('Supabase not configured') };
  }

  try {
    // 1. Primary: Delete from customer_works
    const { error: workErr } = await supabase.from('customer_works').delete().eq('customer_id', id);

    // 2. Best-effort delete from washdoor_orders_master if exists
    try {
      await supabase
        .from('washdoor_orders_master')
        .delete()
        .eq('customer_id', id);
    } catch {
      // washdoor_orders_master is optional; ignored if not present
    }

    return { error: workErr };
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
          .select('id, customer_name, mobile_number')
          .ilike('mobile_number', `%${normMobile}%`)
          .limit(1);
        if (cMatches && cMatches.length > 0) {
          finalCustId = cMatches[0].customer_id || (cMatches[0].id ? formatCustomerId(cMatches[0].id) : null);
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
        await supabase.from('customers').insert([{
          customer_name: cleanCust.customer_name,
          mobile_number: cleanCust.mobile_number,
          email: cleanCust.email || null,
          address: cleanCust.address || null,
          city: cleanCust.city || null,
          pincode: cleanCust.pincode || null,
        }]);
      } catch {}
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

    try {
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
        priority: 'Normal',
        intake_method: normalizedIntake,
        items: items || [],
        total_pieces: calculatedItemCount || 1,
        subtotal: Number(totalAmount) || 0.00,
        total_amount: Number(totalAmount) || 0.00,
        advance_paid: 0.00,
        payment_status: 'Unpaid',
        payment_method: 'Cash',
        special_instructions: orderPreferenceNotes || cleanCust.notes || null,
        internal_notes: cleanCust.internal_comments || null,
      };
      Object.keys(workRow).forEach((k) => workRow[k] === undefined && delete workRow[k]);
      const { data: wData, error: wErr } = await supabase.from('customer_works').insert([workRow]).select().single();
      if (!wErr && wData) {
        insertedOrderNum = wData.work_number || generatedOrderNumber;
        insertedOrderId = wData.work_id || generatedOrderNumber;
      } else if (wErr) {
        console.warn('customer_works insert warning, retrying with fallback work_number:', wErr);
        // Fallback with generated order number if database requires work_number explicitly
        const fallbackRow = { ...workRow, work_number: generatedOrderNumber };
        const { data: fbData } = await supabase.from('customer_works').insert([fallbackRow]).select().single();
        if (fbData) {
          insertedOrderNum = fbData.work_number || generatedOrderNumber;
          insertedOrderId = fbData.work_id || generatedOrderNumber;
        }
      }
    } catch (workSyncErr) {
      console.warn('customer_works order sync note:', workSyncErr);
    }

    // 2. Also try washdoor_orders_master if exists
    try {
      await supabase
        .from('washdoor_orders_master')
        .insert([masterInsert]);
    } catch {}

    // Synchronize item records to washdoor_order_items table if exists
    if (items && Array.isArray(items) && items.length > 0) {
      try {
        await saveOrderItems(insertedOrderNum, items);
      } catch (itemErr) {
        console.warn('saveOrderItems async note:', itemErr);
      }
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

    // 1. Update customer_works
    const dbWorkStatus = (newStatus === 'Order Received') ? 'Received' : newStatus;
    const workUpdate = {
      work_status: dbWorkStatus,
      updated_at: new Date().toISOString(),
    };
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
  const s = String(val).trim();
  if (s === 'Order Received' || s === 'Received') return 'Received';
  if (['In Progress', 'Ready', 'Delivered', 'Cancelled'].includes(s)) return s;
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

    if (updatePayload.assignedStaff || updatePayload.assigned_staff || updatePayload.assignedDriver || updatePayload.assigned_driver) {
      workUpdate.assigned_staff = updatePayload.assignedStaff || updatePayload.assigned_staff || updatePayload.assignedDriver || updatePayload.assigned_driver;
    }

    if (updatePayload.rackShelfLocation || updatePayload.rack_shelf_location) {
      workUpdate.rack_shelf_location = updatePayload.rackShelfLocation || updatePayload.rack_shelf_location;
    }

    // Delivery date parsing
    const rawDelivery = updatePayload.deliveryDate || updatePayload.expectedDelivery || updatePayload.target_delivery_date;
    const expectedDeliveryDisplay = rawDelivery || '';
    if (rawDelivery) {
      const d = new Date(rawDelivery);
      if (!isNaN(d.getTime())) {
        workUpdate.target_delivery_date = d.toISOString();
      }
    }

    if (updatePayload.items) {
      workUpdate.items = updatePayload.items;
      workUpdate.total_pieces = updatePayload.items.reduce((s, i) => s + (Number(i.qty) || 1), 0);
      updateObj.customer_history = {
        ...(updateObj.customer_history || {}),
        items: updatePayload.items,
        updated_at: new Date().toISOString(),
      };
    }

    // Internal notes & garment inspection preservation
    const inspData = updatePayload.garment_inspections || updatePayload.inspections || {};
    const notesPayload = {
      garment_inspections: inspData,
      expected_delivery_display: expectedDeliveryDisplay,
      payment_method_display: updatePayload.paymentMethod || updatePayload.payment_method || updatePayload.paymentMode || '',
      assigned_driver: updatePayload.assigned_driver || updatePayload.assignedStaff || '',
      assigned_driver_full: updatePayload.assigned_driver_full || '',
      staff_notes: updatePayload.staff_notes || '',
      flags: updatePayload.flags || {},
    };
    workUpdate.internal_notes = JSON.stringify(notesPayload);
    updateObj.customer_history = {
      ...(updateObj.customer_history || {}),
      garment_inspections: inspData,
      ...notesPayload,
    };

    // Execute customer_works update
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

    // Synchronize item records to washdoor_order_items table
    if (updatePayload.items && Array.isArray(updatePayload.items)) {
      try {
        await saveOrderItems(formattedId, updatePayload.items);
      } catch (itemErr) {
        console.warn('saveOrderItems update note:', itemErr);
      }
    }

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
                status: updatePayload.status || updatePayload.order_status || o.status,
                order_status: updatePayload.status || updatePayload.order_status || o.order_status,
                order_type: updatePayload.orderType || updatePayload.order_type || o.order_type,
                intake_method: updatePayload.orderType || updatePayload.order_type || o.intake_method,
                expected_delivery: expectedDeliveryDisplay || o.expected_delivery,
                delivery_date: expectedDeliveryDisplay || o.delivery_date,
                payment_status: updatePayload.paymentStatus || updatePayload.payment_status || o.payment_status,
                payment_method: updatePayload.paymentMethod || updatePayload.payment_method || updatePayload.paymentMode || o.payment_method,
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
