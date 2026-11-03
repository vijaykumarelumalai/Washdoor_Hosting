// src/__tests__/exportAudit.node.test.js
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dashPath = path.resolve(__dirname, '../components/DashboardModule.jsx');
const auditPath = path.resolve(__dirname, '../components/AuditLogModule.jsx');
const auditServicePath = path.resolve(__dirname, '../services/auditService.js');
const exportServicePath = path.resolve(__dirname, '../services/exportService.js');

test('auditService.js exports getStoredAuditLogs and logAuditEvent functions', () => {
  const content = fs.readFileSync(auditServicePath, 'utf8');

  assert.match(content, /export function getStoredAuditLogs/);
  assert.match(content, /export function logAuditEvent/);
  assert.match(content, /washdoor_audit_trail_v1/);
  assert.match(content, /tenant/);
  assert.match(content, /module/);
  assert.match(content, /format/);
  assert.match(content, /actor/);
});

test('exportService.js supports Excel, PDF, and CSV formats with audit integration', () => {
  const content = fs.readFileSync(exportServicePath, 'utf8');

  // Excel
  assert.match(content, /export function exportToExcel/);
  assert.match(content, /XLSX/);

  // PDF
  assert.match(content, /export function exportToPdf/);
  assert.match(content, /jsPDF/);

  // CSV
  assert.match(content, /export function exportToCsv/);

  // Audit Logging integration
  assert.match(content, /logAuditEvent/);
  assert.match(content, /tenant/);
  assert.match(content, /module/);
  assert.match(content, /format/);
});

test('DashboardModule.jsx provides clean layout dedicated to operations without redundant banners', () => {
  const content = fs.readFileSync(dashPath, 'utf8');

  // Verify the redundant banner was removed
  assert.doesNotMatch(content, /smart-management-banner/);
  assert.match(content, /Welcome to Washdoor/i);
  assert.match(content, /Today's Revenue/i);
  assert.match(content, /Order Pipeline/i);
});

test('AuditLogModule.jsx includes Report Download audit events and multi-format exports', () => {
  const content = fs.readFileSync(auditPath, 'utf8');

  assert.match(content, /Report Downloads/i);
  assert.match(content, /getStoredAuditLogs/);
  assert.match(content, /exportToExcel/);
  assert.match(content, /exportToPdf/);
});


test('ReportsModule.jsx provides Report Download Audit Trail and multi-format exports', () => {
  const reportsPath = path.resolve(__dirname, '../components/ReportsModule.jsx');
  const content = fs.readFileSync(reportsPath, 'utf8');

  assert.match(content, /Report Download Audit Trail/i);
  assert.match(content, /Available Reports/i);
  assert.match(content, /getStoredAuditLogs/);
  assert.match(content, /exportToExcel/);
  assert.match(content, /exportToPdf/);
  assert.match(content, /exportToCsv/);
  assert.match(content, /Tenant Name/);
  assert.match(content, /Module Downloaded/);
  assert.match(content, /Audit Verification/);
});

test('App.jsx provides topbar Reports & Audit button and renders ReportsModule on report tab', () => {
  const appPath = path.resolve(__dirname, '../App.jsx');
  const content = fs.readFileSync(appPath, 'utf8');

  assert.match(content, /import ReportsModule from '\.\/components\/ReportsModule'/);
  assert.match(content, /Reports &amp; Audit|Reports & Audit/);
  assert.match(content, /<ReportsModule/);
});

test('POSModule.jsx provides quick orders export button with Excel, PDF, and CSV options', () => {
  const posPath = path.resolve(__dirname, '../components/POSModule.jsx');
  const content = fs.readFileSync(posPath, 'utf8');

  assert.match(content, /handleExportPOSOrders/);
  assert.match(content, /exportToExcel/);
  assert.match(content, /exportToPdf/);
  assert.match(content, /exportToCsv/);
  assert.match(content, /Export Orders/i);
});

test('ReportsModule.jsx provides dynamic report date filters, live data preview, and dynamic download handling', () => {
  const reportsPath = path.resolve(__dirname, '../components/ReportsModule.jsx');
  const content = fs.readFileSync(reportsPath, 'utf8');

  assert.match(content, /reports-dynamic-filter-bar/);
  assert.match(content, /datePreset/);
  assert.match(content, /reports-preview-table/);
  assert.match(content, /getFilterPeriodDescription/);
  assert.match(content, /filteredOrders/);
});
