// src/__tests__/notificationTemplates.node.test.js
// Automated verification suite for Washdoor Dynamic Notification Template Management
// Tests 6 categories, 3 channels, 14 dynamic variables, CRUD, and audit logging

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const srcDir = path.resolve(__dirname, '..');

import {
  NOTIFICATION_CATEGORIES,
  COMMUNICATION_CHANNELS,
  DYNAMIC_VARIABLES,
  DEFAULT_TEMPLATES,
  renderTemplate,
  getNotificationTemplates,
  saveNotificationTemplate,
  deleteNotificationTemplate,
  toggleTemplateActive,
  getNotificationLogs,
  sendNotification,
} from '../services/notificationTemplateService.js';

test('1. Notification Categories contains exact 6 required laundry lifecycle categories', () => {
  assert.equal(NOTIFICATION_CATEGORIES.length, 6);
  const keys = NOTIFICATION_CATEGORIES.map((c) => c.key);
  assert.deepEqual(keys, [
    'order_created',
    'ready_for_pickup',
    'thank_you',
    'late_delivery',
    'payment_pending',
    'late_payment',
  ]);
});

test('2. Communication Channels supports WhatsApp, SMS, and Email', () => {
  assert.equal(COMMUNICATION_CHANNELS.length, 3);
  const channels = COMMUNICATION_CHANNELS.map((c) => c.key);
  assert.ok(channels.includes('whatsapp'));
  assert.ok(channels.includes('sms'));
  assert.ok(channels.includes('email'));
});

test('3. Dynamic Variables includes all 14 supported tokens', () => {
  assert.equal(DYNAMIC_VARIABLES.length, 14);
  const expectedTags = [
    '{{customer_name}}',
    '{{order_id}}',
    '{{order_date}}',
    '{{service_name}}',
    '{{quantity}}',
    '{{delivery_date}}',
    '{{revised_delivery_date}}',
    '{{total_amount}}',
    '{{paid_amount}}',
    '{{pending_amount}}',
    '{{payment_status}}',
    '{{due_date}}',
    '{{delay_reason}}',
    '{{days_overdue}}',
  ];
  const tags = DYNAMIC_VARIABLES.map((v) => v.tag);
  assert.deepEqual(tags, expectedTags);
});

test('4. Default Predefined Templates contains 18 entries (6 categories x 3 channels)', () => {
  assert.equal(DEFAULT_TEMPLATES.length, 18);

  const categories = ['order_created', 'ready_for_pickup', 'thank_you', 'late_delivery', 'payment_pending', 'late_payment'];
  const channels = ['whatsapp', 'sms', 'email'];

  categories.forEach((cat) => {
    channels.forEach((ch) => {
      const match = DEFAULT_TEMPLATES.find((t) => t.event_type === cat && t.channel === ch);
      assert.ok(match, `Missing predefined template for ${cat} on ${ch}`);
      assert.ok(match.message_body && match.message_body.length > 10);
      if (ch === 'email') {
        assert.ok(match.email_subject && match.email_subject.length > 5);
      }
    });
  });
});

test('5. renderTemplate dynamically replaces all 14 variables without undefined or null', () => {
  const sampleTemplate = `Hello {{customer_name}}, order {{order_id}} on {{order_date}} for {{service_name}} ({{quantity}}). Delivery: {{delivery_date}} (revised: {{revised_delivery_date}}). Total: ₹{{total_amount}}, Paid: ₹{{paid_amount}}, Due: ₹{{pending_amount}} ({{payment_status}} by {{due_date}}). Delayed: {{delay_reason}}, Overdue: {{days_overdue}}.`;

  const context = {
    customer_name: 'Senthil Nathan',
    order_id: 'ORD00099',
    order_date: '04 Nov 2026',
    service_name: 'Premium Dry Clean',
    quantity: '3 suits',
    delivery_date: '07 Nov 2026',
    revised_delivery_date: '08 Nov 2026',
    total_amount: 600,
    paid_amount: 300,
    pending_amount: 300,
    payment_status: 'Partially Paid',
    due_date: '07 Nov 2026',
    delay_reason: 'Fabric spot testing',
    days_overdue: '1 day',
  };

  const rendered = renderTemplate(sampleTemplate, context);

  assert.ok(rendered.includes('Senthil Nathan'));
  assert.ok(rendered.includes('ORD00099'));
  assert.ok(rendered.includes('Premium Dry Clean'));
  assert.ok(rendered.includes('₹600.00'));
  assert.ok(!rendered.includes('{{'));
  assert.ok(!rendered.includes('}}'));
  assert.ok(!rendered.includes('undefined'));
  assert.ok(!rendered.includes('null'));
});

test('6. Template CRUD functions manage local storage & database fallback', async () => {
  const templates = await getNotificationTemplates();
  assert.ok(Array.isArray(templates));
  assert.ok(templates.length >= 18);

  // Save new custom template
  const newTemplate = {
    id: 'test-custom-tpl-01',
    template_name: 'Custom Test WhatsApp Alert',
    event_type: 'order_created',
    channel: 'whatsapp',
    message_body: 'Hello {{customer_name}}, test alert for {{order_id}}!',
    is_active: true,
  };

  const saved = await saveNotificationTemplate(newTemplate);
  assert.equal(saved.id, 'test-custom-tpl-01');

  // Toggle active state
  const toggled = await toggleTemplateActive('test-custom-tpl-01');
  assert.equal(toggled.is_active, false);

  // Delete template
  const deleted = await deleteNotificationTemplate('test-custom-tpl-01');
  assert.equal(deleted, true);
});

test('7. SettingsModule.jsx defines Template directly under Language in navigation', () => {
  const settingsPath = path.resolve(srcDir, 'components/SettingsModule.jsx');
  const content = fs.readFileSync(settingsPath, 'utf8');

  // Verify 'templates' item is present right after 'language'
  const menuMatch = content.match(/id:\s*['"]language['"][\s\S]*?id:\s*['"]templates['"]/);
  assert.ok(menuMatch, 'templates menu item must be positioned directly under language');

  assert.match(content, /TemplateManagementSection/);
  assert.match(content, /activeTab === 'templates'/);
});

test('8. TemplateManagementSection.jsx provides Studio, History, and Simulation tabs', () => {
  const sectionPath = path.resolve(srcDir, 'components/TemplateManagementSection.jsx');
  assert.ok(fs.existsSync(sectionPath));
  const content = fs.readFileSync(sectionPath, 'utf8');

  assert.match(content, /Template Studio/);
  assert.match(content, /Notification History &amp; Audit Trail|Notification History/);
  assert.match(content, /Live Dispatch Test/);
  assert.match(content, /WhatsApp/);
  assert.match(content, /SMS/);
  assert.match(content, /Email/);
  assert.match(content, /Dynamic Variables/);
});

test('9. Supabase migration schema exists and defines tables and RLS', () => {
  const sqlPath = path.resolve(srcDir, '../supabase/notification_templates.sql');
  assert.ok(fs.existsSync(sqlPath));
  const sqlContent = fs.readFileSync(sqlPath, 'utf8');

  assert.match(sqlContent, /create table if not exists public\.notification_templates/);
  assert.match(sqlContent, /create table if not exists public\.notification_logs/);
  assert.match(sqlContent, /alter table public\.notification_templates enable row level security/);
  assert.match(sqlContent, /order_created/);
  assert.match(sqlContent, /ready_for_pickup/);
});

test('10. sendNotification prevents duplicate dispatch and records audit log', async () => {
  const order = {
    order_number: 'ORD99999',
    customer_name: 'Test Customer',
    mobile_number: '9840000000',
    total_amount: 500,
  };

  const res1 = await sendNotification({
    eventType: 'order_created',
    channel: 'whatsapp',
    order,
  });

  assert.equal(res1.success, true);
  assert.ok(res1.log);
  assert.equal(res1.log.order_id, 'ORD99999');

  // Duplicate attempt for same order + event + channel should be prevented
  const res2 = await sendNotification({
    eventType: 'order_created',
    channel: 'whatsapp',
    order,
  });

  assert.equal(res2.success, false);
  assert.equal(res2.duplicate, true);
  assert.match(res2.reason, /Duplicate prevention/i);
});
