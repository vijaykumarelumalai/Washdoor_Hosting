// src/__tests__/storeBranding.node.test.js
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const sqlPath = path.resolve(__dirname, '../../supabase/store_settings.sql');
const servicePath = path.resolve(__dirname, '../services/storeSettingsService.js');
const settingsModulePath = path.resolve(__dirname, '../components/SettingsModule.jsx');
const appPath = path.resolve(__dirname, '../App.jsx');
const businessRulesPath = path.resolve(__dirname, '../config/businessRules.js');

test('store_settings.sql defines washdoor_store_settings, washdoor_brand_history, and triggers', () => {
  assert.ok(fs.existsSync(sqlPath), 'store_settings.sql must exist');
  const sql = fs.readFileSync(sqlPath, 'utf8');

  assert.match(sql, /CREATE TABLE IF NOT EXISTS public\.washdoor_store_settings/i);
  assert.match(sql, /CREATE TABLE IF NOT EXISTS public\.washdoor_brand_history/i);
  assert.match(sql, /previous_shop_name/);
  assert.match(sql, /previous_shop_logo/);
  assert.match(sql, /shop_name_updated_at/);
  assert.match(sql, /logo_updated_at/);
  assert.match(sql, /fn_prepare_store_settings_brand_tracking/);
  assert.match(sql, /fn_log_store_brand_history/);
});

test('storeSettingsService.js exports DB fetch, save, and history functions', () => {
  assert.ok(fs.existsSync(servicePath), 'storeSettingsService.js must exist');
  const content = fs.readFileSync(servicePath, 'utf8');

  assert.match(content, /export async function fetchStoreSettingsFromDB/);
  assert.match(content, /export async function fetchBrandHistoryFromDB/);
  assert.match(content, /export async function saveStoreSettingsToDB/);
  assert.match(content, /washdoor_store_settings/);
  assert.match(content, /washdoor_brand_history/);
});

test('App.jsx dynamically renders storeBrand shopName and shopLogo and listens to updates', () => {
  const content = fs.readFileSync(appPath, 'utf8');

  assert.match(content, /washdoor_settings_updated/);
  assert.match(content, /fetchStoreSettingsFromDB/);
  assert.match(content, /storeBrand\.shopLogo/);
  assert.match(content, /storeBrand\.shopName/);
});

test('SettingsModule.jsx saves to DB and displays Shop Name & Logo History', () => {
  const content = fs.readFileSync(settingsModulePath, 'utf8');

  assert.match(content, /saveStoreSettingsToDB/);
  assert.match(content, /fetchBrandHistoryFromDB/);
  assert.match(content, /Shop Name &amp; Logo History/);
  assert.match(content, /previousShopName/);
  assert.match(content, /previousShopLogo/);
});

test('businessRules.js tracks SHOP_LOGO and dispatches washdoor_settings_updated', () => {
  const content = fs.readFileSync(businessRulesPath, 'utf8');

  assert.match(content, /SHOP_LOGO/);
  assert.match(content, /washdoor_settings_updated/);
});
