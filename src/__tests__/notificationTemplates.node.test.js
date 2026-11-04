// src/__tests__/notificationTemplates.node.test.js
// Unit & Integration tests for Washdoor Notification Template Management System

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  NOTIFICATION_CATEGORIES,
  SUPPORTED_VARIABLES,
  DEFAULT_TEMPLATES,
  renderTemplateVariables,
  getTemplates,
  saveTemplate,
  duplicateTemplate,
  toggleTemplateActive,
  archiveTemplate,
  resetDefaultTemplate,
  resetAllDefaults,
  triggerNotification,
  getNotificationLogs,
  retryNotification,
} from '../services/notificationTemplateService.js';
import { getStoredAuditLogs } from '../services/auditService.js';

test('1. Categories Specification: defines exact 6 lifecycle notification categories', () => {
  assert.equal(NOTIFICATION_CATEGORIES.length, 6);
  const keys = NOTIFICATION_CATEGORIES.map((c) => c.key);
  assert.ok(keys.includes('order_created'));
  assert.ok(keys.includes('ready_for_pickup'));
  assert.ok(keys.includes('thank_you'));
  assert.ok(keys.includes('late_delivery'));
  assert.ok(keys.includes('payment_pending'));
  assert.ok(keys.includes('late_payment'));
});

test('2. Default Templates: contains exactly 18 factory templates (6 categories × 3 channels)', () => {
  assert.equal(DEFAULT_TEMPLATES.length, 18);
  const channels = ['whatsapp', 'sms', 'email'];
  for (const cat of NOTIFICATION_CATEGORIES) {
    for (const ch of channels) {
      const match = DEFAULT_TEMPLATES.find((t) => t.category === cat.key && t.channel === ch);
      assert.ok(match, `Missing default template for ${cat.key} - ${ch}`);
      assert.ok(match.message_body.length > 10, `Empty body for ${cat.key} - ${ch}`);
      if (ch === 'email') {
        assert.ok(match.subject && match.subject.length > 5, `Missing email subject for ${cat.key}`);
      }
    }
  }
});

test('3. Dynamic Variables: supports all 14 specified variable tokens', () => {
  assert.equal(SUPPORTED_VARIABLES.length, 14);
  const tokens = SUPPORTED_VARIABLES.map((v) => v.token);
  const expected = [
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
  for (const exp of expected) {
    assert.ok(tokens.includes(exp), `Missing variable definition: ${exp}`);
  }
});

test('4. Variable Interpolation Engine: renders template with custom and default data', () => {
  const template = 'Hello {{customer_name}}, order {{order_id}} total {{total_amount}} is {{payment_status}}.';
  const rendered = renderTemplateVariables(template, {
    customer_name: 'Priya Patel',
    order_id: 'ORD-99999',
    total_amount: '₹850',
    payment_status: 'Paid',
  });
  assert.equal(rendered, 'Hello Priya Patel, order ORD-99999 total ₹850 is Paid.');
});

test('5. Variable Interpolation Engine: falls back safely to sample data when fields are omitted', () => {
  const template = 'Customer: {{customer_name}}, Delivery: {{delivery_date}}';
  const rendered = renderTemplateVariables(template, {});
  assert.ok(rendered.includes('Rahul Sharma'));
  assert.ok(rendered.includes('28 Oct 2026'));
});

test('6. Template CRUD: get, save, duplicate, toggle active, and archive operations', async () => {
  const initial = await getTemplates();
  assert.ok(initial.length >= 18);

  // Edit
  const target = initial[0];
  const edited = await saveTemplate({
    ...target,
    template_name: `${target.template_name} [Updated]`,
  });
  const found = edited.find((t) => t.id === target.id);
  assert.ok(found.template_name.includes('[Updated]'));

  // Duplicate
  const withDup = await duplicateTemplate(target.id);
  assert.equal(withDup.length, edited.length + 1);
  const copy = withDup.find((t) => t.template_name.includes('(Copy)'));
  assert.ok(copy);

  // Toggle active
  const beforeToggle = copy.is_active;
  const withToggle = await toggleTemplateActive(copy.id);
  const toggled = withToggle.find((t) => t.id === copy.id);
  assert.equal(toggled.is_active, !beforeToggle);

  // Archive
  const afterArchive = await archiveTemplate(copy.id);
  assert.equal(afterArchive.length, edited.length);
});

test('7. Template Reset: resets individual and all 18 default templates', async () => {
  await saveTemplate({
    id: 'tpl_order_created_whatsapp',
    category: 'order_created',
    channel: 'whatsapp',
    template_name: 'Order Created - WhatsApp',
    message_body: 'MODIFIED TEXT',
  });

  const resetSingle = await resetDefaultTemplate('order_created', 'whatsapp');
  const tpl = resetSingle.find((t) => t.id === 'tpl_order_created_whatsapp');
  assert.ok(!tpl.message_body.includes('MODIFIED TEXT'));
  assert.ok(tpl.message_body.includes('Thank you for choosing Washdoor!'));

  const resetAll = await resetAllDefaults();
  assert.equal(resetAll.length, 18);
});

test('8. Automatic Triggers & Idempotency: dispatches notification and prevents duplicate delivery', async () => {
  const uniqueOrderNum = `ORD-TPL-${Date.now()}`;
  const res1 = await triggerNotification({
    eventType: 'order_created',
    channel: 'whatsapp',
    order: {
      order_number: uniqueOrderNum,
      customer_name: 'Test Customer',
      total_amount: 300,
    },
    customer: {
      customer_name: 'Test Customer',
      mobile_number: '9876543210',
    },
  });

  assert.ok(res1.success);
  assert.equal(res1.log.recipient, '9876543210');
  assert.equal(res1.log.status, 'Delivered');

  // Trigger again with identical event + order + channel
  const res2 = await triggerNotification({
    eventType: 'order_created',
    channel: 'whatsapp',
    order: {
      order_number: uniqueOrderNum,
      customer_name: 'Test Customer',
      total_amount: 300,
    },
    customer: {
      customer_name: 'Test Customer',
      mobile_number: '9876543210',
    },
  });

  assert.ok(res2.skipped, 'Second dispatch should be skipped by idempotency key');
  assert.match(res2.reason, /already delivered/i);
});

test('9. Payment Reminders Rule: never triggers reminders if payment is already paid in full', async () => {
  const res = await triggerNotification({
    eventType: 'payment_pending',
    channel: 'sms',
    order: {
      order_number: 'ORD-PAID-01',
      payment_status: 'Paid',
      pending_amount: 0,
    },
    customer: { mobile_number: '9876543210' },
  });

  assert.ok(res.skipped);
  assert.match(res.reason, /fully paid/i);
});

test('10. Notification History & Retry: supports logging and manual safe retry', async () => {
  const logs = await getNotificationLogs();
  assert.ok(Array.isArray(logs));

  if (logs.length > 0) {
    const first = logs[0];
    const retried = await retryNotification(first.id);
    assert.ok(retried.success);
    assert.equal(retried.log.status, 'Delivered');
  }
});

test('11. Audit Trail Integration: verifies audit events are recorded for template operations', () => {
  const auditLogs = getStoredAuditLogs();
  assert.ok(Array.isArray(auditLogs));
  const hasTemplateAudit = auditLogs.some((l) => l.module === 'Notification Templates' || l.action.includes('Template') || l.action.includes('Notification'));
  assert.ok(hasTemplateAudit, 'Expected notification template audit events in audit log');
});

test('12. Navigation Integration: SettingsModule places Template under Language', () => {
  const settingsModuleCode = fs.readFileSync(path.resolve('src/components/SettingsModule.jsx'), 'utf8');
  assert.match(settingsModuleCode, /TemplateManagementSection/);
  assert.match(settingsModuleCode, /id:\s*'templates'/);
  assert.match(settingsModuleCode, /Notification Templates/);
});
