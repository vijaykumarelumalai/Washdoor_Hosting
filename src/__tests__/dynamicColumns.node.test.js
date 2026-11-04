// washdoor/src/__tests__/dynamicColumns.node.test.js
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  ORDER_COLUMNS,
  DEFAULT_COLUMN_IDS,
  ALL_COLUMN_IDS,
  REQUIRED_COLUMN_IDS,
  FIXED_COLUMN_IDS,
  COLUMN_STORAGE_KEY,
  sanitizeAndOrderColumns,
  enforceRequiredColumns,
} from '../config/orderColumnsConfig.js';
import {
  loadColumnPreferences,
  saveColumnPreferences,
} from '../services/columnPreferenceService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('Washdoor Dynamic Column Management System', () => {
  test('1. Specification: defines exactly 17 total columns', () => {
    assert.equal(ORDER_COLUMNS.length, 17);
    assert.equal(ALL_COLUMN_IDS.length, 17);
  });

  test('2. 9 Default Columns: defined in exact sequence 1–9', () => {
    const expectedDefaults = [
      'order_id',
      'customer',
      'address',
      'services',
      'status',
      'payment',
      'order_details',
      'pickup_delivery',
      'actions',
    ];
    assert.deepEqual(DEFAULT_COLUMN_IDS, expectedDefaults);
    expectedDefaults.forEach((id, index) => {
      assert.equal(ORDER_COLUMNS[index].id, id);
      assert.equal(ORDER_COLUMNS[index].default, true);
    });
  });

  test('3. 8 Additional Columns: defined in exact sequence 10–17', () => {
    const expectedAdditional = [
      'driver',
      'comments',
      'pincode',
      'email',
      'business_name',
      'communication_pref',
      'dob',
      'tax_exemption',
    ];
    expectedAdditional.forEach((id, index) => {
      const col = ORDER_COLUMNS[9 + index];
      assert.equal(col.id, id);
      assert.equal(col.default, false);
    });
  });

  test('4. sanitizeAndOrderColumns: enforces 1–17 sequence regardless of input order', () => {
    const mixedInput = ['tax_exemption', 'services', 'order_id', 'actions', 'email'];
    const ordered = sanitizeAndOrderColumns(mixedInput);
    assert.deepEqual(ordered, ['order_id', 'services', 'actions', 'email', 'tax_exemption']);
  });

  test('5. sanitizeAndOrderColumns: filters unknown column IDs', () => {
    const dirtyInput = ['order_id', 'non_existent_col', 'customer', 'random_id'];
    const cleaned = sanitizeAndOrderColumns(dirtyInput);
    assert.deepEqual(cleaned, ['order_id', 'customer']);
  });

  test('6. sanitizeAndOrderColumns: falls back to defaults for empty or invalid input', () => {
    assert.deepEqual(sanitizeAndOrderColumns([]), DEFAULT_COLUMN_IDS);
    assert.deepEqual(sanitizeAndOrderColumns(null), DEFAULT_COLUMN_IDS);
    assert.deepEqual(sanitizeAndOrderColumns('invalid'), DEFAULT_COLUMN_IDS);
  });

  test('7. Preference Service: saves and loads preferences via localStorage/memory', async () => {
    const mockStorage = {};
    global.window = {
      localStorage: {
        getItem: (k) => mockStorage[k] || null,
        setItem: (k, v) => { mockStorage[k] = String(v); },
        removeItem: (k) => { delete mockStorage[k]; },
      },
    };

    const customCols = ['order_id', 'customer', 'driver', 'comments'];
    saveColumnPreferences(customCols);

    const loaded = await loadColumnPreferences();
    assert.deepEqual(loaded, ['order_id', 'customer', 'driver', 'comments']);
  });

  test('8. POSModule.jsx: contains Column Category toolbar dropdown and WhatsApp button', () => {
    const posPath = path.resolve(__dirname, '../components/POSModule.jsx');
    const content = fs.readFileSync(posPath, 'utf8');

    // Column Category dropdown
    assert.ok(content.includes('pos-column-dropdown-container'), 'Contains pos-column-dropdown-container');
    assert.ok(content.includes('pos-column-popover-menu'), 'Contains pos-column-popover-menu');
    assert.ok(content.includes('pos-column-select-all-btn'), 'Contains Select All/Clear button');
    assert.ok(content.includes('Reset'), 'Contains Reset button');
    assert.ok(content.includes('Apply Columns'), 'Contains Apply Columns button');

    // WhatsApp action button
    assert.ok(content.includes('btn-whatsapp'), 'Contains btn-whatsapp action button');
    assert.ok(content.includes('handleOpenWhatsApp'), 'Contains handleOpenWhatsApp handler');
    assert.ok(content.includes('wa.me/91'), 'Contains WhatsApp wa.me link generation');

    // Accordion row colSpan dynamic
    assert.ok(content.includes('colSpan={selectedColumns.length}'), 'Inline edit colSpan is dynamic based on selectedColumns');

    // Dynamic export: EXPORT_COL_MAP driven by selectedColumns
    assert.ok(content.includes('EXPORT_COL_MAP'), 'Contains EXPORT_COL_MAP for dynamic export');
    assert.ok(content.includes('selectedColumns.map((id) => EXPORT_COL_MAP[id]).filter(Boolean)'), 'Export cols built from selectedColumns');
  });

  test('9. POSModule.css: contains styles for Column Category popover and all 17 columns', () => {
    const cssPath = path.resolve(__dirname, '../styles/POSModule.css');
    const content = fs.readFileSync(cssPath, 'utf8');

    assert.ok(content.includes('.pos-column-popover-menu'));
    assert.ok(content.includes('.pos-column-popover-header'));
    assert.ok(content.includes('.pos-column-list-scroll'));
    assert.ok(content.includes('.pos-column-checkbox-item'));
    assert.ok(content.includes('.pos-column-default-badge'));
    assert.ok(content.includes('.pos-column-required-badge'), 'Contains pos-column-required-badge');
    assert.ok(content.includes('.is-fixed'), 'Contains is-fixed for required checkboxes');

    // Check all 17 column classes exist
    ALL_COLUMN_IDS.forEach((id) => {
      assert.ok(content.includes(`.col-${id}`), `Missing CSS class for .col-${id}`);
    });
  });

  test('10. Fixed Required Columns: Order ID, Customer, and Actions are permanent', () => {
    assert.deepEqual(REQUIRED_COLUMN_IDS, ['order_id', 'customer', 'actions']);
    assert.deepEqual(FIXED_COLUMN_IDS, ['order_id', 'customer', 'actions']);

    const orderIdCol = ORDER_COLUMNS.find((c) => c.id === 'order_id');
    const customerCol = ORDER_COLUMNS.find((c) => c.id === 'customer');
    const actionsCol = ORDER_COLUMNS.find((c) => c.id === 'actions');

    assert.equal(orderIdCol.required, true);
    assert.equal(customerCol.required, true);
    assert.equal(actionsCol.required, true);
  });

  test('11. enforceRequiredColumns: guarantees Order ID, Customer, and Actions are always present', () => {
    // Empty list
    const fromEmpty = enforceRequiredColumns([]);
    assert.ok(fromEmpty.includes('order_id'));
    assert.ok(fromEmpty.includes('customer'));
    assert.ok(fromEmpty.includes('actions'));

    // Partial list without required columns
    const fromOther = enforceRequiredColumns(['status', 'driver']);
    assert.deepEqual(fromOther, ['order_id', 'customer', 'status', 'actions', 'driver']);
  });
});
