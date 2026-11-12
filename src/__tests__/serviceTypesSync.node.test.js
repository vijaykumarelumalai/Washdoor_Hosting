// src/__tests__/serviceTypesSync.node.test.js
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const srcDir = path.resolve(__dirname, '..');

test('DEFAULT_SERVICE_TYPES matches the exact unified 6 options in order', async () => {
  const {
    DEFAULT_SERVICE_TYPES,
    SERVICE_CATEGORIES,
    getServiceTypes,
    addCustomServiceType,
    CUSTOM_SERVICE_TYPES_STORAGE_KEY,
  } = await import('../config/businessRules.js');

  assert.deepEqual(DEFAULT_SERVICE_TYPES, [
    'Laundry',
    'Dry Cleaning',
    'Washing',
    'Shoe Cleaning',
    'Ironing Only',
    'Custom Category',
  ]);
  assert.deepEqual(SERVICE_CATEGORIES, DEFAULT_SERVICE_TYPES);

  // Mock localStorage & window for custom service type persistence
  const store = new Map();
  const mockLocalStorage = {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
  };
  Object.defineProperty(globalThis, 'localStorage', {
    value: mockLocalStorage,
    configurable: true,
    writable: true,
  });
  const dispatched = [];
  Object.defineProperty(globalThis, 'window', {
    value: {
      dispatchEvent: (ev) => dispatched.push(ev),
    },
    configurable: true,
    writable: true,
  });
  if (typeof globalThis.CustomEvent === 'undefined') {
    globalThis.CustomEvent = class CustomEvent {
      constructor(type, init = {}) {
        this.type = type;
        this.detail = init.detail;
      }
    };
  }

  assert.deepEqual(getServiceTypes(), DEFAULT_SERVICE_TYPES);

  const res1 = addCustomServiceType('Carpet Cleaning');
  assert.equal(res1.isNew, true);
  assert.equal(res1.added, 'Carpet Cleaning');
  assert.ok(getServiceTypes().includes('Carpet Cleaning'));
  assert.ok(store.get(CUSTOM_SERVICE_TYPES_STORAGE_KEY).includes('Carpet Cleaning'));
  assert.ok(dispatched.some((e) => e.type === 'washdoor_service_types_updated'));

  // Case-insensitive duplicate prevention
  const res2 = addCustomServiceType('carpet cleaning');
  assert.equal(res2.isNew, false);
  assert.equal(res2.added, 'Carpet Cleaning');
  assert.equal(
    getServiceTypes().filter((s) => s.toLowerCase() === 'carpet cleaning').length,
    1
  );
});

test('Create, Edit, and SideEditPanel all use shared ServiceTypeSelect / useServiceTypes', () => {
  const clothCart = fs.readFileSync(path.join(srcDir, 'components/ClothSelectionCart.jsx'), 'utf8');
  const posModule = fs.readFileSync(path.join(srcDir, 'components/POSModule.jsx'), 'utf8');
  const sideEdit = fs.readFileSync(path.join(srcDir, 'components/SideEditPanel.jsx'), 'utf8');
  const editModal = fs.readFileSync(path.join(srcDir, 'components/EditOrderModal.jsx'), 'utf8');
  const custForm = fs.readFileSync(path.join(srcDir, 'components/CustomerForm.jsx'), 'utf8');
  const svcSelect = fs.readFileSync(path.join(srcDir, 'components/ServiceTypeSelect.jsx'), 'utf8');

  assert.match(clothCart, /<ServiceTypeSelect/);
  assert.match(posModule, /<ServiceTypeSelect/);
  assert.match(sideEdit, /<ServiceTypeSelect/);
  assert.match(editModal, /<ServiceTypeSelect/);
  assert.match(custForm, /useServiceTypes/);
  assert.match(svcSelect, /addCustomServiceType/);
  assert.match(svcSelect, /\+ Add New Service Type/);
});

test('formatServiceBreakdown formats per-service piece counts and total pieces accurately', async () => {
  const { formatServiceBreakdown, getServiceBreakdownList } = await import('../config/businessRules.js');

  const items = [
    { name: 'T-Shirt', qty: 1, serviceType: 'Laundry' },
    { name: 'Formal Pant', qty: 1, serviceType: 'Laundry' },
    { name: 'Jeans', qty: 1, serviceType: 'Ironing Only' },
  ];

  assert.deepEqual(getServiceBreakdownList(items), [
    { service: 'Laundry', qty: 2 },
    { service: 'Ironing Only', qty: 1 },
  ]);
  assert.equal(
    formatServiceBreakdown(items),
    'Laundry (2 pcs), Ironing Only (1 pcs) total = 3 pcs'
  );
  assert.equal(
    formatServiceBreakdown(items, 'Laundry', false),
    'Laundry (2 pcs), Ironing Only (1 pcs)'
  );
});

test('POSModule and SideEditPanel preserve serviceType on services_allocated and use formatServiceBreakdown', () => {
  const posModule = fs.readFileSync(path.join(srcDir, 'components/POSModule.jsx'), 'utf8');
  const sideEdit = fs.readFileSync(path.join(srcDir, 'components/SideEditPanel.jsx'), 'utf8');

  assert.match(posModule, /formatServiceBreakdown/);
  assert.match(sideEdit, /formatServiceBreakdown/);
  assert.match(posModule, /handleAddEditItemToCart\(item, item\.price\)/);
  assert.match(posModule, /services_allocated:\s*editCart\.map\(\(it\)\s*=>\s*\(\{[\s\S]*?serviceType:/);
  assert.match(sideEdit, /services_allocated:\s*cartItems\.map\(\(c\)\s*=>\s*\(\{[\s\S]*?serviceType:/);
});

test('ClothSelectionCart uses catalog item price/base_price and spacious inline service input CSS', () => {
  const clothCart = fs.readFileSync(path.join(srcDir, 'components/ClothSelectionCart.jsx'), 'utf8');
  const clothCss = fs.readFileSync(path.join(srcDir, 'styles/ClothSelectionCart.css'), 'utf8');

  assert.doesNotMatch(clothCart, /resolveServicePrice/);
  assert.match(clothCart, /selectedProduct\.price \?\? selectedProduct\.base_price/);
  assert.match(clothCss, /\.cloth-service-group:has\(\.wd-add-service-inline\)/);
});
