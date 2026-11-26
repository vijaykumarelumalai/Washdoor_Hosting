export const ORDERS_V2_COLUMNS = [
  {
    id: 'orderId',
    label: 'Order ID',
    default: true,
    required: true,
    fixed: true,
    purpose: 'Order number and avatar',
    minWidth: '150px',
  },
  {
    id: 'customer',
    label: 'Customer',
    default: true,
    required: true,
    fixed: true,
    purpose: 'Customer name and mobile number',
    minWidth: '130px',
  },
  {
    id: 'address',
    label: 'Address',
    default: false,
    purpose: 'Customer delivery address',
    minWidth: '180px',
  },
  {
    id: 'services',
    label: 'Services',
    default: true,
    purpose: 'Allocated laundry services',
    minWidth: '150px',
  },
  {
    id: 'total',
    label: 'Total Amount',
    default: true,
    purpose: 'Order total and balance',
    minWidth: '110px',
  },
  {
    id: 'status',
    label: 'Status',
    default: true,
    purpose: 'Current order status',
    minWidth: '170px',
  },
  {
    id: 'date',
    label: 'Order Date',
    default: true,
    purpose: 'Order creation date and time',
    minWidth: '130px',
  },
  {
    id: 'order_details',
    label: 'Order Details',
    default: false,
    purpose: 'Work number and order notes',
    minWidth: '130px',
  },
  {
    id: 'pickup_delivery',
    label: 'Pickup & Delivery',
    default: false,
    purpose: 'Pickup and delivery schedule',
    minWidth: '160px',
  },
  {
    id: 'driver',
    label: 'Driver',
    default: false,
    purpose: 'Assigned delivery driver',
    minWidth: '120px',
  },
  {
    id: 'comments',
    label: 'Comments',
    default: false,
    purpose: 'Order-related comments',
    minWidth: '180px',
  },
  {
    id: 'pincode',
    label: 'PIN Code',
    default: false,
    purpose: 'Customer postal code',
    minWidth: '100px',
  },
  {
    id: 'email',
    label: 'Email',
    default: false,
    purpose: 'Customer email address',
    minWidth: '150px',
  },
  {
    id: 'business_name',
    label: 'Business Name',
    default: false,
    purpose: 'Customer or company name',
    minWidth: '140px',
  },
  {
    id: 'communication_pref',
    label: 'Communication Preference',
    default: false,
    purpose: 'Preferred contact method',
    minWidth: '150px',
  },
  {
    id: 'dob',
    label: 'Date of Birth',
    default: false,
    purpose: 'Customer date of birth',
    minWidth: '130px',
  },
  {
    id: 'tax_exemption',
    label: 'Tax Exemption',
    default: false,
    purpose: 'Tax exemption status',
    minWidth: '110px',
  },
  {
    id: 'actions',
    label: 'Actions',
    default: true,
    required: true,
    fixed: true,
    purpose: 'Edit, view, invoice and delete actions',
    minWidth: '180px',
    align: 'right',
  },
];

export const ORDERS_V2_DEFAULT_COLUMN_IDS = ORDERS_V2_COLUMNS.filter((column) => column.default).map((column) => column.id);
export const ORDERS_V2_ALL_COLUMN_IDS = ORDERS_V2_COLUMNS.map((column) => column.id);
export const ORDERS_V2_REQUIRED_COLUMN_IDS = ORDERS_V2_COLUMNS.filter((column) => column.required).map((column) => column.id);
export const ORDERS_V2_FIXED_COLUMN_IDS = ORDERS_V2_REQUIRED_COLUMN_IDS;
export const ORDERS_V2_COLUMN_STORAGE_KEY = 'washdoor_orders_v2_column_preferences_v1';

export const ORDERS_V2_COLUMN_GROUPS = [
  {
    id: 'required',
    label: 'Required',
    columns: ORDERS_V2_COLUMNS.filter((column) => column.required),
  },
  {
    id: 'default',
    label: 'Default',
    columns: ORDERS_V2_COLUMNS.filter((column) => column.default && !column.required),
  },
  {
    id: 'optional',
    label: 'Optional',
    columns: ORDERS_V2_COLUMNS.filter((column) => !column.default),
  },
];

export function sanitizeOrdersV2Columns(selectedIds) {
  if (!Array.isArray(selectedIds) || selectedIds.length === 0) {
    return [...ORDERS_V2_DEFAULT_COLUMN_IDS];
  }
  const idSet = new Set(selectedIds);
  return ORDERS_V2_COLUMNS.filter((column) => idSet.has(column.id)).map((column) => column.id);
}

export function enforceOrdersV2RequiredColumns(selectedIds) {
  const current = Array.isArray(selectedIds) ? selectedIds : ORDERS_V2_DEFAULT_COLUMN_IDS;
  return sanitizeOrdersV2Columns([...new Set([...current, ...ORDERS_V2_REQUIRED_COLUMN_IDS])]);
}

export const ORDER_COLUMNS = [
  { id: 'order_id', label: 'Order ID', default: true, required: true, fixed: true },
  { id: 'customer', label: 'Customer', default: true, required: true, fixed: true },
  { id: 'address', label: 'Address', default: true },
  { id: 'services', label: 'Services', default: true },
  { id: 'status', label: 'Status', default: true },
  { id: 'payment', label: 'Payment', default: true },
  { id: 'order_details', label: 'Order Details', default: true },
  { id: 'pickup_delivery', label: 'Pickup & Delivery', default: true },
  { id: 'actions', label: 'Actions', default: true, required: true, fixed: true },
  { id: 'driver', label: 'Driver', default: false },
  { id: 'comments', label: 'Comments', default: false },
  { id: 'pincode', label: 'PIN Code', default: false },
  { id: 'email', label: 'Email', default: false },
  { id: 'business_name', label: 'Business Name', default: false },
  { id: 'communication_pref', label: 'Communication Preference', default: false },
  { id: 'dob', label: 'Date of Birth', default: false },
  { id: 'tax_exemption', label: 'Tax Exemption', default: false },
];

export const DEFAULT_COLUMN_IDS = ORDER_COLUMNS.filter((column) => column.default).map((column) => column.id);
export const ALL_COLUMN_IDS = ORDER_COLUMNS.map((column) => column.id);
export const REQUIRED_COLUMN_IDS = ORDER_COLUMNS.filter((column) => column.required).map((column) => column.id);
export const FIXED_COLUMN_IDS = REQUIRED_COLUMN_IDS;
export const COLUMN_STORAGE_KEY = 'washdoor_pos_column_preferences_v1';

export function sanitizeAndOrderColumns(selectedIds) {
  if (!Array.isArray(selectedIds) || selectedIds.length === 0) {
    return [...DEFAULT_COLUMN_IDS];
  }
  const idSet = new Set(ALL_COLUMN_IDS);
  return ALL_COLUMN_IDS.filter((id) => selectedIds.includes(id) && idSet.has(id));
}

export function enforceRequiredColumns(selectedIds) {
  const current = Array.isArray(selectedIds) ? selectedIds : [];
  return sanitizeAndOrderColumns([...new Set([...current, ...REQUIRED_COLUMN_IDS])]);
}
