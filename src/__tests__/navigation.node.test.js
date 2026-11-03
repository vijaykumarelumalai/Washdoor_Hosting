// src/__tests__/navigation.node.test.js
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const appPath = path.resolve(__dirname, '../App.jsx');
const htmlPath = path.resolve(__dirname, '../../index.html');

test('App.jsx defines navigation items in proper PascalCase and required order', () => {
  const content = fs.readFileSync(appPath, 'utf8');

  // Verify NAV_ITEMS contains the PascalCase sequence matching mockup:
  // Dashboard, Orders, Customers, Reports, Apps, Account
  const expectedOrder = [
    'Dashboard',
    'Orders',
    'Customers',
    'Reports',
    'Apps',
    'Account'
  ];

  const regex = /label:\s*['"]([^'"]+)['"]/g;
  const labels = [];
  let match;
  while ((match = regex.exec(content)) !== null) {
    if (expectedOrder.map(s => s.toLowerCase()).includes(match[1].toLowerCase())) {
      labels.push(match[1]);
    }
  }

  assert.deepEqual(labels.slice(0, 6), expectedOrder);
});

test('App.jsx provides a Sign Out button and store card at the bottom of the navigation menu', () => {
  const content = fs.readFileSync(appPath, 'utf8');

  assert.match(content, /sidebar-signout-btn/);
  assert.match(content, /Sign Out/);
  assert.match(content, /sidebar-bottom/);
  assert.match(content, /sidebar-store-card/);
  assert.match(content, /Ranipet Store #1/);
  assert.match(content, /Live Counter Active/);
});

test('App.jsx renders the sidebar brand header with Washdoor', () => {
  const content = fs.readFileSync(appPath, 'utf8');

  assert.match(content, /sidebar-brand-header/);
  assert.match(content, /sidebar-brand-logo/);
  assert.match(content, /Washdoor/);
  assert.match(content, /Laundry &amp; Dry Clean POS/);
});

test('index.html includes favicon link icons', () => {
  const content = fs.readFileSync(htmlPath, 'utf8');

  assert.match(content, /rel="icon"/);
  assert.match(content, /href="\/favicon\.ico"/);
  assert.match(content, /href="\/favicon-32\.png"/);
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
});

test('App.jsx integrates and renders DashboardModule on dashboard tab', () => {
  const content = fs.readFileSync(appPath, 'utf8');

  assert.match(content, /import DashboardModule from '\.\/components\/DashboardModule'/);
  assert.match(content, /<DashboardModule/);
});

test('App.jsx provides a centralized search bar in topbar covering order ID, customer name and phone', () => {
  const content = fs.readFileSync(appPath, 'utf8');

  assert.match(content, /topbar-search-wrap/);
  assert.match(content, /topbar-search-input/);
  assert.match(content, /globalSearchQuery/);
  assert.match(content, /searchMatches/);
});

test('App.jsx auto-collapses navigation on module switch and auto-expands on hover overlap', () => {
  const content = fs.readFileSync(appPath, 'utf8');

  assert.match(content, /isNavHovered/);
  assert.match(content, /navigateToTab/);
  assert.match(content, /hover-expanded/);
  assert.match(content, /onMouseEnter/);
  assert.match(content, /onMouseLeave/);
});
