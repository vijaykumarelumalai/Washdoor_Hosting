// src/config/businessRules.js
// Centralized Business Rules, Tax Rates & Financial Calculation Helpers for Washdoor

export const BUSINESS_CONFIG = {
  BRAND_NAME: 'Washdoor',
  BRAND_TAGLINE: 'Professional Laundry & Dry Cleaning',
  STORE_BRANCH: 'Ranipet Store #1',
  STORE_PHONE: '+91 98765 43210',
  STORE_EMAIL: 'support@washdoor.in',
  STORE_GSTIN: '33AABCT1332L1Z8',
  CURRENCY_SYMBOL: '₹',
  DEFAULT_GST_RATE: 0.05, // 5% GST
  DEFAULT_GST_LABEL: 'GST (5%)',
};

export const SERVICE_CATEGORIES = [
  'Laundry + Iron',
  'Normal Wash',
  'Dry Clean',
  'Steam Press',
  'Wash & Fold',
  'Shoe Spa / Leather Care',
];

export const PAYMENT_MODES = [
  'Cash',
  'UPI / QR Code',
  'Credit / Debit Card',
  'Net Banking',
  'Store Credit',
];

export const ORDER_STATUSES = [
  'Received',
  'In Progress',
  'Ready',
  'Delivered',
  'Cancelled',
];

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
