// src/__tests__/settings.node.test.js
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const settingsModulePath = path.resolve(__dirname, '../components/SettingsModule.jsx');
const businessRulesPath = path.resolve(__dirname, '../config/businessRules.js');
const appPath = path.resolve(__dirname, '../App.jsx');

test('SettingsModule.jsx exists and defines all 10 required settings and account sections', () => {
  assert.ok(fs.existsSync(settingsModulePath), 'SettingsModule.jsx must exist');
  const content = fs.readFileSync(settingsModulePath, 'utf8');

  // Verify all 10 sections from user request:
  // business profile, help and support, app, currency + tax, payment category & bank details,
  // operations & receipts (barcode, receipt customize), notification, language, account details, signout
  assert.match(content, /business_profile/i);
  assert.match(content, /tax_currency/i);
  assert.match(content, /bank_payments/i);
  assert.match(content, /operations_receipts/i);
  assert.match(content, /notifications/i);
  assert.match(content, /language/i);
  assert.match(content, /apps/i);
  assert.match(content, /help_support/i);
  assert.match(content, /account_details/i);
  assert.match(content, /signout/i);
});

test('SettingsModule.jsx contains Business Profile fields and Map location matching reference UI', () => {
  const content = fs.readFileSync(settingsModulePath, 'utf8');

  // Verify fields from reference screenshot:
  assert.match(content, /Shop logo/i);
  assert.match(content, /Upload logo/i);
  assert.match(content, /Shop name/i);
  assert.match(content, /Phone/i);
  assert.match(content, /Email/i);
  assert.match(content, /WhatsApp number/i);
  assert.match(content, /Address/i);
  assert.match(content, /City/i);
  assert.match(content, /State/i);
  assert.match(content, /PIN Code/i);
  assert.match(content, /GST number/i);
  assert.match(content, /Map location/i);
  assert.match(content, /All changes saved/i);
  assert.match(content, /Save changes/i);
});

test('SettingsModule.jsx includes receipt customization with barcode and thermal paper sizing', () => {
  const content = fs.readFileSync(settingsModulePath, 'utf8');

  assert.match(content, /80mm/);
  assert.match(content, /58mm/);
  assert.match(content, /printBarcode/);
  assert.match(content, /printQrCode/);
  assert.match(content, /LIVE RECEIPT PREVIEW/i);
});

test('businessRules.js exports getStoredSettings and saveStoredSettings', () => {
  const content = fs.readFileSync(businessRulesPath, 'utf8');

  assert.match(content, /export function getStoredSettings/);
  assert.match(content, /export function saveStoredSettings/);
  assert.match(content, /export const DEFAULT_SETTINGS/);
  assert.match(content, /export const BUSINESS_CONFIG/);
});

test('App.jsx renders SettingsModule on account / settings tab', () => {
  const content = fs.readFileSync(appPath, 'utf8');

  assert.match(content, /import SettingsModule from '\.\/components\/SettingsModule'/);
  assert.match(content, /<SettingsModule/);
});

test('SettingsModule.jsx includes WhatsApp & SMS message templates studio with phone preview', () => {
  const content = fs.readFileSync(settingsModulePath, 'utf8');

  assert.match(content, /templateChannel/);
  assert.match(content, /WhatsApp Templates/i);
  assert.match(content, /SMS Templates/i);
  assert.match(content, /phone-mockup-wrapper/);
  assert.match(content, /customer_name/);
  assert.match(content, /order_id/);
});

test('SettingsModule.jsx supports interactive App Configuration modal', () => {
  const content = fs.readFileSync(settingsModulePath, 'utf8');

  assert.match(content, /configuringApp/);
  assert.match(content, /settings-app-config-dialog/);
  assert.match(content, /Test Connection/i);
});
