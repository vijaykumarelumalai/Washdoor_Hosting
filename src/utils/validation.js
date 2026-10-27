// src/utils/validation.js
// Validation logic for Customer & Order data

export function normalizeMobileNumber(phone) {
  if (!phone) return '';
  const digits = String(phone).replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('91')) {
    return digits.slice(2);
  }
  if (digits.length === 11 && digits.startsWith('0')) {
    return digits.slice(1);
  }
  return digits;
}

export function validateCustomer(data) {
  const errors = {};

  // Required: Customer name
  if (!data.customer_name || !data.customer_name.trim()) {
    errors.customer_name = 'Customer name is required.';
  }

  // Required: Mobile number (normalized to 10-digit national number with +91 country code)
  const cleanMobile = normalizeMobileNumber(data.mobile_number);
  if (!cleanMobile) {
    errors.mobile_number = 'Mobile number is required.';
  } else if (!/^[0-9]{10}$/.test(cleanMobile)) {
    errors.mobile_number = 'Enter a valid 10-digit mobile number.';
  }

  // Optional: Alternate phone (exactly 10 numeric digits if provided)
  if (data.alternate_phone && data.alternate_phone.trim()) {
    const cleanAlt = normalizeMobileNumber(data.alternate_phone);
    if (!/^[0-9]{10}$/.test(cleanAlt)) {
      errors.alternate_phone = 'Alternate phone number must contain exactly 10 digits.';
    }
  }

  // Optional: Pincode (exactly 6 numeric digits if provided)
  if (data.pincode && data.pincode.trim()) {
    if (!/^[0-9]{6}$/.test(data.pincode.trim())) {
      errors.pincode = 'Pincode must contain exactly 6 digits.';
    }
  }

  // Optional: Email format
  if (data.email && data.email.trim()) {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email.trim())) {
      errors.email = 'Enter a valid email address.';
    }
  }

  // Optional: Map link (must be a valid URL with http:// or https://)
  if (data.map_link && data.map_link.trim()) {
    try {
      const url = new URL(data.map_link.trim());
      if (!['http:', 'https:'].includes(url.protocol)) {
        errors.map_link = 'Map link must start with http:// or https://';
      }
    } catch {
      errors.map_link = 'Enter a valid URL for the map link.';
    }
  }

  return errors;
}

export function friendlySupabaseError(error) {
  if (!error) return null;
  const message = error.message || String(error);

  if (message.includes('row-level security') || error.code === '42501') {
    return 'Supabase Row Level Security (RLS) is blocking inserts. Run the RLS policy in Supabase SQL Editor.';
  }

  if (message.includes('customers_mobile_number_key') || message.includes('duplicate key value')) {
    return 'This mobile number is already registered in the system.';
  }
  if (message.includes('check constraint') || message.includes('violates check')) {
    if (message.includes('mobile_number')) return 'Mobile number must be exactly 10 digits.';
    if (message.includes('pincode')) return 'Pincode must be exactly 6 digits.';
    if (message.includes('alternate_phone')) return 'Alternate phone must be exactly 10 digits.';
    if (message.includes('email')) return 'Invalid email format.';
    if (message.includes('map_link')) return 'Map link must start with http:// or https://';
  }
  if (message.includes('foreign key') || message.includes('violates foreign key')) {
    return 'Cannot delete customer because they have existing orders.';
  }

  return message;
}

export function formatPhoneDisplay(phone) {
  if (!phone) return '';
  const clean = normalizeMobileNumber(phone);
  if (clean.length === 10) {
    return `+91 ${clean.slice(0, 5)} ${clean.slice(5)}`;
  }
  return String(phone);
}

export function formatDOB(isoDate) {
  if (!isoDate) return '';
  const clean = String(isoDate).trim();
  const parts = clean.split('-');
  if (parts.length === 3) {
    const [year, month, day] = parts;
    return `${day.padStart(2, '0')}-${month.padStart(2, '0')}-${year}`;
  }
  return clean;
}

export function parseDOBInput(input) {
  if (!input) return '';
  const clean = String(input).trim();
  if (/^\d{1,2}[-/.]\d{1,2}[-/.]\d{4}$/.test(clean)) {
    const parts = clean.split(/[-/.]/);
    const day = parts[0].padStart(2, '0');
    const month = parts[1].padStart(2, '0');
    const year = parts[2];
    return `${year}-${month}-${day}`;
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) {
    return clean;
  }
  return clean;
}
