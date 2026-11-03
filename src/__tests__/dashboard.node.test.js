// src/__tests__/dashboard.node.test.js
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dashPath = path.resolve(__dirname, '../components/DashboardModule.jsx');

test('DashboardModule.jsx matches streamlined reference layout with exact 4 core sections', () => {
  const content = fs.readFileSync(dashPath, 'utf8');

  // 1. Welcome to Washdoor Header Banner with + New Order action
  assert.match(content, /Welcome to Washdoor/i);
  assert.match(content, /\+ New Order/i);
  assert.match(content, /Ranipet Store #1/i);
  assert.match(content, /Live Counter Active/i);

  // 2. Exact 5 Top KPI Cards
  assert.match(content, /Today's Revenue/i);
  assert.match(content, /Orders Today/i);
  assert.match(content, /Collected Today/i);
  assert.match(content, /Outstanding/i);
  assert.match(content, /Ready for Pickup/i);

  // 3. Order Pipeline with View Orders and 4 stages
  assert.match(content, /Order Pipeline/i);
  assert.match(content, /View Orders/i);
  assert.match(content, /Received/i);
  assert.match(content, /In Progress/i);
  assert.match(content, /Ready/i);
  assert.match(content, /Delivered/i);

  // 4. Revenue Trend (7 Days - Booked vs Collected)
  assert.match(content, /Revenue Trend/i);
  assert.match(content, /Last 7 Days/i);
  assert.match(content, /Booked Revenue/i);
  assert.match(content, /Collected Revenue/i);
  assert.match(content, /svg-bar booked/);
  assert.match(content, /svg-bar collected/);

  // 5. Payment Mix Donut Chart with breakdown
  assert.match(content, /Payment Mix/i);
  assert.match(content, /UPI \/ Net Banking/i);
  assert.match(content, /Cash/i);
  assert.match(content, /Card/i);
  assert.match(content, /Outstanding/i);
  assert.match(content, /strokeDasharray/);
});
