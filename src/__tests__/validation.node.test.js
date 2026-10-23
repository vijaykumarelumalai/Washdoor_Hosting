// src/__tests__/validation.node.test.js
import test from 'node:test';
import assert from 'node:assert/strict';
import { validateCustomer, friendlySupabaseError, formatPhoneDisplay } from '../utils/validation.js';

test('validateCustomer accepts a valid minimal customer payload', () => {
  const valid = {
    customer_name: 'Ananya Deshmukh',
    mobile_number: '9833290123',
  };
  const errors = validateCustomer(valid);
  assert.deepEqual(errors, {});
});

test('validateCustomer requires customer_name', () => {
  const invalid = {
    customer_name: '   ',
    mobile_number: '9833290123',
  };
  const errors = validateCustomer(invalid);
  assert.equal(errors.customer_name, 'Customer name is required.');
});

test('validateCustomer requires exactly 10 digits for mobile_number', () => {
  const shortPhone = {
    customer_name: 'Aarav Mehta',
    mobile_number: '98450123',
  };
  const errorsShort = validateCustomer(shortPhone);
  assert.ok(errorsShort.mobile_number);

  const nonNumeric = {
    customer_name: 'Aarav Mehta',
    mobile_number: '984501234a',
  };
  const errorsNonNumeric = validateCustomer(nonNumeric);
  assert.ok(errorsNonNumeric.mobile_number);
});

test('validateCustomer checks optional alternate_phone', () => {
  const invalidAlt = {
    customer_name: 'Divya Krishnan',
    mobile_number: '9841098765',
    alternate_phone: '12345',
  };
  const errors = validateCustomer(invalidAlt);
  assert.ok(errors.alternate_phone);

  const validAlt = {
    customer_name: 'Divya Krishnan',
    mobile_number: '9841098765',
    alternate_phone: '9841098760',
  };
  assert.deepEqual(validateCustomer(validAlt), {});
});

test('validateCustomer checks optional pincode (6 digits)', () => {
  const invalidPin = {
    customer_name: 'Karthik Raman',
    mobile_number: '9884011223',
    pincode: '6000',
  };
  assert.ok(validateCustomer(invalidPin).pincode);

  const validPin = {
    customer_name: 'Karthik Raman',
    mobile_number: '9884011223',
    pincode: '600042',
  };
  assert.deepEqual(validateCustomer(validPin), {});
});

test('validateCustomer checks optional email format', () => {
  const invalidEmail = {
    customer_name: 'Rahul',
    mobile_number: '9876543210',
    email: 'invalid-email',
  };
  assert.ok(validateCustomer(invalidEmail).email);

  const validEmail = {
    customer_name: 'Rahul',
    mobile_number: '9876543210',
    email: 'rahul@example.com',
  };
  assert.deepEqual(validateCustomer(validEmail), {});
});

test('validateCustomer checks optional map_link format', () => {
  const invalidLink = {
    customer_name: 'Rahul',
    mobile_number: '9876543210',
    map_link: 'not-a-url',
  };
  assert.ok(validateCustomer(invalidLink).map_link);

  const validLink = {
    customer_name: 'Rahul',
    mobile_number: '9876543210',
    map_link: 'https://maps.google.com/?q=Chennai',
  };
  assert.deepEqual(validateCustomer(validLink), {});
});

test('friendlySupabaseError formats duplicate mobile and constraint errors', () => {
  const dupErr = { message: 'duplicate key value violates unique constraint "customers_mobile_number_key"' };
  assert.equal(friendlySupabaseError(dupErr), 'This mobile number is already registered in the system.');

  const fkErr = { message: 'violates foreign key constraint "orders_customer_id_fkey"' };
  assert.equal(friendlySupabaseError(fkErr), 'Cannot delete customer because they have existing orders.');
});

test('formatPhoneDisplay formats 10-digit numbers into standard readable form', () => {
  assert.equal(formatPhoneDisplay('9833290123'), '+91 98332 90123');
});
