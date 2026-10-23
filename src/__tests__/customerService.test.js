// src/__tests__/customerService.test.js
// Integration tests that mock the Supabase client.
// Run with: npm test

// ── Mock supabase ────────────────────────────────────────────
jest.mock('../lib/supabaseClient', () => {
  const mockSingle = jest.fn();
  const mockSelect = jest.fn();
  const mockInsert = jest.fn();
  const mockUpdate = jest.fn();
  const mockDelete = jest.fn();
  const mockEq     = jest.fn();
  const mockOr     = jest.fn();
  const mockOrder  = jest.fn();
  const mockLimit  = jest.fn();
  const mockRpc    = jest.fn();

  // Chain builder
  const chain = {
    select:  (...args) => { mockSelect(...args);  return chain; },
    insert:  (...args) => { mockInsert(...args);  return chain; },
    update:  (...args) => { mockUpdate(...args);  return chain; },
    delete:  (...args) => { mockDelete(...args);  return chain; },
    eq:      (...args) => { mockEq(...args);      return chain; },
    or:      (...args) => { mockOr(...args);      return chain; },
    order:   (...args) => { mockOrder(...args);   return chain; },
    limit:   (...args) => { mockLimit(...args);   return chain; },
    single:  (...args) => { mockSingle(...args);  return chain; },
    // Default resolved promise (override in each test)
    then: (resolve) => Promise.resolve({ data: [], error: null }).then(resolve),
  };

  const supabase = {
    from: jest.fn(() => chain),
    rpc:  mockRpc,
    _chain: chain,
    _mocks: { mockSelect, mockInsert, mockUpdate, mockDelete, mockEq, mockOr, mockOrder, mockLimit, mockSingle, mockRpc },
  };

  return { supabase };
});

import { supabase } from '../lib/supabaseClient';
import {
  searchCustomers,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  createOrderWithCustomer,
} from '../services/customerService';

// Helper to simulate resolved data from the chain
function mockResolve(data, error = null) {
  supabase._chain.then = (resolve) =>
    Promise.resolve({ data, error }).then(resolve);
}

beforeEach(() => {
  jest.clearAllMocks();
  supabase.from.mockReturnValue(supabase._chain);
});

// ── searchCustomers ──────────────────────────────────────────

describe('searchCustomers', () => {
  test('returns empty array for blank query', async () => {
    const { data, error } = await searchCustomers('');
    expect(data).toEqual([]);
    expect(error).toBeNull();
    expect(supabase.from).not.toHaveBeenCalled();
  });

  test('calls supabase.from("customers") for non-empty query', async () => {
    mockResolve([{ id: 1, customer_name: 'Rahul', mobile_number: '9876543210' }]);
    const { data } = await searchCustomers('Rahul');
    expect(supabase.from).toHaveBeenCalledWith('customers');
    expect(data).toHaveLength(1);
    expect(data[0].customer_name).toBe('Rahul');
  });

  test('loads customers without a filter for a whitespace query', async () => {
    mockResolve([{ id: 1, customer_name: 'Rahul', mobile_number: '9876543210' }]);
    const { data } = await searchCustomers(' ');

    expect(supabase.from).toHaveBeenCalledWith('customers');
    expect(supabase._mocks.mockOr).not.toHaveBeenCalled();
    expect(data).toHaveLength(1);
  });

  test('returns error on Supabase failure', async () => {
    mockResolve(null, new Error('Network error'));
    const { data, error } = await searchCustomers('test');
    expect(data).toEqual([]);
    expect(error).not.toBeNull();
  });
});

// ── createCustomer ───────────────────────────────────────────

describe('createCustomer', () => {
  test('inserts and returns new customer', async () => {
    const newCustomer = {
      id: 42,
      customer_name: 'Priya Verma',
      mobile_number: '9123456780',
    };
    mockResolve(newCustomer);

    const { data, error } = await createCustomer({
      customer_name: 'Priya Verma',
      mobile_number: '9123456780',
    });

    expect(supabase.from).toHaveBeenCalledWith('customers');
    expect(data.id).toBe(42);
    expect(error).toBeNull();
  });
});

// ── updateCustomer ───────────────────────────────────────────

describe('updateCustomer', () => {
  test('updates and returns patched customer', async () => {
    const updated = { id: 42, customer_name: 'Priya Singh', mobile_number: '9123456780' };
    mockResolve(updated);

    const { data } = await updateCustomer(42, { customer_name: 'Priya Singh' });
    expect(data.customer_name).toBe('Priya Singh');
  });
});

// ── deleteCustomer ───────────────────────────────────────────

describe('deleteCustomer', () => {
  test('deletes and returns no error', async () => {
    mockResolve(null, null);
    const { error } = await deleteCustomer(42);
    expect(error).toBeNull();
  });

  test('returns error when delete fails (orders exist)', async () => {
    mockResolve(null, new Error('foreign key constraint'));
    const { error } = await deleteCustomer(99);
    expect(error).not.toBeNull();
  });
});

// ── createOrderWithCustomer ──────────────────────────────────

describe('createOrderWithCustomer', () => {
  test('errors without existingCustomerId or customerPayload', async () => {
    const { error } = await createOrderWithCustomer({});
    expect(error).toBeDefined();
    expect(error.message).toContain('required');
  });

  test('calls supabase.rpc with existingCustomerId', async () => {
    supabase._mocks.mockRpc.mockResolvedValue({
      data: { customer_id: 5, order_id: 101 },
      error: null,
    });

    const { data } = await createOrderWithCustomer({
      existingCustomerId: 5,
      orderType: 'walk-in',
    });

    expect(supabase.rpc).toHaveBeenCalledWith(
      'create_order_with_customer',
      expect.objectContaining({ p_customer_id: 5, p_order_type: 'walk-in' })
    );
    expect(data.order_id).toBe(101);
  });

  test('calls supabase.rpc with customerPayload', async () => {
    supabase._mocks.mockRpc.mockResolvedValue({
      data: { customer_id: 99, order_id: 200 },
      error: null,
    });

    const { data } = await createOrderWithCustomer({
      customerPayload: {
        customer_name: 'Amit Patel',
        mobile_number: '8765432109',
      },
      orderType: 'on-call',
    });

    expect(supabase.rpc).toHaveBeenCalledWith(
      'create_order_with_customer',
      expect.objectContaining({
        p_customer_name:  'Amit Patel',
        p_mobile_number:  '8765432109',
        p_order_type:     'on-call',
      })
    );
    expect(data.order_id).toBe(200);
  });

  test('returns error when RPC fails', async () => {
    supabase._mocks.mockRpc.mockResolvedValue({
      data: null,
      error: new Error('customers_mobile_number_key'),
    });

    const { error } = await createOrderWithCustomer({
      customerPayload: { customer_name: 'X', mobile_number: '9999999999' },
    });

    expect(error).toBeDefined();
  });
});
