// src/config/orderColumnsConfig.js
// Centralized column definition for Washdoor Orders & POS Dynamic Column Management System

export const ORDER_COLUMNS = [
  // ── 9 Default Columns (Displayed in this exact sequence by default) ──
  {
    id: 'order_id',
    label: 'Order ID',
    default: true,
    required: true,
    fixed: true,
    purpose: 'Unique order number',
    minWidth: '185px',
  },
  {
    id: 'customer',
    label: 'Customer',
    default: true,
    required: true,
    fixed: true,
    purpose: 'Customer name and mobile number',
    minWidth: '180px',
  },
  {
    id: 'address',
    label: 'Address',
    default: true,
    purpose: 'Customer delivery address',
    minWidth: '240px',
  },
  {
    id: 'services',
    label: 'Services',
    default: true,
    purpose: 'Allocated laundry services',
    minWidth: '220px',
  },
  {
    id: 'status',
    label: 'Status',
    default: true,
    purpose: 'Current order status',
    minWidth: '130px',
  },
  {
    id: 'payment',
    label: 'Payment',
    default: true,
    purpose: 'Amount and payment status',
    minWidth: '160px',
  },
  {
    id: 'order_details',
    label: 'Order Details',
    default: true,
    purpose: 'Order timestamp and audit log',
    minWidth: '160px',
  },
  {
    id: 'pickup_delivery',
    label: 'Pickup & Delivery',
    default: true,
    purpose: 'Schedule and driver assignment',
    minWidth: '180px',
  },
  {
    id: 'actions',
    label: 'Actions',
    default: true,
    required: true,
    fixed: true,
    purpose: 'Bill, View, Edit, Side Edit and WhatsApp icon',
    minWidth: '350px',
    align: 'right',
  },

  // ── 8 Additional Dynamic Columns (Hidden by default, available on demand) ──
  {
    id: 'driver',
    label: 'Driver',
    default: false,
    purpose: 'Assigned driver name',
    minWidth: '140px',
  },
  {
    id: 'comments',
    label: 'Comments',
    default: false,
    purpose: 'Order-related comments',
    minWidth: '250px',
  },
  {
    id: 'pincode',
    label: 'PIN Code',
    default: false,
    purpose: 'Customer postal code',
    minWidth: '110px',
  },
  {
    id: 'email',
    label: 'Email',
    default: false,
    purpose: 'Customer email address',
    minWidth: '180px',
  },
  {
    id: 'business_name',
    label: 'Business Name',
    default: false,
    purpose: 'Customer/company name',
    minWidth: '160px',
  },
  {
    id: 'communication_pref',
    label: 'Communication Preference',
    default: false,
    purpose: 'WhatsApp, SMS, Email',
    minWidth: '160px',
  },
  {
    id: 'dob',
    label: 'Date of Birth',
    default: false,
    purpose: 'Customer DOB',
    minWidth: '155px',
  },
  {
    id: 'tax_exemption',
    label: 'Tax Exemption',
    default: false,
    purpose: 'Yes / No',
    minWidth: '120px',
  },
];

export const DEFAULT_COLUMN_IDS = ORDER_COLUMNS.filter((c) => c.default).map((c) => c.id);
export const ALL_COLUMN_IDS = ORDER_COLUMNS.map((c) => c.id);

// ── Required/Fixed columns: Order ID, Customer, and Actions must always remain visible ──
export const REQUIRED_COLUMN_IDS = ORDER_COLUMNS.filter((c) => c.required).map((c) => c.id);
export const FIXED_COLUMN_IDS = REQUIRED_COLUMN_IDS;

export const COLUMN_STORAGE_KEY = 'washdoor_orders_column_preferences_v1';

/**
 * Validates and orders a list of selected column IDs according to ORDER_COLUMNS sequence.
 * @param {string[]} selectedIds
 * @returns {string[]} Ordered list of valid column IDs
 */
export function sanitizeAndOrderColumns(selectedIds) {
  if (!Array.isArray(selectedIds) || selectedIds.length === 0) {
    return [...DEFAULT_COLUMN_IDS];
  }
  const idSet = new Set(selectedIds);
  // Return in strict predefined sequence 1 to 17
  return ORDER_COLUMNS.filter((c) => idSet.has(c.id)).map((c) => c.id);
}

/**
 * Ensures required/fixed columns (Order ID, Customer, Actions) are always present.
 * @param {string[]} selectedIds
 * @returns {string[]}
 */
export function enforceRequiredColumns(selectedIds) {
  const current = Array.isArray(selectedIds) ? selectedIds : DEFAULT_COLUMN_IDS;
  const merged = new Set([...current, ...REQUIRED_COLUMN_IDS]);
  return sanitizeAndOrderColumns([...merged]);
}
  