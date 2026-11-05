// src/__tests__/i18n.node.test.js
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { translations, SUPPORTED_LANGUAGES } from '../i18n/translations.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test('1. translations.js defines all 9 supported languages with required keys', () => {
  const expectedCodes = ['en', 'ta', 'hi', 'te', 'kn', 'ml', 'ar', 'fr', 'es'];
  assert.equal(SUPPORTED_LANGUAGES.length, 9);
  for (const code of expectedCodes) {
    assert.ok(SUPPORTED_LANGUAGES.some((lang) => lang.code === code), `Missing language code: ${code}`);
    assert.ok(translations[code], `Missing translations dictionary for: ${code}`);
  }

  // Required navigation and module keys
  const requiredKeys = [
    'nav_dashboard',
    'nav_orders_pos',
    'nav_customers',
    'nav_reports',
    'nav_apps',
    'nav_account',
    'nav_audit_log',
    'store_name_full',
    'live_counter_active',
    'btn_sign_out',
    'welcome_washdoor',
    'btn_new_order',
    'kpi_today_revenue',
    'kpi_orders_today',
    'kpi_collected_today',
    'kpi_outstanding',
    'kpi_ready_pickup',
    'reports_center_title',
    'tab_available_reports',
    'tab_report_audit_trail',
    'audit_subtitle',
    'audit_realtime_active',
    'tab_business_profile',
    'tab_tax_currency',
    'tab_bank_payments',
  ];

  for (const code of expectedCodes) {
    const dict = translations[code];
    for (const key of requiredKeys) {
      assert.ok(dict[key], `Missing translation key "${key}" in language "${code}"`);
      assert.ok(typeof dict[key] === 'string' && dict[key].trim().length > 0, `Empty translation for "${key}" in "${code}"`);
    }
  }
});

test('2. App.jsx sidebar items and store card dynamically translate', () => {
  const appPath = path.resolve(__dirname, '../App.jsx');
  const content = fs.readFileSync(appPath, 'utf8');

  // Sidebar navigation labels use t(...)
  assert.match(content, /t\('nav_dashboard'/);
  assert.match(content, /t\('nav_orders_pos'/);
  assert.match(content, /t\('nav_customers'/);
  assert.match(content, /t\('nav_reports'/);
  assert.match(content, /t\('nav_apps'/);
  assert.match(content, /t\('nav_account'/);
  assert.match(content, /t\('nav_audit_log'/);

  // Store card & Sign out
  assert.match(content, /t\('store_name_full',\s*['"]Ranipet Store #1['"]\)/);
  assert.match(content, /t\('live_counter_active',\s*['"]Live Counter Active['"]\)/);
  assert.match(content, /t\('btn_sign_out',\s*['"]Sign Out['"]\)/);
});

test('3. Modules (Dashboard, Reports, Settings, AuditLog) integrate useLanguage and t()', () => {
  const dashPath = path.resolve(__dirname, '../components/DashboardModule.jsx');
  const dashContent = fs.readFileSync(dashPath, 'utf8');
  assert.match(dashContent, /useLanguage/);
  assert.match(dashContent, /t\('welcome_washdoor'/);
  assert.match(dashContent, /t\('kpi_today_revenue'/);

  const repPath = path.resolve(__dirname, '../components/ReportsModule.jsx');
  const repContent = fs.readFileSync(repPath, 'utf8');
  assert.match(repContent, /useLanguage/);
  assert.match(repContent, /t\('reports_center_title'/);
  assert.match(repContent, /t\('tab_available_reports'/);

  const setPath = path.resolve(__dirname, '../components/SettingsModule.jsx');
  const setContent = fs.readFileSync(setPath, 'utf8');
  assert.match(setContent, /useLanguage/);
  assert.match(setContent, /t\('tab_business_profile'/);

  const auditPath = path.resolve(__dirname, '../components/AuditLogModule.jsx');
  const auditContent = fs.readFileSync(auditPath, 'utf8');
  assert.match(auditContent, /useLanguage/);
  assert.match(auditContent, /t\('audit_subtitle'/);
});
