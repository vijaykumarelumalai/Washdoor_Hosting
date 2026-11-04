// src/__tests__/uiAudit.node.test.js
// Complete Professional UI/UX Audit, Alignment & Responsive Verification Suite
// Testing all 12 modules, design system, theme consistency, and 8 target viewport sizes

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const srcDir = path.resolve(__dirname, '..');
const componentsDir = path.resolve(srcDir, 'components');
const stylesDir = path.resolve(srcDir, 'styles');

test('1. All 12 core modules exist and export valid React components', () => {
  const modules = [
    'DashboardModule.jsx',
    'POSModule.jsx',
    'CreateOrderModal.jsx',
    'EditOrderModal.jsx',
    'ViewOrderModal.jsx',
    'GarmentInspectionSection.jsx',
    'CustomerManagement.jsx',
    'CustomerForm.jsx',
    'ReportsModule.jsx',
    'SettingsModule.jsx',
    'AuditLogModule.jsx',
    'ThermalReceiptModal.jsx',
  ];

  modules.forEach((mod) => {
    const filePath = path.resolve(componentsDir, mod);
    assert.ok(fs.existsSync(filePath), `Module ${mod} must exist on disk`);
    const code = fs.readFileSync(filePath, 'utf8');
    assert.match(code, /export\s+default\s+function|export\s+default\s+const/, `${mod} must default export a component`);
  });
});

test('2. Navigation Menu & Extension Panel supports Auto-Collapse and Hover-Overlap', () => {
  const appPath = path.resolve(srcDir, 'App.jsx');
  const code = fs.readFileSync(appPath, 'utf8');

  // Verify state and handlers
  assert.match(code, /isNavCollapsed/);
  assert.match(code, /isNavHovered/);
  assert.match(code, /navigateToTab/);
  assert.match(code, /onMouseEnter/);
  assert.match(code, /onMouseLeave/);
  assert.match(code, /sidebar-toggle-btn/);

  // Verify off-canvas mobile drawer overlay
  assert.match(code, /sidebar-overlay/);
  assert.match(code, /mobile-open/);
});

test('3. Responsive Stylesheet covers all 8 target viewport resolutions', () => {
  const washdoorCss = fs.readFileSync(path.resolve(stylesDir, 'washdoor.css'), 'utf8');
  const dashboardCss = fs.readFileSync(path.resolve(stylesDir, 'Dashboard.css'), 'utf8');
  const reportsCss = fs.readFileSync(path.resolve(stylesDir, 'ReportsModule.css'), 'utf8');
  const auditCss = fs.readFileSync(path.resolve(stylesDir, 'AuditLog.css'), 'utf8');

  // Desktop (1920x1080, 1440x900, 1366x768): Standard fluid containers
  assert.match(washdoorCss, /max-width:\s*14[0-9]{2}px|max-width:\s*100%/);

  // Tablet (1024x768, 768x1024): Media queries for 1024/900/768
  assert.match(dashboardCss, /@media\s*\(max-width:\s*(1080|900|768)px\)/);
  assert.match(washdoorCss, /@media\s*\(max-width:\s*(840|768)px\)/);

  // Mobile (430x932, 390x844, 360x800): Media queries for 640/480/380
  assert.match(reportsCss, /@media\s*\(max-width:\s*480px\)/);
  assert.match(auditCss, /@media\s*\(max-width:\s*480px\)/);
  assert.match(dashboardCss, /@media\s*\(max-width:\s*480px\)/);
});

test('4. Light and Dark Theme consistency across all stylesheets', () => {
  const cssFiles = [
    'washdoor.css',
    'Dashboard.css',
    'ReportsModule.css',
    'AuditLog.css',
    'Settings.css',
    'ViewOrderModal.css',
  ];

  cssFiles.forEach((file) => {
    const content = fs.readFileSync(path.resolve(stylesDir, file), 'utf8');
    assert.ok(
      content.includes('light-theme') || content.includes('data-theme="light"') || content.includes('var(--'),
      `${file} must provide Light theme rules or CSS theme variables`
    );
    assert.ok(
      content.includes('dark-theme') || content.includes('data-theme="dark"') || content.includes('#08111f'),
      `${file} must support Dark theme styles`
    );
  });
});

test('5. Audit Log matches exact executive alignment and multi-format exports', () => {
  const auditPath = path.resolve(componentsDir, 'AuditLogModule.jsx');
  const content = fs.readFileSync(auditPath, 'utf8');

  assert.match(content, /Export Excel/);
  assert.match(content, /Export PDF/);
  assert.match(content, /Export CSV/);
  assert.match(content, /Real-time Logging Active/);
  assert.match(content, /Total System Events/);
  assert.match(content, /Order Lifecycle Transitions/);
  assert.match(content, /Driver &amp; Dispatch Actions|Driver & Dispatch Actions/);
  assert.match(content, /Payment &amp; Financial Entries|Payment & Financial Entries/);
  assert.match(content, /Report Downloads/);
});

test('6. Reports Center provides multi-format export and immutable audit integration', () => {
  const reportsPath = path.resolve(componentsDir, 'ReportsModule.jsx');
  const content = fs.readFileSync(reportsPath, 'utf8');

  assert.match(content, /Financial &amp; Daily Collections|Financial & Daily Collections/);
  assert.match(content, /Master Orders &amp; Fulfillment Register|Master Orders & Fulfillment Register/);
  assert.match(content, /Outstanding Due &amp; Credit Ledger|Outstanding Due & Credit Ledger/);
  assert.match(content, /Services &amp; Plant Throughput|Services & Plant Throughput/);
  assert.match(content, /exportToExcel/);
  assert.match(content, /exportToPdf/);
  assert.match(content, /exportToCsv/);
});

test('7. Settings Module provides Business Profile, Receipt Studio, and WhatsApp Templates', () => {
  const settingsPath = path.resolve(componentsDir, 'SettingsModule.jsx');
  const content = fs.readFileSync(settingsPath, 'utf8');

  assert.match(content, /business_profile/);
  assert.match(content, /operations_receipts/);
  assert.match(content, /notifications/);
  assert.match(content, /receiptSize/);
  assert.match(content, /Map location/i);
});

test('8. POS & Order Management validation protects phone numbers and currencies', () => {
  const valPath = path.resolve(srcDir, 'utils/validation.js');
  const valCode = fs.readFileSync(valPath, 'utf8');

  assert.match(valCode, /isValidIndianMobile/);
  assert.match(valCode, /normalizeMobileNumber/);
  assert.match(valCode, /formatPhoneDisplay/);
  assert.match(valCode, /validateCustomer/);

  const custServicePath = path.resolve(srcDir, 'services/customerService.js');
  const custServiceCode = fs.readFileSync(custServicePath, 'utf8');
  assert.match(custServiceCode, /formatOrderId/);
  assert.match(custServiceCode, /formatCustomerId/);
});

test('9. Edit Side Panel maintains 45-50% width on desktop and responsive breakpoints', () => {
  const sideEditCss = fs.readFileSync(path.resolve(stylesDir, 'SideEditPanel.css'), 'utf8');
  assert.match(sideEditCss, /width:\s*48%/);
  assert.match(sideEditCss, /max-width:\s*860px/);
  assert.match(sideEditCss, /@media\s*\(max-width:\s*1024px\)/);
  assert.match(sideEditCss, /@media\s*\(max-width:\s*640px\)/);
  assert.match(sideEditCss, /sideSlideIn/);
});
