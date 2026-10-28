// src/__tests__/validation.node.test.js
import test from 'node:test';
import assert from 'node:assert/strict';
import { validateCustomer, friendlySupabaseError, formatPhoneDisplay, formatDOB, parseDOBInput, normalizeMobileNumber, isMobileNumberQuery, getAgeFromDOB } from '../utils/validation.js';
import { formatOrderId, formatCustomerId } from '../services/customerService.js';

test('formatOrderId generates canonical 5-digit padded order identifier starting with ORDER', () => {
  assert.equal(formatOrderId(null), 'ORDER-00001');
  assert.equal(formatOrderId(''), 'ORDER-00001');
  assert.equal(formatOrderId(1), 'ORDER-00001');
  assert.equal(formatOrderId('2'), 'ORDER-00002');
  assert.equal(formatOrderId('ORDER-00005'), 'ORDER-00005');
  assert.equal(formatOrderId('ORDER-12'), 'ORDER-00012');
  assert.equal(formatOrderId('order-99'), 'ORDER-00099');
});

test('formatCustomerId generates canonical 5-digit padded customer identifier starting with CUST', () => {
  assert.equal(formatCustomerId(null), 'CUST-00001');
  assert.equal(formatCustomerId(''), 'CUST-00001');
  assert.equal(formatCustomerId(1), 'CUST-00001');
  assert.equal(formatCustomerId('CUST-00003'), 'CUST-00003');
  assert.equal(formatCustomerId('cust-42'), 'CUST-00042');
});

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
  assert.equal(formatPhoneDisplay('+919833290123'), '+91 98332 90123');
});

test('normalizeMobileNumber strips non-digits and standardizes +91 and 0 prefixes to 10 digits', () => {
  assert.equal(normalizeMobileNumber('9876543210'), '9876543210');
  assert.equal(normalizeMobileNumber('+919876543210'), '9876543210');
  assert.equal(normalizeMobileNumber('+91 98765 43210'), '9876543210');
  assert.equal(normalizeMobileNumber('09876543210'), '9876543210');
  assert.equal(normalizeMobileNumber(''), '');
});

test('validateCustomer accepts numbers with +91 country code and spaces', () => {
  const withPrefix = {
    customer_name: 'Ravi Kumar',
    mobile_number: '+91 98765 43210',
  };
  assert.deepEqual(validateCustomer(withPrefix), {});
});

test('formatDOB formats ISO date to dd-mm-yyyy and handles falsy values', () => {
  assert.equal(formatDOB('1990-05-15'), '15-05-1990');
  assert.equal(formatDOB(''), '');
  assert.equal(formatDOB(null), '');
});

test('parseDOBInput converts dd-mm-yyyy to ISO yyyy-mm-dd', () => {
  assert.equal(parseDOBInput('15-05-1990'), '1990-05-15');
  assert.equal(parseDOBInput('1990-05-15'), '1990-05-15');
  assert.equal(parseDOBInput(''), '');
});

test('isMobileNumberQuery accepts only authentic 10-digit mobile numbers and rejects text and symbols', () => {
  // Valid mobile formats
  assert.equal(isMobileNumberQuery('9876543210'), true);
  assert.equal(isMobileNumberQuery('+91 9876543210'), true);
  assert.equal(isMobileNumberQuery('+91 98765 43210'), true);
  assert.equal(isMobileNumberQuery('09876543210'), true);
  assert.equal(isMobileNumberQuery('98765-43210'), true);

  // Text queries (like in user screenshot) -> must be false
  assert.equal(isMobileNumberQuery('ujhfds'), false);
  assert.equal(isMobileNumberQuery('John Doe'), false);
  assert.equal(isMobileNumberQuery('Ramesh'), false);

  // Symbols and mixed queries -> must be false
  assert.equal(isMobileNumberQuery('@#$%^'), false);
  assert.equal(isMobileNumberQuery('98765ujhfds'), false);
  assert.equal(isMobileNumberQuery('phone#9876543210'), false);
  assert.equal(isMobileNumberQuery(''), false);
  assert.equal(isMobileNumberQuery('   '), false);
  assert.equal(isMobileNumberQuery('12345'), false); // too short
  assert.equal(isMobileNumberQuery('123456789012345'), false); // too long
});

test('getAgeFromDOB calculates valid age from ISO date string', () => {
  assert.equal(getAgeFromDOB(''), null);
  assert.equal(getAgeFromDOB(null), null);
  assert.equal(getAgeFromDOB('invalid-date'), null);
  // Calculate expected age dynamically
  const birthYear = 2000;
  const today = new Date();
  const expectedAge = today.getFullYear() - birthYear - (today.getMonth() < 0 || (today.getMonth() === 0 && today.getDate() < 1) ? 1 : 0);
  assert.equal(getAgeFromDOB('2000-01-01'), expectedAge);
});
