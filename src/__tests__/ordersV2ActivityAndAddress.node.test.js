import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { stripAddressTag, sanitizeAddress, normalizeOrder } from '../utils/normalizeOrder.ts';
import { formatScheduledDateTime, resolveDisplayScheduledDelivery, resolveOptionalDelivery } from '../utils/onCallScheduling.js';

test('Address Sanitization: stripAddressTag removes repeated Home:/Office:/Other: prefixes cleanly', () => {
  assert.equal(stripAddressTag('Home: Home: Home: 166,Walajapet, Ranipet'), '166,Walajapet, Ranipet');
  assert.equal(stripAddressTag('Office: 45 Market St'), '45 Market St');
  assert.equal(stripAddressTag('Other: Home: Flat 201'), 'Flat 201');
  assert.equal(stripAddressTag('123 Simple Address'), '123 Simple Address');
  assert.equal(stripAddressTag(''), '');
  assert.equal(stripAddressTag(null), '');
});

test('Address Sanitization: sanitizeAddress collapses repeated tags to a single canonical tag', () => {
  assert.equal(sanitizeAddress('Home: Home: Home: 166,Walajapet, Ranipet'), 'Home: 166,Walajapet, Ranipet');
  assert.equal(sanitizeAddress('Office: Office: 45 Market St'), 'Office: 45 Market St');
  assert.equal(sanitizeAddress('Home: 166,Walajapet'), 'Home: 166,Walajapet');
  assert.equal(sanitizeAddress('Plain Address Without Tag'), 'Plain Address Without Tag');
  assert.equal(sanitizeAddress('Home: '), '');
});

test('normalizeOrder preserves activity_history, audit_logs, and payment_history', () => {
  const sampleOrder = {
    id: 101,
    order_number: 'ORD00101',
    address: 'Home: Home: 166,Walajapet',
    activity_history: [
      { id: 'act_1', type: 'status', title: 'Status Updated', detail: 'In Progress' },
      { id: 'act_2', type: 'received', title: 'Order Received', detail: 'New order placed' }
    ],
    payment_history: [
      { id: 'pay_1', amount: 150, status: 'Paid in Full' }
    ]
  };

  const normalized = normalizeOrder(sampleOrder);
  assert.equal(normalized.address, 'Home: 166,Walajapet');
  assert.equal(normalized.activity_history.length, 2);
  assert.equal(normalized.activity_history[0].title, 'Status Updated');
  assert.equal(normalized.payment_history.length, 1);
});

test('OrdersV2List and OrdersV2EditDrawer track activity history and sanitize address on save', () => {
  const listCode = fs.readFileSync('src/components/OrdersV2List.jsx', 'utf8');
  assert.match(listCode, /formatServiceBreakdown/);
  assert.match(listCode, /combinedHistory\s*=\s*\[\.\.\.addedEvents/);
  assert.match(listCode, /sanitizeAddress\(inlineDraft\.address\)/);
  assert.match(listCode, /activity_history:\s*combinedHistory/);

  const drawerCode = fs.readFileSync('src/components/OrdersV2EditDrawer.jsx', 'utf8');
  assert.match(drawerCode, /combinedHistory\s*=\s*\[\.\.\.addedEvents/);
  assert.match(drawerCode, /sanitizeAddress\(localDraft\.address\)/);
  assert.match(drawerCode, /activity_history:\s*combinedHistory/);

  const createCode = fs.readFileSync('src/components/OrdersV2CreateOrder.jsx', 'utf8');
  assert.match(createCode, /stripAddressTag/);
  assert.match(createCode, /Service Allocated/);
});

test('Create Order address rules depend on order type', () => {
  const createCode = fs.readFileSync('src/components/OrdersV2CreateOrder.jsx', 'utf8');
  assert.ok(!createCode.includes('Address is required for new customers.'));
  assert.ok(createCode.includes("nextErrors.address = 'Address is required for On-Call orders.';"));
  assert.ok(createCode.includes("Address {isOnCall ? '* required' : '(optional for Walk-In orders)'}"));
  assert.ok(createCode.includes("hasPatchKey('orderType')"));
});

test('CustomerForm clears stale address error when switching to Walk-In', () => {
  const formCode = fs.readFileSync('src/components/CustomerForm.jsx', 'utf8');
  assert.ok(formCode.includes('delete next.address;'));
  assert.ok(formCode.includes("if (intakeMethod === 'on-call' && (!address || !address.trim()))"));
});

test('Edit Order paths require address only for On-Call orders', () => {
  const drawerCode = fs.readFileSync('src/components/OrdersV2EditDrawer.jsx', 'utf8');
  assert.ok(drawerCode.includes('isOnCallOrderType(localDraft.order_type) && !sanitizeAddress(localDraft.address)'));
  assert.ok(drawerCode.includes("label={isOnCallOrderType(localDraft.order_type) ? 'Address *' : 'Address (optional)'}"));

  const listCode = fs.readFileSync('src/components/OrdersV2List.jsx', 'utf8');
  assert.ok(listCode.includes('isOnCallOrderType(inlineDraft.order_type) && !sanitizeAddress(inlineDraft.address)'));
  assert.ok(listCode.includes("Address {isOnCallOrderType(inlineDraft.order_type) ? '* required' : '(optional)'}"));
});

test('Supabase customer inserts save an empty address as NULL', () => {
  const serviceCode = fs.readFileSync('src/services/customerService.js', 'utf8');
  assert.ok(serviceCode.includes('address: cleanCust.address || null'));
  assert.ok(serviceCode.includes('address: clean.address || null'));
  assert.ok(serviceCode.includes("typeof cleaned[key] === 'string' && cleaned[key].trim() === ''"));
  assert.ok(serviceCode.includes("const addr = rawAddr === '' ? null : rawAddr;"));
  assert.ok(serviceCode.includes('address: updatePayload.address ?? updatePayload.delivery_address ?? o.address,'));
  assert.ok(serviceCode.includes("clean.pincode : ''}` : null)"));
  assert.ok(serviceCode.includes('delivery_address: cleanCust.address || cleanCust.street_area || null'));
  assert.ok(!serviceCode.includes("'Counter Walk-In'"));
  assert.ok(!serviceCode.includes("'Pending Address'"));

  const schema = fs.readFileSync('supabase/schema.sql', 'utf8');
  assert.match(schema, /address\s+TEXT,/);
  assert.doesNotMatch(schema, /address\s+TEXT\s+NOT NULL/i);
});

test('Walk-In delivery date and time are optional, paired, and must be in the future', () => {
  const nowMs = new Date('2026-11-20T10:00:00').getTime();

  const empty = resolveOptionalDelivery({ deliveryDate: '', deliveryTime: '', nowMs });
  assert.equal(empty.isValid, true);
  assert.equal(empty.scheduled_delivery_at, null);

  const partial = resolveOptionalDelivery({ deliveryDate: '2026-11-25', deliveryTime: '', nowMs });
  assert.equal(partial.isValid, false);
  assert.match(partial.errors.scheduled_delivery_at, /both delivery date and time/i);

  const past = resolveOptionalDelivery({ deliveryDate: '2026-11-19', deliveryTime: '14:30', nowMs });
  assert.equal(past.isValid, false);
  assert.match(past.errors.scheduled_delivery_at, /must be in the future/i);

  const complete = resolveOptionalDelivery({ deliveryDate: '2026-11-25', deliveryTime: '14:30', nowMs });
  assert.equal(complete.isValid, true);
  assert.equal(new Date(complete.scheduled_delivery_at).toISOString(), complete.scheduled_delivery_at);

  const resolverCode = fs.readFileSync('src/utils/onCallScheduling.js', 'utf8');
  assert.ok(resolverCode.includes('Delivery date and time must be in the future.'));
});

test('Walk-In delivery scheduling is wired across Create, Edit Drawer, Inline Edit and Side Edit', () => {
  const files = [
    'src/components/OrdersV2CreateOrder.jsx',
    'src/components/OrdersV2EditDrawer.jsx',
    'src/components/OrdersV2List.jsx',
    'src/components/SideEditPanel.jsx',
  ];
  files.forEach((file) => {
    const code = fs.readFileSync(file, 'utf8');
    assert.ok(code.includes('resolveOptionalDelivery'), `${file} must resolve optional delivery`);
    assert.ok(code.includes('scheduled_delivery_at'), `${file} must persist scheduled delivery`);
  });

  const serviceCode = fs.readFileSync('src/services/customerService.js', 'utf8');
  assert.ok(serviceCode.includes('const scheduledDeliveryAtIso = parseIsoOrNull(cleanCust.scheduled_delivery_at || cleanCust.scheduledDeliveryAt);'));
  const sideCode = fs.readFileSync('src/components/SideEditPanel.jsx', 'utf8');
  assert.ok(sideCode.includes('scheduled_delivery_at: updatedOrder.scheduled_delivery_at'));
});

test('Scheduled delivery display uses mapped data with legacy fallback and safe invalid handling', () => {
  const mapped = resolveDisplayScheduledDelivery({ scheduled_delivery_at: '2026-11-20T17:30:00' });
  assert.equal(formatScheduledDateTime(mapped, 'Not Scheduled'), '20 Nov 2026, 05:30 PM');

  const fallback = resolveDisplayScheduledDelivery({
    scheduled_delivery_at: 'invalid-date',
    scheduled_delivery_date: '2026-11-20',
    scheduled_delivery_time: '17:30',
  });
  assert.equal(formatScheduledDateTime(fallback, 'Not Scheduled'), '20 Nov 2026, 05:30 PM');

  assert.equal(resolveDisplayScheduledDelivery({ scheduled_delivery_at: 'invalid-date' }), null);
  assert.equal(resolveDisplayScheduledDelivery({}), null);
});

test('Order Details drawers show Scheduled Delivery for Walk-In without moving Scheduled Pickup', () => {
  const files = [
    'src/components/POSModule.jsx',
    'src/components/pos/OrderStatusDrawer.jsx',
  ];
  files.forEach((file) => {
    const code = fs.readFileSync(file, 'utf8');
    assert.ok(code.includes('resolveDisplayScheduledDelivery(order)'), `${file} must resolve delivery display value`);
    assert.ok(code.includes("'Not Scheduled'"), `${file} must use the Not Scheduled fallback`);
    assert.match(code, /!isOnCallOrder[\s\S]{0,500}?Scheduled Delivery/);
    assert.match(code, /isOnCallOrder[\s\S]{0,500}?Scheduled Pickup/);
  });
});
