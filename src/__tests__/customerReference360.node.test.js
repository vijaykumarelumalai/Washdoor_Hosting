// src/__tests__/customerReference360.node.test.js
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const panelPath = path.resolve(__dirname, '../components/Customer360Panel.jsx');
const muiPath = path.resolve(__dirname, '../components/CustomerMUI.jsx');
const drawerPath = path.resolve(__dirname, '../components/CustomerDetailDrawer.jsx');

test('Step 1: Customer360Panel includes shared helpers, optional onViewFullProfile, and all 5 completed tabs', () => {
  const panel = fs.readFileSync(panelPath, 'utf8');

  assert.match(panel, /export function getPastelAvatarColors/);
  assert.match(panel, /function getOrderPiecesCount/);
  assert.match(panel, /function getOrderPaymentBreakdown/);
  assert.match(panel, /function getOrderItemsPreview/);
  assert.match(panel, /onViewFullProfile/);
  assert.match(panel, /Full Profile Details/);
  assert.match(panel, /activeTab === 'overview'/);
  assert.match(panel, /activeTab === 'orders'/);
  assert.match(panel, /activeTab === 'payments'/);
  assert.match(panel, /activeTab === 'complaints'/);
  assert.match(panel, /activeTab === 'membership'/);
  assert.match(panel, /Edit Notes &amp; Preferences/);
  assert.match(panel, /Anniversary \/ Special Occasion/);
});

test('Step 2: CustomerMUI unifies View, Edit, WhatsApp, Copy, Delete, and More actions across Grid, Cards, and 360 Drawer', () => {
  const mui = fs.readFileSync(muiPath, 'utf8');

  assert.match(mui, /field: 'actions'[\s\S]*?width: 164/);
  assert.match(mui, /No valid mobile number for WhatsApp/);
  assert.match(mui, /const paginatedCards = gridRows\.slice/);
  assert.match(mui, /aria-label="Customer card actions"/);
  assert.match(mui, /WhatsApp Chat/);
  assert.match(mui, /onViewFullProfile=\{\(c\) => \{/);
  assert.match(mui, /document\.execCommand\('copy'\)/);
  assert.match(mui, /Unable to copy customer details to clipboard/);
  assert.match(mui, /const \[isSaving, setIsSaving\] = useState\(false\)/);
  assert.match(mui, /isSubmitting=\{isSaving\}/);
  assert.match(mui, /targetObj\.customer_id \|\| targetObj\.customerId \|\| targetObj\.customer_code \|\| targetObj\.id/);
});

test('Step 2: CustomerDetailDrawer resets sectionTab to all when customer changes', () => {
  const drawer = fs.readFileSync(drawerPath, 'utf8');

  assert.match(drawer, /useEffect\(\(\) => \{\s*setSectionTab\('all'\);\s*\}, \[customer\?\.id, customer\?\.customer_id, customer\?\.customerId, open\]\)/);
});

test('Part 2 Steps 1-2: CustomerMUI and customerService support status filter, clamped pagination, and full profile field round-trip', () => {
  const mui = fs.readFileSync(muiPath, 'utf8');
  const servicePath = path.resolve(__dirname, '../services/customerService.js');
  const service = fs.readFileSync(servicePath, 'utf8');

  assert.match(mui, /aria-label="Filter by customer status"/);
  assert.match(mui, /Inactive Only/);
  assert.match(mui, /formatCleanStaffNotes\(c\.internal_comments\)/);
  assert.match(mui, /if \(paginationModel\.page > maxGridPage\)/);
  assert.match(mui, /editingCustomer\?\.customerId \|\|\s*editingCustomer\?\.customer_id \|\|\s*editingCustomer\?\.customer_code/);

  assert.match(service, /special_occasion:\s*profileItem\.special_occasion \|\| null/);
  assert.match(service, /preference_notes:\s*profileItem\.preference_notes \|\| null/);
  assert.match(service, /special_occasion:\s*clean\.special_occasion \|\| null/);
  assert.match(service, /const workCustId = clean\.customer_id \|\| clean\.customer_code/);
});
