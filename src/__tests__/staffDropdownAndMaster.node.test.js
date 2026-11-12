// src/__tests__/staffDropdownAndMaster.node.test.js
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dropdownPath = path.resolve(__dirname, '../components/StaffSearchDropdown.jsx');
const customerFormPath = path.resolve(__dirname, '../components/CustomerForm.jsx');
const createOrderModalPath = path.resolve(__dirname, '../components/CreateOrderModal.jsx');
const servicePath = path.resolve(__dirname, '../services/customerService.js');
const sqlPath = path.resolve(__dirname, '../../supabase/staff_and_pickup_master.sql');
const cssPath = path.resolve(__dirname, '../styles/washdoor.css');

test('Supabase migration SQL defines separate Staff Master & Pickup/Delivery Master tables with FKs and seed rows', () => {
  assert.ok(fs.existsSync(sqlPath), 'staff_and_pickup_master.sql must exist');
  const sql = fs.readFileSync(sqlPath, 'utf8');

  assert.match(sql, /CREATE TABLE IF NOT EXISTS public\.washdoor_staff_master/);
  assert.match(sql, /staff_id\s+VARCHAR\(30\)\s+NOT NULL\s+UNIQUE/);
  assert.match(sql, /staff_name\s+VARCHAR\(120\)\s+NOT NULL/);
  assert.match(sql, /zone\s+VARCHAR\(100\)\s+NOT NULL/);
  assert.match(sql, /CHECK \(status IN \('Active', 'Inactive'\)\)/);

  assert.match(sql, /CREATE TABLE IF NOT EXISTS public\.washdoor_pickup_delivery_master/);
  assert.match(sql, /employee_id\s+VARCHAR\(30\)\s+NOT NULL\s+UNIQUE/);
  assert.match(sql, /employee_name\s+VARCHAR\(120\)\s+NOT NULL/);

  assert.match(sql, /'STF001',\s*'Sakthi',\s*'Zone A',\s*'Active'/);
  assert.match(sql, /'STF002',\s*'Balaji',\s*'Zone B',\s*'Active'/);
  assert.match(sql, /'STF003',\s*'Kumar',\s*'Zone A',\s*'Active'/);
  assert.match(sql, /'PUD001',\s*'Ramesh',\s*'Zone A',\s*'Active'/);
  assert.match(sql, /'PUD002',\s*'Venkat',\s*'Zone B',\s*'Active'/);

  assert.match(sql, /ADD COLUMN IF NOT EXISTS attend_staff_id/);
  assert.match(sql, /ADD COLUMN IF NOT EXISTS assigned_pickup_person_id/);
  assert.match(sql, /REFERENCES public\.washdoor_staff_master \(staff_id\)/);
  assert.match(sql, /REFERENCES public\.washdoor_pickup_delivery_master \(employee_id\)/);
});

test('customerService loads active staff/pickup masters and saves unique IDs against orders', () => {
  const service = fs.readFileSync(servicePath, 'utf8');

  assert.match(service, /export async function fetchActiveStaffMaster/);
  assert.match(service, /from\('washdoor_staff_master'\)/);
  assert.match(service, /export async function fetchActivePickupDeliveryMaster/);
  assert.match(service, /from\('washdoor_pickup_delivery_master'\)/);
  assert.match(service, /\.eq\('status', 'Active'\)/);

  assert.match(service, /attend_staff_id:\s*attendStaffIdVal/);
  assert.match(service, /assigned_pickup_person_id:\s*pickupPersonIdVal/);
  assert.match(service, /attend_staff_id:\s*row\.attend_staff_id/);
  assert.match(service, /assigned_pickup_person_id:\s*row\.assigned_pickup_person_id/);
});

test('StaffSearchDropdown supports search by name/ID, loading, error retry, empty, and no-selection states', () => {
  assert.ok(fs.existsSync(dropdownPath), 'StaffSearchDropdown.jsx must exist');
  const code = fs.readFileSync(dropdownPath, 'utf8');

  assert.match(code, /export function formatStaffDisplayLabel/);
  assert.match(code, /role="combobox"/);
  assert.match(code, /role="listbox"/);
  assert.match(code, /role="option"/);
  assert.match(code, /nameMatch \|\| idMatch/);
  assert.match(code, /Loading active records/);
  assert.match(code, /onRetry/);
  assert.match(code, /Clear selection/);
  assert.match(code, /\{item\.name\} \(\{item\.uniqueId\}\)/);
});

test('CustomerForm and CreateOrderModal wire StaffSearchDropdown and store unique IDs without altering other fields', () => {
  const form = fs.readFileSync(customerFormPath, 'utf8');
  const modal = fs.readFileSync(createOrderModalPath, 'utf8');
  const css = fs.readFileSync(cssPath, 'utf8');

  assert.match(form, /import StaffSearchDropdown from '\.\/StaffSearchDropdown'/);
  assert.match(form, /fetchActiveStaffMaster/);
  assert.match(form, /fetchActivePickupDeliveryMaster/);
  assert.match(form, /<label htmlFor="attendStaffName">Attend Staff Name<\/label>/);
  assert.match(form, /<label htmlFor="assignedPickupPerson">Assigned Pickup &amp; Delivery Person<\/label>/);
  assert.match(form, /attend_staff_id:\s*attendStaffId \|\| null/);
  assert.match(form, /assigned_pickup_person_id:\s*assignedPickupPersonId \|\| null/);

  assert.match(modal, /attend_staff_id:\s*customerData\?\.attend_staff_id \|\| null/);
  assert.match(modal, /assigned_pickup_person_id:\s*customerData\?\.assigned_pickup_person_id \|\| null/);

  assert.match(css, /\.staff-dropdown-box/);
  assert.match(css, /\.staff-dropdown-menu/);
  assert.match(css, /body\.light-theme \.staff-dropdown-menu/);
});

test('SettingsModule integrates StaffMasterManager for creating and managing Staff and Pickup/Delivery masters in UI', () => {
  const managerPath = path.resolve(__dirname, '../components/StaffMasterManager.jsx');
  const settingsPath = path.resolve(__dirname, '../components/SettingsModule.jsx');
  assert.ok(fs.existsSync(managerPath), 'StaffMasterManager.jsx must exist');

  const manager = fs.readFileSync(managerPath, 'utf8');
  const settings = fs.readFileSync(settingsPath, 'utf8');
  const service = fs.readFileSync(servicePath, 'utf8');

  assert.match(settings, /import StaffMasterManager from '\.\/StaffMasterManager'/);
  assert.match(settings, /staff_master/);
  assert.match(settings, /<StaffMasterManager/);

  assert.match(manager, /saveStaffMasterRecord/);
  assert.match(manager, /savePickupDeliveryMasterRecord/);
  assert.match(manager, /toggleMasterPersonStatus/);
  assert.match(service, /export async function fetchAllStaffMaster/);
  assert.match(service, /export async function saveStaffMasterRecord/);
  assert.match(service, /export async function fetchAllPickupDeliveryMaster/);
  assert.match(service, /export async function savePickupDeliveryMasterRecord/);
  assert.match(service, /export async function toggleMasterPersonStatus/);
});

test('DriverAssignModal loads live ACTIVE pickup/delivery records and StaffMasterManager enforces 10-digit phone', () => {
  const driverModalPath = path.resolve(__dirname, '../components/DriverAssignModal.jsx');
  const managerPath = path.resolve(__dirname, '../components/StaffMasterManager.jsx');
  const driverModal = fs.readFileSync(driverModalPath, 'utf8');
  const manager = fs.readFileSync(managerPath, 'utf8');
  const service = fs.readFileSync(servicePath, 'utf8');

  assert.doesNotMatch(driverModal, /DEFAULT_FLEET/);
  assert.match(driverModal, /fetchActivePickupDeliveryMaster/);
  assert.match(driverModal, /ACTIVE PICKUP &amp; DELIVERY PERSONNEL/);

  assert.match(manager, /maxLength=\{10\}/);
  assert.match(manager, /replace\(\/\\D\/g,\s*''\)/);
  assert.match(manager, /Phone number must be exactly 10 digits/);
  assert.match(service, /Phone number must be exactly 10 digits/);
});

test('POSModule inline edit and SideEditPanel use StaffSearchDropdown and washdoor.css styles scrollbar', () => {
  const posPath = path.resolve(__dirname, '../components/POSModule.jsx');
  const sideEditPath = path.resolve(__dirname, '../components/SideEditPanel.jsx');
  const cssPath = path.resolve(__dirname, '../styles/washdoor.css');

  const pos = fs.readFileSync(posPath, 'utf8');
  const sideEdit = fs.readFileSync(sideEditPath, 'utf8');
  const css = fs.readFileSync(cssPath, 'utf8');

  assert.match(pos, /<StaffSearchDropdown[\s\S]*id="posEditAttendStaffName"[\s\S]*variant="staff"/);
  assert.match(pos, /<StaffSearchDropdown[\s\S]*id="posEditAssignedPickupPerson"[\s\S]*variant="pickup"/);
  assert.match(pos, /attend_staff_id/);
  assert.match(pos, /assigned_pickup_person_id/);

  assert.match(sideEdit, /<StaffSearchDropdown[\s\S]*id="side-edit-attend-staff"[\s\S]*variant="staff"/);
  assert.match(sideEdit, /<StaffSearchDropdown[\s\S]*id="side-edit-pickup-person"[\s\S]*variant="pickup"/);
  assert.match(sideEdit, /attend_staff_id/);
  assert.match(sideEdit, /assigned_pickup_person_id/);

  assert.match(css, /\.staff-dropdown-menu\s*\{[\s\S]*max-height:\s*158px;[\s\S]*overflow-y:\s*auto;/);
  assert.match(css, /\.staff-dropdown-menu::-webkit-scrollbar/);
});
