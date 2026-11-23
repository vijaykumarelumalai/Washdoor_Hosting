export const GST_RATE = 0.05;

// Order status list (canonical, used throughout the app)
export const ORDER_STATUSES = [
  'Order Received',
  'In Progress',
  'Ready',
  'Delivered',
  'Cancelled',
] as const;

// Payment status list
export const PAYMENT_STATUSES = [
  'Unpaid',
  'Partially Paid',
  'Paid',
] as const;

// Payment mode list
export const PAYMENT_MODES = [
  'Cash',
  'UPI / QR Code',
  'Card',
  'Store Credit',
  'Wallet',
] as const;

// Order tab list (for OrderStatusDrawer/Panel tabs)
export const ORDER_TABS = [
  'details',
  'history',
  'payment',
  'collection',
] as const;

// Column ID constants for Orders table
export const ColumnId = {
  CHECKBOX: 'checkbox',
  CHECK: 'check',
  ORDER_NUMBER: 'order_number',
  CUSTOMER: 'customer',
  STATUS: 'status',
  TOTAL: 'total',
  ADVANCE: 'advance',
  BALANCE: 'balance',
  ACTIONS: 'actions',
} as const;

// Default column order for new orders
export const DEFAULT_COLUMN_IDS = [
  ColumnId.CHECKBOX,
  ColumnId.ORDER_NUMBER,
  ColumnId.CUSTOMER,
  ColumnId.STATUS,
  ColumnId.TOTAL,
  ColumnId.ADVANCE,
  ColumnId.BALANCE,
  ColumnId.ACTIONS,
] as const;

// All available column IDs
export const ALL_COLUMN_IDS = [
  ColumnId.CHECKBOX,
  ColumnId.CHECK,
  ColumnId.ORDER_NUMBER,
  ColumnId.CUSTOMER,
  ColumnId.STATUS,
  ColumnId.TOTAL,
  ColumnId.ADVANCE,
  ColumnId.BALANCE,
  ColumnId.ACTIONS,
] as const;

// Required column IDs (must always be present)
export const REQUIRED_COLUMN_IDS = [
  ColumnId.CHECKBOX,
  ColumnId.ORDER_NUMBER,
  ColumnId.CUSTOMER,
  ColumnId.STATUS,
] as const;

// Fixed column IDs (always on the left/fixed side)
export const FIXED_COLUMN_IDS = [ColumnId.CHECKBOX, ColumnId.ORDER_NUMBER] as const;

// Status color mapping
export const STATUS_COLORS = {
  'Order Received': {
    bg: '#eff6ff',
    color: '#1d4ed8',
    border: '#bfdbfe',
    dot: '#2563eb',
  },
  'In Progress': {
    bg: '#fef3c7',
    color: '#b45309',
    border: '#fde68a',
    dot: '#f59e0b',
  },
  Ready: {
    bg: '#dcfce7',
    color: '#15803d',
    border: '#bbf7d0',
    dot: '#10b981',
  },
  Delivered: {
    bg: '#dcfce7',
    color: '#15803d',
    border: '#bbf7d0',
    dot: '#16a34a',
  },
  Cancelled: {
    bg: '#fee2e2',
    color: '#b91c1c',
    border: '#fecaca',
    dot: '#ef4444',
  },
} as const;

// Tax configuration
export const TAX_CONFIG = {
  rate: GST_RATE,
  label: 'GST (5%)',
  inclusive: false,
};

// Order type constants
export const ORDER_TYPE = {
  WALK_IN: 'Walk-In',
  COUNTER_DROP: 'Counter Drop',
  PHONE_CALL: 'On-Call (Pickup)',
  PICKUP_DELIVERY: 'Pickup & Delivery',
} as const;