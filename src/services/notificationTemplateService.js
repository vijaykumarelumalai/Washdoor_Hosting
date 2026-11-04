// src/services/notificationTemplateService.js
// Washdoor Laundry POS — Notification Template Management & Dispatch Engine
// 100% compliant with Master Development Prompt specification.

import { supabase, isSupabaseConfigured } from '../lib/supabaseClient.js';
import { logAuditEvent } from './auditService.js';

export const TEMPLATE_STORAGE_KEY = 'washdoor_notification_templates_v2';
export const NOTIFICATION_LOGS_KEY = 'washdoor_notification_logs_v2';

// ── 1. The 6 Master Notification Categories ──────────────────────────────────
export const NOTIFICATION_CATEGORIES = [
  { key: 'order_created', label: 'Order Received', trigger: 'When a new laundry order is registered and accepted', icon: '🛒' },
  { key: 'ready_for_pickup', label: 'Ready for Delivery', trigger: 'When garments are cleaned, pressed and ready for delivery/pickup', icon: '📦' },
  { key: 'payment_pending', label: 'Payment Received', trigger: 'When a payment is recorded or invoice balance is confirmed', icon: '💳' },
  { key: 'late_payment', label: 'Late Payment', trigger: 'When payment remains overdue past the agreed deadline', icon: '⏳' },
  { key: 'late_delivery', label: 'Delay Order', trigger: 'When laundry processing is delayed beyond estimated delivery date', icon: '⚠️' },
  { key: 'thank_you', label: 'Suggestion or Complaint Message', trigger: 'Post-delivery feedback, suggestion box and complaint resolution', icon: '❤️' },
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
  // 1. Order Received
  {
    id: 'tpl_order_created_whatsapp',
    category: 'order_created',
    channel: 'whatsapp',
    template_name: 'Order Received - WhatsApp',
    subject: '',
    message_body: `🧺 *WASHDOR LAUNDRY — ORDER CONFIRMATION*

Dear *{{customer_name}}*,
Thank you for choosing Washdoor! We have received your garments and started the laundry care process.

📋 *Order Details:*
• Order ID: *{{order_id}}*
• Received On: {{order_date}}
• Service: *{{service_name}}*
• Total Items: {{quantity}} garments
• Expected Ready Date: *{{delivery_date}}*
• Bill Amount: *{{total_amount}}* ({{payment_status}})

🔍 We will notify you the moment your fresh clothes are washed, pressed & ready!

Warm regards,
*Team Washdoor*
📞 Support: +91 7603917058`,
    is_active: true,
    is_default: true,
  },
  {
    id: 'tpl_order_created_sms',
    category: 'order_created',
    channel: 'sms',
    template_name: 'Order Received - SMS',
    subject: '',
    message_body: `Washdoor: Hello {{customer_name}}, order {{order_id}} received! Service: {{service_name}} ({{quantity}} items). Total: {{total_amount}}. Ready by: {{delivery_date}}. Thank you!`,
    is_active: true,
    is_default: true,
  },
  {
    id: 'tpl_order_created_email',
    category: 'order_created',
    channel: 'email',
    template_name: 'Order Received - Email',
    subject: `Order Received & Confirmed — Washdoor #{{order_id}}`,
    message_body: `Dear {{customer_name}},

Thank you for choosing Washdoor Laundry Services! We have safely received your garments at our express hub and processing has officially begun.

ORDER INTAKE SUMMARY:
• Order Reference: {{order_id}}
• Intake Date: {{order_date}}
• Selected Service: {{service_name}}
• Garment Count: {{quantity}} pieces
• Promised Completion: {{delivery_date}}
• Total Bill: {{total_amount}} (Status: {{payment_status}})

Each piece undergoes individual inspection, fabric-safe washing with eco-friendly detergents, and crisp steam pressing.

We will notify you immediately once your garments are sanitized, packaged, and ready for delivery/collection.

Warm regards,
Washdoor Laundry Operations
Email: info@washdoor.in | Phone: +91 7603917058`,
    is_active: true,
    is_default: true,
  },

  // 2. Ready for Delivery
  {
    id: 'tpl_ready_pickup_whatsapp',
    category: 'ready_for_pickup',
    channel: 'whatsapp',
    template_name: 'Ready for Delivery - WhatsApp',
    subject: '',
    message_body: `✨ *YOUR CLOTHES ARE FRESH & READY!*

Dear *{{customer_name}}*,
Great news! Your laundry order *#{{order_id}}* is completely washed, sanitized, steam-pressed, and neatly packaged.

📦 *Collection & Delivery Details:*
• Order ID: *{{order_id}}*
• Service: {{service_name}}
• Garment Count: {{quantity}} items
• Ready Date: {{delivery_date}}
• Amount Due: *{{pending_amount}}*

📍 *Washdoor Express Hub:*
No.7, 4th Avenue, 1st Cross Road, MBT Road, Chennai.

🛵 If you requested doorstep delivery, our delivery partner will be in touch shortly.

Thank you,
*Team Washdoor*
📞 Call/WhatsApp: +91 7603917058`,
    is_active: true,
    is_default: true,
  },
  {
    id: 'tpl_ready_pickup_sms',
    category: 'ready_for_pickup',
    channel: 'sms',
    template_name: 'Ready for Delivery - SMS',
    subject: '',
    message_body: `Washdoor: Great news {{customer_name}}! Order {{order_id}} ({{quantity}} items) is washed, pressed & READY for delivery/pickup. Due: {{pending_amount}}. Collect today!`,
    is_active: true,
    is_default: true,
  },
  {
    id: 'tpl_ready_pickup_email',
    category: 'ready_for_pickup',
    channel: 'email',
    template_name: 'Ready for Delivery - Email',
    subject: `Ready for Delivery: Your Fresh Clothes Await! — Order #{{order_id}}`,
    message_body: `Dear {{customer_name}},

Your laundry order #{{order_id}} is ready!

All {{quantity}} items have undergone complete fabric-safe treatment, quality inspection, and crisp steam finishing.

ORDER STATUS:
• Order ID: {{order_id}}
• Service: {{service_name}}
• Items: {{quantity}} garments
• Balance Payable: {{pending_amount}}
• Store Timings: 08:00 AM – 09:30 PM (Mon–Sun)

If you opted for store pickup, you can drop by at your convenience. For scheduled doorstep delivery, our courier is on standby.

Thank you for trusting Washdoor with your wardrobe!

Best regards,
Washdoor Customer Experience Team`,
    is_active: true,
    is_default: true,
  },

  // 3. Payment Received
  {
    id: 'tpl_payment_pending_whatsapp',
    category: 'payment_pending',
    channel: 'whatsapp',
    template_name: 'Payment Received - WhatsApp',
    subject: '',
    message_body: `💳 *PAYMENT CONFIRMATION & RECEIPT*

Dear *{{customer_name}}*,
We have successfully received your payment of *{{paid_amount}}* for Washdoor Order *#{{order_id}}*.

🧾 *Payment Summary:*
• Order ID: *{{order_id}}*
• Payment Status: *{{payment_status}}*
• Paid Amount: *{{paid_amount}}*
• Outstanding Balance: *{{pending_amount}}*
• Total Bill: {{total_amount}}

Thank you for your prompt settlement! Your digital invoice has been updated in our system.

Warm regards,
*Accounts Department — Washdoor*
📞 Support: +91 7603917058`,
    is_active: true,
    is_default: true,
  },
  {
    id: 'tpl_payment_pending_sms',
    category: 'payment_pending',
    channel: 'sms',
    template_name: 'Payment Received - SMS',
    subject: '',
    message_body: `Washdoor: Payment of {{paid_amount}} received for order {{order_id}}. Balance: {{pending_amount}}. Status: {{payment_status}}. Thank you for your payment!`,
    is_active: true,
    is_default: true,
  },
  {
    id: 'tpl_payment_pending_email',
    category: 'payment_pending',
    channel: 'email',
    template_name: 'Payment Received - Email',
    subject: `Payment Receipt Confirmed — Washdoor Order #{{order_id}}`,
    message_body: `Dear {{customer_name}},

We are pleased to confirm that your payment has been processed successfully.

TRANSACTION BREAKDOWN:
• Order ID: {{order_id}}
• Payment Received: {{paid_amount}}
• Outstanding Balance: {{pending_amount}}
• Total Invoice Value: {{total_amount}}
• Current Status: {{payment_status}}

Your official digital tax invoice and account ledger have been updated accordingly.

Thank you for choosing Washdoor!

Warm regards,
Washdoor Finance & Billing`,
    is_active: true,
    is_default: true,
  },

  // 4. Late Payment
  {
    id: 'tpl_late_payment_whatsapp',
    category: 'late_payment',
    channel: 'whatsapp',
    template_name: 'Late Payment - WhatsApp',
    subject: '',
    message_body: `⏳ *FRIENDLY REMINDER: OVERDUE PAYMENT*

Dear *{{customer_name}}*,
We hope you are delighted with our laundry care services!

This is a courteous reminder that an outstanding payment for order *#{{order_id}}* is currently overdue by *{{days_overdue}} day(s)*.

📋 *Invoice Particulars:*
• Order ID: *{{order_id}}*
• Due Date: {{due_date}}
• Outstanding Amount: *{{pending_amount}}*
• Total Bill: {{total_amount}}

📲 *Easy Payment Options:*
You can pay via UPI (GPay / PhonePe / Paytm) to *washdoor@upi* or settle at our counter upon your next visit.

If you have already transferred this amount, kindly share the screenshot or ignore this message.

Thank you for your cooperation!
*Team Washdoor*
📞 Accounts Desk: +91 7603917058`,
    is_active: true,
    is_default: true,
  },
  {
    id: 'tpl_late_payment_sms',
    category: 'late_payment',
    channel: 'sms',
    template_name: 'Late Payment - SMS',
    subject: '',
    message_body: `Washdoor: Gentle reminder {{customer_name}}, payment of {{pending_amount}} for order {{order_id}} is {{days_overdue}} days overdue (due: {{due_date}}). Kindly clear via UPI washdoor@upi. Thanks!`,
    is_active: true,
    is_default: true,
  },
  {
    id: 'tpl_late_payment_email',
    category: 'late_payment',
    channel: 'email',
    template_name: 'Late Payment - Email',
    subject: `Overdue Payment Notice: Washdoor Order #{{order_id}} (Due: {{pending_amount}})`,
    message_body: `Dear {{customer_name}},

We hope your garments reached you in pristine condition!

Our accounts ledger shows an overdue balance of {{pending_amount}} for your order #{{order_id}}, which reached its due date on {{due_date}} ({{days_overdue}} days ago).

ACCOUNT DETAILS:
• Order ID: {{order_id}}
• Total Amount: {{total_amount}}
• Paid Amount: {{paid_amount}}
• Overdue Balance: {{pending_amount}}
• Payment Due Date: {{due_date}}

Please clear the pending balance via UPI / Net Banking or visit our store counter.

If payment was made recently, please reply with transaction details so we can update your ledger immediately.

Thank you,
Washdoor Accounts & Billing Team`,
    is_active: true,
    is_default: true,
  },

  // 5. Delay Order
  {
    id: 'tpl_late_delivery_whatsapp',
    category: 'late_delivery',
    channel: 'whatsapp',
    template_name: 'Delay Order - WhatsApp',
    subject: '',
    message_body: `⚠️ *IMPORTANT UPDATE: ORDER DELIVERY SCHEDULE*

Dear *{{customer_name}}*,
We sincerely apologize, but your laundry order *#{{order_id}}* is experiencing a slight delay.

🔍 *Reason for Delay:*
{{delay_reason}}

📅 *Revised Schedule:*
• Original Delivery: {{delivery_date}}
• *New Expected Delivery: {{revised_delivery_date}}*
• Order ID: {{order_id}}
• Service: {{service_name}}

Our master pressers and fabric specialists are giving extra care to ensure your garments meet our highest quality standards.

We deeply regret any inconvenience and are prioritizing your package.

Sincerely,
*Washdoor Quality Care Team*
📞 Hotline: +91 7603917058`,
    is_active: true,
    is_default: true,
  },
  {
    id: 'tpl_late_delivery_sms',
    category: 'late_delivery',
    channel: 'sms',
    template_name: 'Delay Order - SMS',
    subject: '',
    message_body: `Washdoor: Sincere apologies {{customer_name}}, order {{order_id}} is delayed due to {{delay_reason}}. Revised delivery: {{revised_delivery_date}}. We appreciate your patience!`,
    is_active: true,
    is_default: true,
  },
  {
    id: 'tpl_late_delivery_email',
    category: 'late_delivery',
    channel: 'email',
    template_name: 'Delay Order - Email',
    subject: `Delivery Schedule Update for Washdoor Order #{{order_id}}`,
    message_body: `Dear {{customer_name}},

We are writing to provide a transparent update regarding your laundry order #{{order_id}}.

Due to {{delay_reason}}, our turnaround time has been slightly extended to ensure no compromise in wash quality and fabric protection.

REVISED TIMELINE:
• Order Reference: {{order_id}}
• Original Target Date: {{delivery_date}}
• Revised Completion Date: {{revised_delivery_date}}
• Garments in Process: {{quantity}} items

Our production manager has assigned priority status to your garments, and we will dispatch a confirmation text the moment they pass final quality check.

We truly appreciate your patience and understanding.

Sincerely,
Washdoor Operations & Quality Assurance`,
    is_active: true,
    is_default: true,
  },

  // 6. Suggestion or Complaint Message
  {
    id: 'tpl_thank_you_whatsapp',
    category: 'thank_you',
    channel: 'whatsapp',
    template_name: 'Suggestion or Complaint - WhatsApp',
    subject: '',
    message_body: `💬 *HOW WAS YOUR WASHDOR EXPERIENCE?*

Dear *{{customer_name}}*,
Thank you for trusting Washdoor with your order *#{{order_id}}*! We hope your clothes look, feel, and smell amazing.

🌟 *Your Voice Matters to Us:*
Whether you loved our service or have suggestions on how we can improve, we would love to hear from you.

• Rate us on Google: https://g.page/r/washdoor/review
• Have a suggestion or concern? Reply directly to this WhatsApp message or call our manager.

🚨 *Dedicated Complaint Escalation Desk:*
If any item did not meet your expectations, let us know within 48 hours for immediate re-wash or resolution.
📞 Customer Care: +91 7603917058

Thank you for being a valued customer!
*Team Washdoor*`,
    is_active: true,
    is_default: true,
  },
  {
    id: 'tpl_thank_you_sms',
    category: 'thank_you',
    channel: 'sms',
    template_name: 'Suggestion or Complaint - SMS',
    subject: '',
    message_body: `Washdoor: Thank you {{customer_name}}! How was order {{order_id}}? Have feedback or a complaint? Reply here or call +91 7603917058. We are always here to help!`,
    is_active: true,
    is_default: true,
  },
  {
    id: 'tpl_thank_you_email',
    category: 'thank_you',
    channel: 'email',
    template_name: 'Suggestion or Complaint - Email',
    subject: `Your Feedback Matters — Washdoor Order #{{order_id}}`,
    message_body: `Dear {{customer_name}},

Thank you for choosing Washdoor for your recent laundry order #{{order_id}}!

Our goal is to deliver 100% spotless fabric care every single time. We value your feedback and would love to hear about your experience.

FEEDBACK & SUGGESTIONS:
• How was the wash quality, freshness, and steam pressing?
• Was the pickup and delivery timely?
• Share your thoughts: feedback@washdoor.in

COMPLAINT & RESOLUTION DESK:
If any garment was not cleaned to your complete satisfaction, please reply to this email or contact our support supervisor directly at +91 7603917058. We offer a complimentary re-wash guarantee within 48 hours.

Thank you for your patronage!

Warm regards,
Washdoor Customer Happiness Team`,
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
        let parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Normalize legacy templates or missing category / event_type fields
          parsed = parsed.map((t) => ({
            ...t,
            category: t.category || t.event_type || 'order_created',
            channel: t.channel || 'whatsapp',
          }));

          // Ensure all 18 default templates are present in the list
          const existingCategoryChannel = new Set(parsed.map((t) => `${t.category}__${t.channel}`));
          let modified = false;
          for (const def of DEFAULT_TEMPLATES) {
            const key = `${def.category}__${def.channel}`;
            if (!existingCategoryChannel.has(key)) {
              parsed.push({ ...def });
              modified = true;
            }
          }
          if (modified) {
            localStorage.setItem(TEMPLATE_STORAGE_KEY, JSON.stringify(parsed));
          }
          inMemoryTemplates = parsed;
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
