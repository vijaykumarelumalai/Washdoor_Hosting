// src/__tests__/orderStatusPanelAndStaff.node.test.js
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const posPath = path.resolve(__dirname, '../components/POSModule.jsx');
const posCssPath = path.resolve(__dirname, '../styles/POSModule.css');
const customerFormPath = path.resolve(__dirname, '../components/CustomerForm.jsx');
const sideEditPath = path.resolve(__dirname, '../components/SideEditPanel.jsx');
const servicePath = path.resolve(__dirname, '../services/customerService.js');

test('Step 1: POSModule Status column displays status, date/time, staff name and opens side panel', () => {
  const content = fs.readFileSync(posPath, 'utf8');
  const css = fs.readFileSync(posCssPath, 'utf8');

  assert.match(content, /pos-status-cell-btn/);
  assert.match(content, /pos-status-cell-time/);
  assert.match(content, /pos-status-cell-staff/);
  assert.match(content, /setStatusPanelOrder\(ord\)/);
  assert.match(css, /\.pos-status-cell-btn/);
  assert.match(css, /\.pos-status-drawer-panel/);
  assert.match(css, /\.pos-status-drawer-body::-webkit-scrollbar/);
});

test('Steps 2-5: OrderStatusSidePanel includes Order Details, Activity History, Payment Info, Collection Info tabs', () => {
  const content = fs.readFileSync(posPath, 'utf8');

  assert.match(content, /Order Details/);
  assert.match(content, /Order Type/);
  assert.match(content, /Walk-In \(Store Drop\)/);
  assert.match(content, /On-Call \(Pickup\)/);
  assert.match(content, /Activity History/);
  assert.match(content, /Payment Info/);
  assert.match(content, /Collection Info/);
  assert.match(content, /Services &amp; Garment Details/);
  assert.match(content, /Payment Amount Received/);
  assert.match(content, /Garment Collection Date/);
  assert.match(content, /Attend Staff \/ Collected-By Person/);
});

test('Create, Edit and Update sections include Attend Staff Name and Assigned Pickup & Delivery Person', () => {
  const customerForm = fs.readFileSync(customerFormPath, 'utf8');
  const sideEdit = fs.readFileSync(sideEditPath, 'utf8');
  const pos = fs.readFileSync(posPath, 'utf8');
  const service = fs.readFileSync(servicePath, 'utf8');

  assert.match(customerForm, /Attend Staff Name/);
  assert.match(customerForm, /Assigned Pickup &amp; Delivery Person/);
  assert.match(sideEdit, /Attend Staff Name/);
  assert.match(sideEdit, /Assigned Pickup &amp; Delivery Person/);
  assert.match(pos, /Attend Staff Name/);
  assert.match(pos, /Assigned Pickup &amp; Delivery Person/);
  assert.match(pos, /UPI Instant Pay/);
  assert.match(pos, /SHOW QR/);
  assert.match(service, /attend_staff_name/);
  assert.match(service, /assigned_pickup_delivery_person/);
});
