-- ==============================================================================
-- WASHDOOR POS: Notification Templates & Dispatch Audit Schema
-- Tables: notification_templates, notification_logs
-- With Constraints, Indexes, RLS Policies, and Initial 18 Predefined Templates
-- ==============================================================================

-- 1. Create notification_templates table
create table if not exists public.notification_templates (
  id              varchar(100) primary key,
  template_name   varchar(200) not null,
  event_type      varchar(60) not null check (event_type in (
                    'order_created',
                    'ready_for_pickup',
                    'thank_you',
                    'late_delivery',
                    'payment_pending',
                    'late_payment'
                  )),
  channel         varchar(20) not null check (channel in ('whatsapp', 'sms', 'email')),
  email_subject   text,
  message_body    text not null,
  is_active       boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- Indexes for lightning-fast template lookup
create index if not exists idx_notification_templates_lookup 
  on public.notification_templates (event_type, channel, is_active);

-- 2. Create notification_logs table for immutable dispatch audit
create table if not exists public.notification_logs (
  id              uuid primary key default gen_random_uuid(),
  order_id        varchar(60),
  customer_id     varchar(60),
  template_id     varchar(100) references public.notification_templates (id) on delete set null,
  channel         varchar(20) not null check (channel in ('whatsapp', 'sms', 'email')),
  recipient       varchar(255) not null,
  message_content text not null,
  delivery_status varchar(30) not null default 'Sent' check (delivery_status in ('Sent', 'Delivered', 'Pending', 'Failed')),
  error_message   text,
  sent_at         timestamptz not null default now(),
  created_at      timestamptz not null default now()
);

-- Indexes for logs query and filtering
create index if not exists idx_notification_logs_order on public.notification_logs (order_id);
create index if not exists idx_notification_logs_status on public.notification_logs (delivery_status);
create index if not exists idx_notification_logs_channel on public.notification_logs (channel);
create index if not exists idx_notification_logs_sent_at on public.notification_logs (sent_at desc);

-- 3. Row Level Security Policies
alter table public.notification_templates enable row level security;
alter table public.notification_logs enable row level security;

-- Public anon/auth policies for POS counter operations
create policy "Allow all operations for anon and authenticated users on notification_templates"
  on public.notification_templates
  for all
  using (true)
  with check (true);

create policy "Allow all operations for anon and authenticated users on notification_logs"
  on public.notification_logs
  for all
  using (true)
  with check (true);

-- 4. Initial Seed Data: 18 Predefined Templates (6 Categories x 3 Channels)
insert into public.notification_templates (id, template_name, event_type, channel, email_subject, message_body, is_active)
values
  -- A. Order Created
  ('tpl-wa-order-created', 'Order Created Confirmation (WhatsApp)', 'order_created', 'whatsapp', null, 
   'Hello {{customer_name}}! 👋

Thank you for choosing Washdoor Laundry Services.

Your laundry order has been successfully created.

📋 Order Details:
- Order ID: {{order_id}}
- Order Date: {{order_date}}
- Services: {{service_name}}
- Total Items: {{quantity}}
- Expected Delivery: {{delivery_date}}

We will keep you updated on your order status.

Thank you for choosing Washdoor! 🧺', true),

  ('tpl-sms-order-created', 'Order Created Confirmation (SMS)', 'order_created', 'sms', null,
   'Washdoor: Hello {{customer_name}}, your laundry order {{order_id}} has been successfully created. Expected delivery: {{delivery_date}}. Thank you for choosing Washdoor!', true),

  ('tpl-email-order-created', 'Order Confirmation Receipt (Email)', 'order_created', 'email', 
   'Your Laundry Order {{order_id}} Has Been Confirmed',
   'Dear {{customer_name}},

Thank you for choosing Washdoor Laundry Services!

We have successfully received your laundry order.

Order Details:
- Order ID: {{order_id}}
- Order Date: {{order_date}}
- Services: {{service_name}}
- Total Items: {{quantity}}
- Expected Delivery: {{delivery_date}}

We will notify you when your laundry is ready for pickup.

Thank you for trusting Washdoor!

Regards,
Washdoor Laundry Team', true),

  -- B. Ready for Pickup
  ('tpl-wa-ready-pickup', 'Ready for Pickup Notification (WhatsApp)', 'ready_for_pickup', 'whatsapp', null,
   'Hello {{customer_name}}! 🎉

Great news! Your laundry order is ready for pickup.

📋 Order ID: {{order_id}}
📦 Services: {{service_name}}
💰 Total Amount: ₹{{total_amount}}
💳 Payment Status: {{payment_status}}

Please visit our store to collect your laundry.

Thank you for choosing Washdoor! 🧺', true),

  ('tpl-sms-ready-pickup', 'Ready for Pickup Notification (SMS)', 'ready_for_pickup', 'sms', null,
   'Washdoor: Hi {{customer_name}}, your order {{order_id}} is ready for pickup. Total: ₹{{total_amount}}. Payment: {{payment_status}}. Please collect your laundry. Thank you!', true),

  ('tpl-email-ready-pickup', 'Order Ready for Pickup (Email)', 'ready_for_pickup', 'email',
   'Your Washdoor Order Is Ready for Pickup!',
   'Dear {{customer_name}},

Your laundry order is ready for pickup!

Order Details:
- Order ID: {{order_id}}
- Services: {{service_name}}
- Total Amount: ₹{{total_amount}}
- Payment Status: {{payment_status}}

Please visit our store during business hours to collect your laundry.

Thank you for choosing Washdoor.

Regards,
Washdoor Laundry Team', true),

  -- C. Thank You Message
  ('tpl-wa-thank-you', 'Service Completion Thank You (WhatsApp)', 'thank_you', 'whatsapp', null,
   'Hello {{customer_name}}! ❤️

Thank you for choosing Washdoor Laundry Services.

We truly appreciate your trust and support.

We hope you are satisfied with our laundry service.

We look forward to serving you again!

Have a wonderful day! 🧺

- Team Washdoor', true),

  ('tpl-sms-thank-you', 'Service Completion Thank You (SMS)', 'thank_you', 'sms', null,
   'Washdoor: Thank you, {{customer_name}}, for choosing our laundry services! We appreciate your trust and look forward to serving you again. - Team Washdoor', true),

  ('tpl-email-thank-you', 'Thank You for Choosing Washdoor (Email)', 'thank_you', 'email',
   'Thank You for Choosing Washdoor!',
   'Dear {{customer_name}},

Thank you for choosing Washdoor Laundry Services.

We sincerely appreciate your business and trust in us.

Customer satisfaction is our priority. We hope you enjoyed our service and look forward to serving you again.

Thank you for being a valued Washdoor customer!

Warm regards,
Washdoor Laundry Team', true),

  -- D. Warning / Late Delivery
  ('tpl-wa-late-delivery', 'Order Delay Advisory (WhatsApp)', 'late_delivery', 'whatsapp', null,
   'Hello {{customer_name}},

We apologize for the inconvenience.

Your laundry order {{order_id}} is taking longer than expected due to {{delay_reason}}.

📅 Original Delivery Date: {{delivery_date}}
📅 Revised Delivery Date: {{revised_delivery_date}}

We are working to complete your order as soon as possible.

Thank you for your patience and understanding.

- Team Washdoor', true),

  ('tpl-sms-late-delivery', 'Order Delay Advisory (SMS)', 'late_delivery', 'sms', null,
   'Washdoor: Sorry {{customer_name}}, your order {{order_id}} is delayed due to {{delay_reason}}. Revised delivery date: {{revised_delivery_date}}. We apologize for the inconvenience.', true),

  ('tpl-email-late-delivery', 'Order Processing Delay Notification (Email)', 'late_delivery', 'email',
   'Important Update: Delay in Your Laundry Order {{order_id}}',
   'Dear {{customer_name}},

We regret to inform you that your laundry order has been delayed.

Order Details:
- Order ID: {{order_id}}
- Original Delivery Date: {{delivery_date}}
- Revised Delivery Date: {{revised_delivery_date}}
- Reason for Delay: {{delay_reason}}

We sincerely apologize for the inconvenience. Our team is working to complete your order at the earliest.

Thank you for your understanding and patience.

Regards,
Washdoor Laundry Team', true),

  -- E. Payment Pending Reminder
  ('tpl-wa-payment-pending', 'Payment Due Friendly Reminder (WhatsApp)', 'payment_pending', 'whatsapp', null,
   'Hello {{customer_name}},

This is a friendly reminder from Washdoor regarding your pending laundry payment.

📋 Order ID: {{order_id}}
💰 Total Amount: ₹{{total_amount}}
💵 Paid Amount: ₹{{paid_amount}}
⚠️ Pending Amount: ₹{{pending_amount}}
📅 Payment Due Date: {{due_date}}

Kindly complete the pending payment at your earliest convenience.

For payment assistance, please contact us.

Thank you!

- Team Washdoor', true),

  ('tpl-sms-payment-pending', 'Payment Due Friendly Reminder (SMS)', 'payment_pending', 'sms', null,
   'Washdoor: Payment reminder for order {{order_id}}. Total: ₹{{total_amount}}, Paid: ₹{{paid_amount}}, Pending: ₹{{pending_amount}}. Kindly complete your payment. Thank you!', true),

  ('tpl-email-payment-pending', 'Outstanding Balance Reminder (Email)', 'payment_pending', 'email',
   'Payment Reminder – Order {{order_id}}',
   'Dear {{customer_name}},

This is a friendly reminder regarding your pending payment for your Washdoor laundry order.

Payment Details:
- Order ID: {{order_id}}
- Total Amount: ₹{{total_amount}}
- Paid Amount: ₹{{paid_amount}}
- Pending Amount: ₹{{pending_amount}}
- Payment Due Date: {{due_date}}

We kindly request you to complete the pending payment at your earliest convenience.

If you have already made the payment, please ignore this reminder.

Thank you for choosing Washdoor.

Regards,
Washdoor Accounts Team', true),

  -- F. Late Payment Reminder
  ('tpl-wa-late-payment', 'Overdue Payment Urgent Notice (WhatsApp)', 'late_payment', 'whatsapp', null,
   'Hello {{customer_name}},

Our records indicate that the payment for your Washdoor order {{order_id}} is still pending beyond the due date.

💰 Pending Amount: ₹{{pending_amount}}
📅 Due Date: {{due_date}}
📆 Days Overdue: {{days_overdue}}

Kindly settle the outstanding amount at your earliest convenience.

If payment has already been made, please disregard this message.

Thank you!

- Washdoor Accounts Team', true),

  ('tpl-sms-late-payment', 'Overdue Payment Urgent Notice (SMS)', 'late_payment', 'sms', null,
   'Washdoor: Payment of ₹{{pending_amount}} for order {{order_id}} is overdue by {{days_overdue}} days. Kindly clear the pending amount. Ignore if already paid.', true),

  ('tpl-email-late-payment', 'Urgent Overdue Payment Notice (Email)', 'late_payment', 'email',
   'Overdue Payment Reminder – Order {{order_id}}',
   'Dear {{customer_name}},

Our records indicate that the payment for your laundry order is overdue.

Payment Summary:
- Order ID: {{order_id}}
- Pending Amount: ₹{{pending_amount}}
- Due Date: {{due_date}}
- Days Overdue: {{days_overdue}}

Please arrange to complete the pending payment at your earliest convenience.

If you have already completed the payment, kindly disregard this reminder.

Regards,
Washdoor Accounts Team', true)

on conflict (id) do update set
  template_name = excluded.template_name,
  email_subject = excluded.email_subject,
  message_body = excluded.message_body,
  updated_at = now();
