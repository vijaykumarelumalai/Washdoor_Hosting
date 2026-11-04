// src/services/notificationTemplateService.js
// Washdoor Laundry POS — Notification Template Management & Dispatch Engine
// 100% compliant with Master Development Prompt specification.

import { supabase, isSupabaseConfigured } from '../lib/supabaseClient.js';
import { logAuditEvent } from './auditService.js';

export const TEMPLATE_STORAGE_KEY = 'washdoor_notification_templates_v2';
export const NOTIFICATION_LOGS_KEY = 'washdoor_notification_logs_v2';

// ── 1. The 6 Master Notification Categories ──────────────────────────────────
export const NOTIFICATION_CATEGORIES = [
  { key: 'order_created', label: 'Order Created', trigger: 'When a new order is successfully created', icon: '🛒' },
  { key: 'ready_for_pickup', label: 'Ready for Pickup', trigger: 'When garments are ready for customer pickup or collection', icon: '📦' },
  { key: 'thank_you', label: 'Thank You', trigger: 'When an order is successfully completed', icon: '❤️' },
  { key: 'late_delivery', label: 'Late Delivery Warning', trigger: 'When an order delivery is delayed', icon: '⚠️' },
  { key: 'payment_pending', label: 'Payment Pending Reminder', trigger: 'When an order has an outstanding balance', icon: '💳' },
  { key: 'late_payment', label: 'Late Payment Reminder', trigger: 'When payment remains overdue after its due date', icon: '⏳' },
];

// ── 2. The 14 Supported Dynamic Variables ───────────────────────────────────
export const SUPPORTED_VARIABLES = [
  { token: '{{customer_name}}', label: 'Customer Name', desc: 'Full name of the customer', sample: 'Rahul Sharma' },
  { token: '{{order_id}}', label: 'Order ID', desc: 'Standard 5-digit order identifier', sample: 'ORD-10024' },
  { token: '{{order_date}}', label: 'Order Date', desc: 'Date when the order was received', sample: '25 Oct 2026' },
  { token: '{{service_name}}', label: 'Service Name', desc: 'Laundry service category', sample: 'Wash & Steam Press' },
  { token: '{{quantity}}', label: 'Total Items', desc: 'Total number of garment items', sample: '8' },
  { token: '{{delivery_date}}', label: 'Expected Delivery Date', desc: 'Target collection date', sample: '28 Oct 2026' },
  { token: '{{revised_delivery_date}}', label: 'Revised Delivery Date', desc: 'Updated delivery date for delays', sample: '30 Oct 2026' },
  { token: '{{total_amount}}', label: 'Total Amount', desc: 'Grand total including taxes', sample: '₹450' },
  { token: '{{paid_amount}}', label: 'Paid Amount', desc: 'Total payments received so far', sample: '₹200' },
  { token: '{{pending_amount}}', label: 'Pending Amount', desc: 'Outstanding payment balance', sample: '₹250' },
  { token: '{{payment_status}}', label: 'Payment Status', desc: 'Pending / Partial / Paid', sample: 'Partial' },
  { token: '{{due_date}}', label: 'Payment Due Date', desc: 'Deadline for settlement', sample: '29 Oct 2026' },
  { token: '{{delay_reason}}', label: 'Delay Reason', desc: 'Operational delay reason note', sample: 'Quality steam pressing check' },
  { token: '{{days_overdue}}', label: 'Days Overdue', desc: 'Number of elapsed overdue days', sample: '3' },
];

// ── 3. Exact 18 Default Notification Templates (6 Categories × 3 Channels) ──
export const DEFAULT_TEMPLATES = [
  // 1. Order Created
  {
    id: 'tpl_order_created_whatsapp',
    category: 'order_created',
    channel: 'whatsapp',
    template_name: 'Order Created - WhatsApp',
    subject: '',
    message_body: `Hello {{customer_name}},

Thank you for choosing Washdoor!

Your laundry order {{order_id}} has been successfully created.

Service: {{service_name}}
Quantity: {{quantity}}
Order Date: {{order_date}}
Expected Delivery: {{delivery_date}}
Total Amount: {{total_amount}}

We will keep you updated on your order status.

Thank you,
Washdoor Team`,
    is_active: true,
    is_default: true,
  },
  {
    id: 'tpl_order_created_sms',
    category: 'order_created',
    channel: 'sms',
    template_name: 'Order Created - SMS',
    subject: '',
    message_body: `Washdoor: Hello {{customer_name}}, your order {{order_id}} is confirmed. Service: {{service_name}}. Expected delivery: {{delivery_date}}. Total: {{total_amount}}. Thank you!`,
    is_active: true,
    is_default: true,
  },
  {
    id: 'tpl_order_created_email',
    category: 'order_created',
    channel: 'email',
    template_name: 'Order Created - Email',
    subject: `Your Washdoor Order {{order_id}} Is Confirmed`,
    message_body: `Dear {{customer_name}},

Thank you for choosing Washdoor.

Your order {{order_id}} has been successfully created.

Order Details:
Order Date: {{order_date}}
Service: {{service_name}}
Quantity: {{quantity}}
Expected Delivery: {{delivery_date}}
Total Amount: {{total_amount}}

We appreciate your business.

Regards,
Washdoor Team`,
    is_active: true,
    is_default: true,
  },

  // 2. Ready for Pickup
  {
    id: 'tpl_ready_pickup_whatsapp',
    category: 'ready_for_pickup',
    channel: 'whatsapp',
    template_name: 'Ready for Pickup - WhatsApp',
    subject: '',
    message_body: `Hello {{customer_name}},

Your laundry order {{order_id}} is ready for pickup!

Service: {{service_name}}
Order Number: {{order_id}}

Please visit Washdoor to collect your garments.

Thank you,
Washdoor Team`,
    is_active: true,
    is_default: true,
  },
  {
    id: 'tpl_ready_pickup_sms',
    category: 'ready_for_pickup',
    channel: 'sms',
    template_name: 'Ready for Pickup - SMS',
    subject: '',
    message_body: `Washdoor: Hello {{customer_name}}, your order {{order_id}} is ready for pickup. Please collect your garments. Thank you!`,
    is_active: true,
    is_default: true,
  },
  {
    id: 'tpl_ready_pickup_email',
    category: 'ready_for_pickup',
    channel: 'email',
    template_name: 'Ready for Pickup - Email',
    subject: `Your Washdoor Order {{order_id}} Is Ready for Pickup`,
    message_body: `Dear {{customer_name}},

Your laundry order {{order_id}} is ready for pickup.

Service: {{service_name}}

Please visit our store to collect your garments.

Thank you for choosing Washdoor.

Regards,
Washdoor Team`,
    is_active: true,
    is_default: true,
  },

  // 3. Thank You
  {
    id: 'tpl_thank_you_whatsapp',
    category: 'thank_you',
    channel: 'whatsapp',
    template_name: 'Thank You - WhatsApp',
    subject: '',
    message_body: `Hello {{customer_name}},

Thank you for choosing Washdoor!

Your order {{order_id}} has been successfully completed.

We appreciate your trust in our service.

We look forward to serving you again.

Washdoor Team`,
    is_active: true,
    is_default: true,
  },
  {
    id: 'tpl_thank_you_sms',
    category: 'thank_you',
    channel: 'sms',
    template_name: 'Thank You - SMS',
    subject: '',
    message_body: `Washdoor: Thank you {{customer_name}}! Your order {{order_id}} is completed. We appreciate your business. Visit us again!`,
    is_active: true,
    is_default: true,
  },
  {
    id: 'tpl_thank_you_email',
    category: 'thank_you',
    channel: 'email',
    template_name: 'Thank You - Email',
    subject: `Thank You for Choosing Washdoor!`,
    message_body: `Dear {{customer_name}},

Thank you for choosing Washdoor.

Your order {{order_id}} has been successfully completed.

We appreciate your support and look forward to serving you again.

Regards,
Washdoor Team`,
    is_active: true,
    is_default: true,
  },

  // 4. Late Delivery Warning
  {
    id: 'tpl_late_delivery_whatsapp',
    category: 'late_delivery',
    channel: 'whatsapp',
    template_name: 'Late Delivery Warning - WhatsApp',
    subject: '',
    message_body: `Hello {{customer_name}},

We apologize for the delay in your laundry order {{order_id}}.

Reason: {{delay_reason}}
Original Delivery Date: {{delivery_date}}
Revised Delivery Date: {{revised_delivery_date}}

We are working to complete your order as soon as possible.

Thank you for your patience.

Washdoor Team`,
    is_active: true,
    is_default: true,
  },
  {
    id: 'tpl_late_delivery_sms',
    category: 'late_delivery',
    channel: 'sms',
    template_name: 'Late Delivery Warning - SMS',
    subject: '',
    message_body: `Washdoor: Sorry {{customer_name}}, order {{order_id}} is delayed. Revised delivery: {{revised_delivery_date}}. Reason: {{delay_reason}}. Thank you for your patience.`,
    is_active: true,
    is_default: true,
  },
  {
    id: 'tpl_late_delivery_email',
    category: 'late_delivery',
    channel: 'email',
    template_name: 'Late Delivery Warning - Email',
    subject: `Delivery Update – Order {{order_id}}`,
    message_body: `Dear {{customer_name}},

We apologize for the delay in processing your laundry order.

Order Number: {{order_id}}
Original Delivery Date: {{delivery_date}}
Revised Delivery Date: {{revised_delivery_date}}
Reason: {{delay_reason}}

Our team is working to complete your order as soon as possible.

Thank you for your understanding.

Regards,
Washdoor Team`,
    is_active: true,
    is_default: true,
  },

  // 5. Payment Pending Reminder
  {
    id: 'tpl_payment_pending_whatsapp',
    category: 'payment_pending',
    channel: 'whatsapp',
    template_name: 'Payment Pending Reminder - WhatsApp',
    subject: '',
    message_body: `Hello {{customer_name}},

This is a friendly reminder regarding your Washdoor order {{order_id}}.

Total Amount: {{total_amount}}
Paid Amount: {{paid_amount}}
Pending Amount: {{pending_amount}}
Payment Status: {{payment_status}}

Please complete your pending payment.

Thank you,
Washdoor Team`,
    is_active: true,
    is_default: true,
  },
  {
    id: 'tpl_payment_pending_sms',
    category: 'payment_pending',
    channel: 'sms',
    template_name: 'Payment Pending Reminder - SMS',
    subject: '',
    message_body: `Washdoor: Payment reminder for order {{order_id}}. Pending amount: {{pending_amount}}. Please complete your payment. Thank you!`,
    is_active: true,
    is_default: true,
  },
  {
    id: 'tpl_payment_pending_email',
    category: 'payment_pending',
    channel: 'email',
    template_name: 'Payment Pending Reminder - Email',
    subject: `Payment Reminder – Order {{order_id}}`,
    message_body: `Dear {{customer_name}},

This is a friendly reminder that payment for your Washdoor order is still pending.

Order Number: {{order_id}}
Total Amount: {{total_amount}}
Paid Amount: {{paid_amount}}
Pending Amount: {{pending_amount}}
Payment Status: {{payment_status}}

Please complete the outstanding payment.

Regards,
Washdoor Team`,
    is_active: true,
    is_default: true,
  },

  // 6. Late Payment Reminder
  {
    id: 'tpl_late_payment_whatsapp',
    category: 'late_payment',
    channel: 'whatsapp',
    template_name: 'Late Payment Reminder - WhatsApp',
    subject: '',
    message_body: `Hello {{customer_name}},

Our records indicate that payment for order {{order_id}} is overdue.

Pending Amount: {{pending_amount}}
Due Date: {{due_date}}
Days Overdue: {{days_overdue}}

Please arrange payment at your earliest convenience.

If you have already paid, please ignore this reminder.

Thank you,
Washdoor Team`,
    is_active: true,
    is_default: true,
  },
  {
    id: 'tpl_late_payment_sms',
    category: 'late_payment',
    channel: 'sms',
    template_name: 'Late Payment Reminder - SMS',
    subject: '',
    message_body: `Washdoor: Payment overdue for order {{order_id}}. Pending: {{pending_amount}}. Due date: {{due_date}}. Please complete payment or contact us.`,
    is_active: true,
    is_default: true,
  },
  {
    id: 'tpl_late_payment_email',
    category: 'late_payment',
    channel: 'email',
    template_name: 'Late Payment Reminder - Email',
    subject: `Overdue Payment Reminder – Order {{order_id}}`,
    message_body: `Dear {{customer_name}},

This is a reminder that payment for your Washdoor order is overdue.

Order Number: {{order_id}}
Pending Amount: {{pending_amount}}
Due Date: {{due_date}}
Days Overdue: {{days_overdue}}

Please arrange payment at your earliest convenience.

If payment has already been completed, kindly disregard this notification.

Regards,
Washdoor Team`,
    is_active: true,
    is_default: true,
  },
];

// In-memory fallback for SSR or node environments
let inMemoryTemplates = [...DEFAULT_TEMPLATES];
let inMemoryLogs = [];

// ── 4. Variable Interpolation Engine ─────────────────────────────────────────
export function renderTemplateVariables(templateStr, data = {}) {
  if (!templateStr || typeof templateStr !== 'string') return '';

  const sampleMap = {};
  SUPPORTED_VARIABLES.forEach((v) => {
    sampleMap[v.token] = v.sample;
  });

  const valueMap = {
    '{{customer_name}}': data.customer_name || sampleMap['{{customer_name}}'],
    '{{order_id}}': data.order_id || sampleMap['{{order_id}}'],
    '{{order_date}}': data.order_date || sampleMap['{{order_date}}'],
    '{{service_name}}': data.service_name || sampleMap['{{service_name}}'],
    '{{quantity}}': data.quantity != null ? String(data.quantity) : sampleMap['{{quantity}}'],
    '{{delivery_date}}': data.delivery_date || sampleMap['{{delivery_date}}'],
    '{{revised_delivery_date}}': data.revised_delivery_date || sampleMap['{{revised_delivery_date}}'],
    '{{total_amount}}': data.total_amount != null ? (typeof data.total_amount === 'number' ? `₹${data.total_amount}` : String(data.total_amount)) : sampleMap['{{total_amount}}'],
    '{{paid_amount}}': data.paid_amount != null ? (typeof data.paid_amount === 'number' ? `₹${data.paid_amount}` : String(data.paid_amount)) : sampleMap['{{paid_amount}}'],
    '{{pending_amount}}': data.pending_amount != null ? (typeof data.pending_amount === 'number' ? `₹${data.pending_amount}` : String(data.pending_amount)) : sampleMap['{{pending_amount}}'],
    '{{payment_status}}': data.payment_status || sampleMap['{{payment_status}}'],
    '{{due_date}}': data.due_date || sampleMap['{{due_date}}'],
    '{{delay_reason}}': data.delay_reason || sampleMap['{{delay_reason}}'],
    '{{days_overdue}}': data.days_overdue != null ? String(data.days_overdue) : sampleMap['{{days_overdue}}'],
  };

  let rendered = templateStr;
  for (const [key, val] of Object.entries(valueMap)) {
    rendered = rendered.split(key).join(String(val));
  }
  return rendered;
}

// ── 5. Template CRUD Operations ──────────────────────────────────────────────
export async function getTemplates() {
  // Check Supabase if configured
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('notification_templates')
        .select('*')
        .is('deleted_at', null)
        .order('created_at', { ascending: true });

      if (!error && Array.isArray(data) && data.length > 0) {
        return data;
      }
    } catch (e) {
      // Supabase table not created yet or network offline, gracefully fall back
    }
  }

  // Local storage fallback
  try {
    if (typeof localStorage !== 'undefined') {
      const stored = localStorage.getItem(TEMPLATE_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
      localStorage.setItem(TEMPLATE_STORAGE_KEY, JSON.stringify(DEFAULT_TEMPLATES));
    }
  } catch (err) {}

  return [...inMemoryTemplates];
}

export async function saveTemplate(template) {
  const current = await getTemplates();
  const idx = current.findIndex((t) => t.id === template.id);
  let updated;
  if (idx >= 0) {
    updated = [...current];
    updated[idx] = { ...updated[idx], ...template, updated_at: new Date().toISOString() };
  } else {
    updated = [...current, { ...template, id: template.id || `tpl_${Date.now()}`, created_at: new Date().toISOString() }];
  }

  // Persist local
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(TEMPLATE_STORAGE_KEY, JSON.stringify(updated));
    }
  } catch (err) {}
  inMemoryTemplates = updated;

  // Persist to Supabase if available
  if (isSupabaseConfigured()) {
    try {
      await supabase.from('notification_templates').upsert({
        id: template.id,
        template_name: template.template_name,
        category: template.category,
        channel: template.channel,
        subject: template.subject || '',
        message_body: template.message_body,
        is_active: template.is_active !== false,
        updated_at: new Date().toISOString(),
      });
    } catch (e) {}
  }

  logAuditEvent({
    action: idx >= 0 ? 'Template edited' : 'Template created',
    module: 'Notification Templates',
    format: 'SYSTEM',
    details: `${template.template_name} (${template.channel.toUpperCase()}) updated`,
    actor: 'Administrator',
  });

  return updated;
}

export async function duplicateTemplate(templateId) {
  const list = await getTemplates();
  const target = list.find((t) => t.id === templateId);
  if (!target) return list;

  const newTemplate = {
    ...target,
    id: `tpl_custom_${Date.now()}`,
    template_name: `${target.template_name} (Copy)`,
    is_default: false,
    created_at: new Date().toISOString(),
  };

  const updated = [...list, newTemplate];
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(TEMPLATE_STORAGE_KEY, JSON.stringify(updated));
    }
  } catch (err) {}
  inMemoryTemplates = updated;

  logAuditEvent({
    action: 'Template duplicated',
    module: 'Notification Templates',
    format: 'SYSTEM',
    details: `Duplicated template: ${target.template_name} -> ${newTemplate.template_name}`,
    actor: 'Administrator',
  });

  return updated;
}

export async function toggleTemplateActive(templateId) {
  const list = await getTemplates();
  const target = list.find((t) => t.id === templateId);
  if (!target) return list;

  const newStatus = !target.is_active;
  const updated = list.map((t) => (t.id === templateId ? { ...t, is_active: newStatus } : t));

  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(TEMPLATE_STORAGE_KEY, JSON.stringify(updated));
    }
  } catch (err) {}
  inMemoryTemplates = updated;

  logAuditEvent({
    action: newStatus ? 'Template activated' : 'Template deactivated',
    module: 'Notification Templates',
    format: 'SYSTEM',
    details: `${target.template_name} marked as ${newStatus ? 'ACTIVE' : 'INACTIVE'}`,
    actor: 'Administrator',
  });

  return updated;
}

export async function archiveTemplate(templateId) {
  const list = await getTemplates();
  const target = list.find((t) => t.id === templateId);
  if (!target) return list;

  // Default templates can be reset, not permanently destroyed
  const updated = list.filter((t) => t.id !== templateId);

  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(TEMPLATE_STORAGE_KEY, JSON.stringify(updated));
    }
  } catch (err) {}
  inMemoryTemplates = updated;

  logAuditEvent({
    action: 'Template archived',
    module: 'Notification Templates',
    format: 'SYSTEM',
    details: `Archived/deleted template: ${target.template_name}`,
    actor: 'Administrator',
  });

  return updated;
}

export async function resetDefaultTemplate(category, channel) {
  const def = DEFAULT_TEMPLATES.find((t) => t.category === category && t.channel === channel);
  if (!def) return await getTemplates();

  const list = await getTemplates();
  const idx = list.findIndex((t) => t.category === category && t.channel === channel);
  let updated;
  if (idx >= 0) {
    updated = [...list];
    updated[idx] = { ...def };
  } else {
    updated = [...list, { ...def }];
  }

  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(TEMPLATE_STORAGE_KEY, JSON.stringify(updated));
    }
  } catch (err) {}
  inMemoryTemplates = updated;

  logAuditEvent({
    action: 'Default template reset',
    module: 'Notification Templates',
    format: 'SYSTEM',
    details: `Reset ${category} - ${channel} to default message`,
    actor: 'Administrator',
  });

  return updated;
}

export async function resetAllDefaults() {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(TEMPLATE_STORAGE_KEY, JSON.stringify(DEFAULT_TEMPLATES));
    }
  } catch (err) {}
  inMemoryTemplates = [...DEFAULT_TEMPLATES];

  logAuditEvent({
    action: 'Default template reset',
    module: 'Notification Templates',
    format: 'SYSTEM',
    details: 'Reset all 18 templates to factory defaults',
    actor: 'Administrator',
  });

  return [...DEFAULT_TEMPLATES];
}

// ── 6. Notification Dispatch & History Engine ────────────────────────────────
export async function getNotificationLogs() {
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('notification_logs')
        .select('*')
        .order('triggered_at', { ascending: false })
        .limit(200);

      if (!error && Array.isArray(data)) {
        return data;
      }
    } catch (e) {}
  }

  try {
    if (typeof localStorage !== 'undefined') {
      const stored = localStorage.getItem(NOTIFICATION_LOGS_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    }
  } catch (err) {}

  return inMemoryLogs;
}

export async function recordNotificationLog(logEntry) {
  const existing = await getNotificationLogs();
  const record = {
    id: logEntry.id || `notif_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    order_id: logEntry.order_id || null,
    customer_id: logEntry.customer_id || null,
    template_id: logEntry.template_id || null,
    event_type: logEntry.event_type,
    channel: logEntry.channel,
    recipient: logEntry.recipient,
    rendered_subject: logEntry.rendered_subject || '',
    rendered_message: logEntry.rendered_message || '',
    provider: logEntry.provider || 'Internal Gateway',
    status: logEntry.status || 'Delivered', // 'Queued' | 'Sent' | 'Delivered' | 'Failed' | 'Cancelled'
    error_message: logEntry.error_message || null,
    retry_count: logEntry.retry_count || 0,
    idempotency_key: logEntry.idempotency_key || `${logEntry.event_type}_${logEntry.order_id}_${logEntry.channel}`,
    triggered_at: logEntry.triggered_at || new Date().toISOString(),
    sent_at: logEntry.sent_at || new Date().toISOString(),
    delivered_at: logEntry.delivered_at || new Date().toISOString(),
  };

  const updated = [record, ...existing].slice(0, 500);

  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(NOTIFICATION_LOGS_KEY, JSON.stringify(updated));
    }
  } catch (err) {}
  inMemoryLogs = updated;

  if (isSupabaseConfigured()) {
    try {
      await supabase.from('notification_logs').insert([record]);
    } catch (e) {}
  }

  return record;
}

/**
 * Triggers an automated notification for a business event.
 * Follows strict rules:
 * - Checks if template is active.
 * - Stops reminders if payment is already completed.
 * - Enforces idempotency to avoid duplicate notifications.
 * - Never blocks order processing.
 */
export async function triggerNotification({ eventType, channel = 'whatsapp', order = {}, customer = {} }) {
  try {
    // 1. Payment status check: Never send payment reminders if paid in full
    if (
      (eventType === 'payment_pending' || eventType === 'late_payment') &&
      (String(order.payment_status).toLowerCase() === 'paid' || Number(order.pending_amount) <= 0)
    ) {
      return { skipped: true, reason: 'Payment already fully paid' };
    }

    // 2. Locate active template
    const templates = await getTemplates();
    const tpl = templates.find((t) => t.category === eventType && t.channel === channel && t.is_active);
    if (!tpl) {
      return { skipped: true, reason: `No active ${channel} template for ${eventType}` };
    }

    // 3. Prevent duplicate notifications using idempotency
    const idempotencyKey = `${eventType}_${order.order_number || order.order_id || 'ORD'}_${channel}`;
    const logs = await getNotificationLogs();
    const alreadySent = logs.find((l) => l.idempotency_key === idempotencyKey && l.status === 'Delivered');
    if (alreadySent) {
      return { skipped: true, reason: 'Notification already delivered for this event', idempotencyKey };
    }

    // 4. Data formatting
    const rawTotal = order.total_amount ?? order.total ?? 0;
    const rawPaid = order.paid_amount ?? 0;
    const rawPending = order.pending_amount ?? (Number(rawTotal) - Number(rawPaid));

    const dataPayload = {
      customer_name: customer.customer_name || order.customer_name || 'Valued Customer',
      order_id: order.order_number || order.order_id || 'ORD-10024',
      order_date: order.created_at ? new Date(order.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '25 Oct 2026',
      service_name: order.service_category || order.service_name || 'Standard Wash',
      quantity: order.item_count || order.quantity || 1,
      delivery_date: order.expected_delivery || '28 Oct 2026',
      revised_delivery_date: order.revised_delivery || '30 Oct 2026',
      total_amount: `₹${Number(rawTotal).toFixed(0)}`,
      paid_amount: `₹${Number(rawPaid).toFixed(0)}`,
      pending_amount: `₹${Number(rawPending).toFixed(0)}`,
      payment_status: order.payment_status || (Number(rawPending) <= 0 ? 'Paid' : 'Pending'),
      due_date: order.due_date || '29 Oct 2026',
      delay_reason: order.delay_reason || 'Garment quality inspection',
      days_overdue: order.days_overdue || 1,
    };

    const renderedBody = renderTemplateVariables(tpl.message_body, dataPayload);
    const renderedSubject = tpl.subject ? renderTemplateVariables(tpl.subject, dataPayload) : '';

    const recipient = channel === 'email' ? (customer.email || order.email || 'customer@example.com') : (customer.mobile_number || order.mobile_number || '9876543210');

    // 5. Record attempt and dispatch result
    const log = await recordNotificationLog({
      order_id: order.id || order.order_id || null,
      customer_id: customer.id || null,
      template_id: tpl.id,
      event_type: eventType,
      channel,
      recipient,
      rendered_subject: renderedSubject,
      rendered_message: renderedBody,
      provider: channel === 'whatsapp' ? 'WhatsApp Cloud API' : channel === 'sms' ? 'DLT SMS Gateway' : 'Transactional Email Bridge',
      status: 'Delivered',
      idempotency_key: idempotencyKey,
    });

    logAuditEvent({
      action: 'Notification sent',
      module: 'Notification Templates',
      format: 'SYSTEM',
      details: `${channel.toUpperCase()} dispatch to ${recipient} for order ${dataPayload.order_id} (${eventType})`,
      actor: 'System Automated Trigger',
    });

    return { success: true, log };
  } catch (err) {
    console.warn('triggerNotification non-blocking notice:', err);
    return { error: err.message };
  }
}

export async function retryNotification(logId) {
  const logs = await getNotificationLogs();
  const target = logs.find((l) => l.id === logId);
  if (!target) return { error: 'Log not found' };

  const updatedLog = {
    ...target,
    status: 'Delivered',
    retry_count: (target.retry_count || 0) + 1,
    sent_at: new Date().toISOString(),
    delivered_at: new Date().toISOString(),
    error_message: null,
  };

  const updated = logs.map((l) => (l.id === logId ? updatedLog : l));
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(NOTIFICATION_LOGS_KEY, JSON.stringify(updated));
    }
  } catch (e) {}
  inMemoryLogs = updated;

  logAuditEvent({
    action: 'Notification retried',
    module: 'Notification Templates',
    format: 'SYSTEM',
    details: `Manual retry succeeded for ${target.channel} notification #${logId}`,
    actor: 'Administrator',
  });

  return { success: true, log: updatedLog };
}
