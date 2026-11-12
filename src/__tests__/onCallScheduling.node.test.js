// src/__tests__/onCallScheduling.node.test.js
// Focused automated tests for On-Call Pickup & Delivery Scheduling Integration.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const srcDir = path.resolve(__dirname, '..');
const supabaseDir = path.resolve(__dirname, '../../supabase');

test('onCallScheduling.js helper functions and validation rules', async () => {
  const mod = await import('../utils/onCallScheduling.js');
  const {
    isOnCallOrderType,
    splitIsoToLocalDateAndTime,
    combineLocalDateAndTimeToIso,
    formatScheduledDateTime,
    validateOnCallSchedule,
  } = mod;

  // 1. Order type detection
  assert.equal(isOnCallOrderType('on-call'), true);
  assert.equal(isOnCallOrderType('On-Call'), true);
  assert.equal(isOnCallOrderType('On-Call (Pickup)'), true);
  assert.equal(isOnCallOrderType('Walk-In'), false);
  assert.equal(isOnCallOrderType('walk-in'), false);
  assert.equal(isOnCallOrderType(''), false);

  // 2. Date/time combine and split round-trip
  const iso = combineLocalDateAndTimeToIso('2026-11-13', '10:30');
  assert.ok(iso && !Number.isNaN(new Date(iso).getTime()));
  const split = splitIsoToLocalDateAndTime(iso);
  assert.equal(split.date, '2026-11-13');
  assert.equal(split.time, '10:30');

  // 3. Read-only formatting & legacy null fallback
  assert.equal(formatScheduledDateTime(null), 'Not scheduled');
  assert.equal(formatScheduledDateTime(''), 'Not scheduled');
  const formatted = formatScheduledDateTime(iso);
  assert.match(formatted, /13 Nov 2026, 10:30 AM/);

  // 4. New On-Call order validation
  const nowMs = new Date('2026-11-12T10:00:00.000Z').getTime();

  // Missing both
  const missingRes = validateOnCallSchedule({
    pickupDate: '',
    pickupTime: '',
    deliveryDate: '',
    deliveryTime: '',
    isNewOrder: true,
    nowMs,
  });
  assert.equal(missingRes.isValid, false);
  assert.ok(missingRes.errors.scheduled_pickup_at);
  assert.ok(missingRes.errors.scheduled_delivery_at);

  // Past pickup
  const pastRes = validateOnCallSchedule({
    pickupDate: '2026-11-10',
    pickupTime: '09:00',
    deliveryDate: '2026-11-15',
    deliveryTime: '18:00',
    isNewOrder: true,
    nowMs,
  });
  assert.equal(pastRes.isValid, false);
  assert.match(pastRes.errors.scheduled_pickup_at, /future/i);

  // Delivery earlier than or equal to pickup
  const earlierDeliveryRes = validateOnCallSchedule({
    pickupDate: '2026-11-15',
    pickupTime: '14:00',
    deliveryDate: '2026-11-15',
    deliveryTime: '10:00',
    isNewOrder: true,
    nowMs,
  });
  assert.equal(earlierDeliveryRes.isValid, false);
  assert.match(earlierDeliveryRes.errors.scheduled_delivery_at, /later than scheduled pickup/i);

  // Valid new order
  const validNewRes = validateOnCallSchedule({
    pickupDate: '2026-11-13',
    pickupTime: '10:30',
    deliveryDate: '2026-11-15',
    deliveryTime: '18:00',
    isNewOrder: true,
    nowMs,
  });
  assert.equal(validNewRes.isValid, true);
  assert.ok(validNewRes.scheduled_pickup_at);
  assert.ok(validNewRes.scheduled_delivery_at);

  // 5. Existing On-Call order: legacy null allowed
  const legacyRes = validateOnCallSchedule({
    pickupDate: '',
    pickupTime: '',
    deliveryDate: '',
    deliveryTime: '',
    isNewOrder: false,
    nowMs,
  });
  assert.equal(legacyRes.isValid, true);

  // Existing On-Call order: unchanged historical past pickup allowed
  const historicalPickupIso = combineLocalDateAndTimeToIso('2026-11-01', '10:00');
  const historicalUnchangedRes = validateOnCallSchedule({
    pickupDate: '2026-11-01',
    pickupTime: '10:00',
    deliveryDate: '2026-11-15',
    deliveryTime: '18:00',
    isNewOrder: false,
    initialPickupIso: historicalPickupIso,
    nowMs,
  });
  assert.equal(historicalUnchangedRes.isValid, true);
});

test('On-Call scheduling is wired across Create, Edit, Side Edit, View, Service, CSS & SQL', () => {
  const customerForm = fs.readFileSync(path.join(srcDir, 'components/CustomerForm.jsx'), 'utf8');
  const createModal = fs.readFileSync(path.join(srcDir, 'components/CreateOrderModal.jsx'), 'utf8');
  const posModule = fs.readFileSync(path.join(srcDir, 'components/POSModule.jsx'), 'utf8');
  const sideEdit = fs.readFileSync(path.join(srcDir, 'components/SideEditPanel.jsx'), 'utf8');
  const viewModal = fs.readFileSync(path.join(srcDir, 'components/ViewOrderModal.jsx'), 'utf8');
  const customerSvc = fs.readFileSync(path.join(srcDir, 'services/customerService.js'), 'utf8');
  const posCss = fs.readFileSync(path.join(srcDir, 'styles/POSModule.css'), 'utf8');
  const migrationSql = fs.readFileSync(path.join(supabaseDir, 'on_call_scheduling_migration.sql'), 'utf8');

  assert.match(customerForm, /intakeMethod === 'on-call'/);
  assert.match(customerForm, /scheduledPickupDate/);
  assert.match(customerForm, /scheduledDeliveryDate/);
  assert.match(createModal, /scheduled_pickup_at/);
  assert.match(createModal, /scheduled_delivery_at/);

  assert.match(posModule, /isOnCallOrderType/);
  assert.match(posModule, /Scheduled Pickup/);
  assert.match(posModule, /Scheduled Delivery/);

  assert.match(sideEdit, /isOnCallOrderType\(orderType\)/);
  assert.match(sideEdit, /scheduled_pickup_at/);
  assert.match(sideEdit, /scheduled_delivery_at/);

  assert.match(viewModal, /isOnCallOrderType\(intakeMethod\)/);
  assert.match(viewModal, /formatScheduledDateTime/);

  assert.match(customerSvc, /scheduled_pickup_at/);
  assert.match(customerSvc, /scheduled_delivery_at/);

  assert.match(posCss, /\.oncall-schedule-grid/);
  assert.match(posCss, /\.oncall-datetime-pair/);

  assert.match(migrationSql, /ADD COLUMN IF NOT EXISTS scheduled_pickup_at TIMESTAMPTZ NULL/);
  assert.match(migrationSql, /ADD COLUMN IF NOT EXISTS scheduled_delivery_at TIMESTAMPTZ NULL/);
});
