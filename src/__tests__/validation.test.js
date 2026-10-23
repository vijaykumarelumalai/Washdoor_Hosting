// src/__tests__/validation.test.js
// Unit tests for the validation utility.
// Run with: npm test

import { validateCustomer, friendlySupabaseError, formatDOB, parseDOBInput } from '../utils/validation';

// ── validateCustomer ─────────────────────────────────────────

describe('validateCustomer', () => {
  const valid = {
    customer_name: 'Rahul Sharma',
    mobile_number: '9876543210',
  };

  test('accepts a minimal valid payload', () => {
    expect(validateCustomer(valid)).toEqual({});
  });

  test('requires customer_name', () => {
    const errors = validateCustomer({ ...valid, customer_name: '' });
    expect(errors.customer_name).toBeDefined();
  });

  test('requires mobile_number', () => {
    const errors = validateCustomer({ ...valid, mobile_number: '' });
    expect(errors.mobile_number).toBeDefined();
  });

  test('rejects mobile_number shorter than 10 digits', () => {
    const errors = validateCustomer({ ...valid, mobile_number: '98765' });
    expect(errors.mobile_number).toBeDefined();
  });

  test('rejects non-numeric mobile_number', () => {
    const errors = validateCustomer({ ...valid, mobile_number: 'abcdefghij' });
    expect(errors.mobile_number).toBeDefined();
  });

  test('accepts valid 10-digit mobile_number', () => {
    const errors = validateCustomer({ ...valid, mobile_number: '9876543210' });
    expect(errors.mobile_number).toBeUndefined();
  });

  test('rejects alternate_phone that is not 10 digits', () => {
    const errors = validateCustomer({ ...valid, alternate_phone: '123' });
    expect(errors.alternate_phone).toBeDefined();
  });

  test('accepts empty alternate_phone (optional)', () => {
    const errors = validateCustomer({ ...valid, alternate_phone: '' });
    expect(errors.alternate_phone).toBeUndefined();
  });

  test('rejects pincode that is not 6 digits', () => {
    const errors = validateCustomer({ ...valid, pincode: '1234' });
    expect(errors.pincode).toBeDefined();
  });

  test('accepts valid 6-digit pincode', () => {
    const errors = validateCustomer({ ...valid, pincode: '400001' });
    expect(errors.pincode).toBeUndefined();
  });

  test('rejects invalid email', () => {
    const errors = validateCustomer({ ...valid, email: 'not-an-email' });
    expect(errors.email).toBeDefined();
  });

  test('accepts valid email', () => {
    const errors = validateCustomer({ ...valid, email: 'user@example.com' });
    expect(errors.email).toBeUndefined();
  });

  test('rejects non-http map_link', () => {
    const errors = validateCustomer({ ...valid, map_link: 'ftp://somewhere.com' });
    expect(errors.map_link).toBeDefined();
  });

  test('accepts valid https map_link', () => {
    const errors = validateCustomer({ ...valid, map_link: 'https://maps.google.com/?q=Mumbai' });
    expect(errors.map_link).toBeUndefined();
  });
});

// ── friendlySupabaseError ────────────────────────────────────

describe('friendlySupabaseError', () => {
  test('returns null for no error', () => {
    expect(friendlySupabaseError(null)).toBeNull();
  });

  test('catches duplicate mobile number', () => {
    const msg = friendlySupabaseError({ message: 'customers_mobile_number_key duplicate' });
    expect(msg).toContain('already registered');
  });

  test('catches generic unique violation', () => {
    const msg = friendlySupabaseError({ message: 'unique constraint violation' });
    expect(msg).toContain('already registered');
  });

  test('returns raw message for unknown error', () => {
    const msg = friendlySupabaseError({ message: 'Something went wrong' });
    expect(msg).toBe('Something went wrong');
  });
});

// ── formatDOB ────────────────────────────────────────────────

describe('formatDOB', () => {
  test('formats ISO date to dd-mm-yyyy', () => {
    expect(formatDOB('1990-05-15')).toBe('15-05-1990');
  });

  test('returns empty string for empty input', () => {
    expect(formatDOB('')).toBe('');
  });

  test('returns empty string for null', () => {
    expect(formatDOB(null)).toBe('');
  });
});

// ── parseDOBInput ────────────────────────────────────────────

describe('parseDOBInput', () => {
  test('converts dd-mm-yyyy to yyyy-mm-dd', () => {
    expect(parseDOBInput('15-05-1990')).toBe('1990-05-15');
  });

  test('passes through already-ISO date unchanged', () => {
    expect(parseDOBInput('1990-05-15')).toBe('1990-05-15');
  });

  test('returns empty for empty input', () => {
    expect(parseDOBInput('')).toBe('');
  });
});
