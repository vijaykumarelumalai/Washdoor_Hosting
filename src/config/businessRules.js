// src/config/businessRules.js
// Centralized Business Rules, Tax Rates & Financial Calculation Helpers for Washdoor

const SETTINGS_STORAGE_KEY = 'washdoor_settings_config';

export const DEFAULT_SETTINGS = {
  // Business Profile
  shopName: 'Washdoor',
  shopTagline: 'Professional Laundry & Dry Cleaning',
  storeBranch: 'Ranipet Store #1',
  phone: '+91 7338851369',
  email: 'info@washdoor.in',
  whatsappNumber: '+91 7338851369',
  address: 'No.7, 4th Avenue, 1st Cross Road, MBT Road',
  city: 'Chennai',
  state: 'Tamil Nadu',
  pinCode: '632401',
  gstNumber: '33AABCT1332L1Z8',
  shopLogo: '',
  previousShopName: '',
  previousShopLogo: '',
  shopNameUpdatedAt: null,
  logoUpdatedAt: null,
  updatedAt: null,
  updatedBy: 'Store Administrator',
  latitude: 12.9249,
  longitude: 79.3338,

  // Tax & Currency
  currencyCode: 'INR',
  currencySymbol: '₹',
  taxRate: 0.05,
  taxLabel: 'GST (5%)',
  taxInclusive: false,
  isTaxEnabled: true,

  // Bank & Payments
  bankName: 'State Bank of India',
  accountHolder: 'Washdoor Laundry Services Pvt Ltd',
  accountNumber: '389201948201',
  ifscCode: 'SBIN0001234',
  branchName: 'Ranipet Main Branch',
  upiId: 'washdoor@sbi',
  merchantName: 'Washdoor Ranipet',
  enabledPayments: {
    cash: true,
    upi: true,
    card: true,
    wallet: true,
    netbanking: true,
    credit: true,
  },

  // Operations & Receipts
  receiptSize: '80mm',
  printBarcode: true,
  printQrCode: true,
  printLogoOnReceipt: true,
  printGstOnReceipt: true,
  printAddressOnReceipt: true,
  receiptHeaderMessage: 'Professional Laundry & Dry Cleaning Services',
  receiptFooterMessage: 'Thank you for choosing Washdoor! For pickups call +91 7338851369',
  receiptTerms: '1. Garments must be collected within 15 days.\n2. Please check garments at the time of delivery.\n3. Company liability limited to 10x service charge.',

  // Notifications & Alert Channels
  notificationsEnabled: {
    whatsapp: true,
    sms: true,
    email: false,
    orderReceived: true,
    orderReady: true,
    pickupDispatch: true,
    paymentReceived: true,
  },

  // Notification and Messaging Templates (WhatsApp & SMS)
  messageTemplates: {
    orderReceived: {
      whatsapp: "🧺 *Washdoor Laundry Update*\nDear {customer_name}, your order *#{order_id}* ({item_count} items) is safely received at {store_branch}!\n📅 Expected Ready: {expected_delivery}\n💵 Total: {total_amount}\n🔍 Live Tracking: {tracking_link}\nThank you for choosing Washdoor!",
      sms: "Dear {customer_name}, order #{order_id} ({item_count} items) is received at Washdoor. Expected: {expected_delivery}. Track: {tracking_link}",
    },
    orderReady: {
      whatsapp: "✨ *Garments Ready for Pickup!*\nHello {customer_name}, your laundry for order *#{order_id}* is freshly processed and ready for collection at {store_branch}.\n💰 Amount Due: {balance_due}\n📍 Store: {store_branch}\nSee you soon!",
      sms: "Washdoor: Order #{order_id} is ready for pickup at {store_branch}. Balance due: {balance_due}. Thank you!",
    },
    pickupDispatch: {
      whatsapp: "🚚 *Out for Delivery!*\nHi {customer_name}, delivery agent *{driver_name}* is on the way with your laundry order *#{order_id}*.\n📞 Driver Phone: {driver_phone}\nThank you for choosing Washdoor!",
      sms: "Washdoor: Agent {driver_name} is out for delivery with order #{order_id}. Contact driver: {driver_phone}.",
    },
    paymentReceived: {
      whatsapp: "💳 *Payment Received Receipt*\nDear {customer_name}, we received payment of *{amount_paid}* for order *#{order_id}* via {payment_method}.\nRemaining Balance: {balance_due}.\n🙏 Thank you for trusting Washdoor!",
      sms: "Washdoor: Received payment of {amount_paid} for order #{order_id} via {payment_method}. Balance: {balance_due}. Thank you!",
    },
  },

  // Language & Regional
  language: 'en',
  dateFormat: 'DD/MM/YYYY',
  timeFormat: '12h',
};

/**
 * Loads stored settings from localStorage or defaults
 */
export function getStoredSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        ...DEFAULT_SETTINGS,
        ...parsed,
        enabledPayments: { ...DEFAULT_SETTINGS.enabledPayments, ...(parsed.enabledPayments || {}) },
        notificationsEnabled: { ...DEFAULT_SETTINGS.notificationsEnabled, ...(parsed.notificationsEnabled || {}) },
        messageTemplates: {
          orderReceived: { ...DEFAULT_SETTINGS.messageTemplates.orderReceived, ...(parsed.messageTemplates?.orderReceived || {}) },
          orderReady: { ...DEFAULT_SETTINGS.messageTemplates.orderReady, ...(parsed.messageTemplates?.orderReady || {}) },
          pickupDispatch: { ...DEFAULT_SETTINGS.messageTemplates.pickupDispatch, ...(parsed.messageTemplates?.pickupDispatch || {}) },
          paymentReceived: { ...DEFAULT_SETTINGS.messageTemplates.paymentReceived, ...(parsed.messageTemplates?.paymentReceived || {}) },
        },
      };
    }
  } catch (err) {
    console.warn('Error reading stored settings:', err);
  }
  return { ...DEFAULT_SETTINGS };
}

/**
 * Saves settings to localStorage and updates runtime values
 */
export function saveStoredSettings(newSettings) {
  try {
    const merged = { ...getStoredSettings(), ...newSettings };
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(merged));
    
    // Update runtime BUSINESS_CONFIG
    BUSINESS_CONFIG.BRAND_NAME = merged.shopName || BUSINESS_CONFIG.BRAND_NAME;
    BUSINESS_CONFIG.SHOP_LOGO = merged.shopLogo !== undefined ? (merged.shopLogo || '') : BUSINESS_CONFIG.SHOP_LOGO;
    BUSINESS_CONFIG.BRAND_TAGLINE = merged.shopTagline || BUSINESS_CONFIG.BRAND_TAGLINE;
    BUSINESS_CONFIG.STORE_BRANCH = merged.storeBranch || BUSINESS_CONFIG.STORE_BRANCH;
    BUSINESS_CONFIG.STORE_PHONE = merged.phone || BUSINESS_CONFIG.STORE_PHONE;
    BUSINESS_CONFIG.STORE_EMAIL = merged.email || BUSINESS_CONFIG.STORE_EMAIL;
    BUSINESS_CONFIG.STORE_GSTIN = merged.gstNumber || BUSINESS_CONFIG.STORE_GSTIN;
    BUSINESS_CONFIG.CURRENCY_SYMBOL = merged.currencySymbol || BUSINESS_CONFIG.CURRENCY_SYMBOL;
    BUSINESS_CONFIG.DEFAULT_GST_RATE = Number(merged.taxRate) || BUSINESS_CONFIG.DEFAULT_GST_RATE;
    BUSINESS_CONFIG.DEFAULT_GST_LABEL = merged.taxLabel || BUSINESS_CONFIG.DEFAULT_GST_LABEL;

    if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
      window.dispatchEvent(new CustomEvent('washdoor_settings_updated', { detail: merged }));
    }
    
    return merged;
  } catch (err) {
    console.error('Error saving settings:', err);
    return newSettings;
  }
}

// Initialise from storage if available
const initialStored = typeof window !== 'undefined' ? getStoredSettings() : DEFAULT_SETTINGS;

export const BUSINESS_CONFIG = {
  BRAND_NAME: initialStored.shopName || 'Washdoor',
  SHOP_LOGO: initialStored.shopLogo || '',
  BRAND_TAGLINE: initialStored.shopTagline || 'Professional Laundry & Dry Cleaning',
  STORE_BRANCH: initialStored.storeBranch || 'Ranipet Store #1',
  STORE_PHONE: initialStored.phone || '+91 7338851369',
  STORE_EMAIL: initialStored.email || 'support@washdoor.in',
  STORE_GSTIN: initialStored.gstNumber || '33AABCT1332L1Z8',
  CURRENCY_SYMBOL: initialStored.currencySymbol || '₹',
  DEFAULT_GST_RATE: Number(initialStored.taxRate) || 0.05, // 5% GST
  DEFAULT_GST_LABEL: initialStored.taxLabel || 'GST (5%)',
};

export const SERVICE_CATEGORIES = [
  'Laundry',
  'Dry cleaning',
  'Washing by KG',
  'Shoe cleaning',
  'Ironing only',
  'Customer category',
];

export const PAYMENT_MODES = [
  'Cash',
  'UPI / QR Code',
  'Credit / Debit Card',
  'Net Banking',
  'Store Credit',
];

export const ORDER_STATUSES = [
  'order recived',
  'landry in progress',
  'ladaery in pro Emer',
  'ready for delvier',
  'dfa',
  'dfa -card',
  'today delivery',
  'other',
  'not cleared',
];

export const PROPERTY_STATUSES = [
  'Yes',
  'No',
];

export const ORDER_STATUS_CONFIG = {
  'order recived': {
    id: 'order recived',
    label: 'Order Received',
    shortLabel: 'Received',
    color: '#1d4ed8',
    bg: '#eff6ff',
    border: '#bfdbfe',
    dot: '#2563eb',
    icon: '📥',
    stage: 1,
  },
  'landry in progress': {
    id: 'landry in progress',
    label: 'Laundry In Progress',
    shortLabel: 'In Progress',
    color: '#b45309',
    bg: '#fef3c7',
    border: '#fde68a',
    dot: '#f59e0b',
    icon: '⏱',
    stage: 2,
  },
  'ladaery in pro Emer': {
    id: 'ladaery in pro Emer',
    label: 'Laundry In Pro (Emer)',
    shortLabel: 'Emergency / Express',
    color: '#b91c1c',
    bg: '#fee2e2',
    border: '#fca5a5',
    dot: '#ef4444',
    icon: '🚨',
    emergency: true,
    stage: 2,
  },
  'ready for delvier': {
    id: 'ready for delvier',
    label: 'Ready For Delivery',
    shortLabel: 'Ready',
    color: '#15803d',
    bg: '#dcfce7',
    border: '#bbf7d0',
    dot: '#10b981',
    icon: '✓',
    stage: 3,
  },
  'dfa': {
    id: 'dfa',
    label: 'DFA',
    shortLabel: 'DFA',
    color: '#7e22ce',
    bg: '#f3e8ff',
    border: '#d8b4fe',
    dot: '#a855f7',
    icon: '📦',
    stage: 4,
  },
  'dfa -card': {
    id: 'dfa -card',
    label: 'DFA - Card',
    shortLabel: 'DFA Card',
    color: '#4338ca',
    bg: '#e0e7ff',
    border: '#c7d2fe',
    dot: '#6366f1',
    icon: '💳',
    stage: 4,
  },
  'today delivery': {
    id: 'today delivery',
    label: 'Today Delivery',
    shortLabel: 'Today Delivery',
    color: '#0e7490',
    bg: '#cffafe',
    border: '#a5f3fc',
    dot: '#06b6d4',
    icon: '🚚',
    stage: 4,
  },
  'not cleared': {
    id: 'not cleared',
    label: 'Not Cleared',
    shortLabel: 'Not Cleared',
    color: '#be123c',
    bg: '#ffe4e6',
    border: '#fecdd3',
    dot: '#f43f5e',
    icon: '⚠️',
    stage: 2,
  },
  'other': {
    id: 'other',
    label: 'Other',
    shortLabel: 'Other',
    color: '#475569',
    bg: '#f1f5f9',
    border: '#cbd5e1',
    dot: '#64748b',
    icon: '•',
    stage: 1,
  },
};

/**
 * Normalizes any status string into one of the 9 canonical statuses.
 */
export function normalizeOrderStatus(raw) {
  if (!raw) return 'order recived';
  const s = String(raw).trim().toLowerCase();
  if (s === 'order recived' || s === 'order received' || s === 'received' || s.includes('intake') || s === 'new') {
    return 'order recived';
  }
  if (s === 'ladaery in pro emer' || s === 'emergency' || s.includes('emer') || s.includes('urgent')) {
    return 'ladaery in pro Emer';
  }
  if (s === 'landry in progress' || s === 'laundry in progress' || s === 'in progress' || s.includes('wash') || s.includes('progress')) {
    return 'landry in progress';
  }
  if (s === 'ready for delvier' || s === 'ready for delivery' || s === 'ready' || s.includes('ready')) {
    return 'ready for delvier';
  }
  if (s === 'dfa -card' || s === 'dfa card' || s.includes('dfa-card') || s.includes('dfa - card')) {
    return 'dfa -card';
  }
  if (s === 'dfa' || s.includes('agency')) {
    return 'dfa';
  }
  if (s === 'today delivery' || s === 'today' || (s.includes('today') && s.includes('deliver'))) {
    return 'today delivery';
  }
  if (s === 'not cleared' || s.includes('uncleared') || s.includes('not cleared') || s.includes('hold')) {
    return 'not cleared';
  }
  if (s === 'cancelled' || s === 'other' || s.includes('cancel')) {
    return 'other';
  }
  if (s.includes('deliver')) {
    return 'today delivery';
  }
  return 'order recived';
}

/**
 * Rounds numeric currency value to 2 decimal places.
 */
export function roundCurrency(amount) {
  const num = Number(amount);
  if (isNaN(num)) return 0;
  return Math.round((num + Number.EPSILON) * 100) / 100;
}

/**
 * Formats a number to currency with symbol: e.g. ₹150.00
 */
export function formatCurrency(amount, symbol = BUSINESS_CONFIG.CURRENCY_SYMBOL) {
  return `${symbol}${roundCurrency(amount).toFixed(2)}`;
}

/**
 * Calculates financial totals including tax.
 */
export function calculateOrderTotals(items = [], taxRate = BUSINESS_CONFIG.DEFAULT_GST_RATE, isTaxExempt = false) {
  const subtotal = items.reduce((sum, it) => {
    const qty = Number(it.qty || it.count || 1);
    const rate = Number(it.rate || it.price || it.base_price || 0);
    return sum + (qty * rate);
  }, 0);

  const roundedSubtotal = roundCurrency(subtotal);
  const taxAmount = isTaxExempt ? 0 : roundCurrency(roundedSubtotal * taxRate);
  const grandTotal = roundCurrency(roundedSubtotal + taxAmount);

  return {
    subtotal: roundedSubtotal,
    taxRate: isTaxExempt ? 0 : taxRate,
    taxAmount,
    grandTotal,
  };
}
