// src/__tests__/navigation.node.test.js
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const appPath = path.resolve(__dirname, '../App.jsx');

test('App.jsx defines navigation items in the exact required order', () => {
  const content = fs.readFileSync(appPath, 'utf8');

  // Verify NAV_ITEMS contains the exact order requested by user:
  // dashboard, Order, Customer, Report, Apps, Help, Account
  const expectedOrder = [
    'dashboard',
    'Order',
    'Customer',
    'Report',
    'Apps',
    'Help',
    'Account'
  ];

  const regex = /label:\s*['"]([^'"]+)['"]/g;
  const labels = [];
  let match;
  while ((match = regex.exec(content)) !== null) {
    if (expectedOrder.includes(match[1])) {
      labels.push(match[1]);
    }
  }

  assert.deepEqual(labels.slice(0, 7), expectedOrder);
});

test('App.jsx contains the welcome message for washdoor', () => {
  const content = fs.readFileSync(appPath, 'utf8');

  assert.match(content, /Welcom to washdoor/i);
  assert.match(content, /Welcome to washdoor/i);
});

test('App.jsx provides an extension panel toggle button for collapsing/expanding the navigation menu', () => {
  const content = fs.readFileSync(appPath, 'utf8');

  assert.match(content, /sidebar-toggle-btn/);
  assert.match(content, /isNavCollapsed/);
  assert.match(content, /toggleNavCollapse/);
  assert.match(content, /brand-container/);
});

test('App.jsx integrates and renders DashboardModule on dashboard tab', () => {
  const content = fs.readFileSync(appPath, 'utf8');

  assert.match(content, /import DashboardModule from '\.\/components\/DashboardModule'/);
  assert.match(content, /<DashboardModule/);
});
