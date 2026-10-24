-- ==============================================================================
-- WASHDOOR POS: Unified Master Table Schema (washdoor_orders_master)
-- Single-table master schema covering all Customer Creation & Order Intake fields
-- With PostgreSQL Constraints, Auto-Order Sequence, RLS, and Seed Data.
-- ==============================================================================

-- 1. Create order number sequence
create sequence if not exists public.order_number_seq start with 1 increment by 1;

-- 2. Create auto-generating order number function (ORDER-00001 format)
create or replace function public.generate_order_number()
returns text
language plpgsql
as $$
declare
  next_val bigint;
begin
  next_val := nextval('public.order_number_seq');
  return 'ORDER-' || lpad(next_val::text, 5, '0');
end;
$$;

-- 3. Create Unified Master Table
create table if not exists public.washdoor_orders_master (
  -- Order Identification & Lifecycle
  order_id                    uuid primary key default gen_random_uuid(),
  order_number                varchar(30) not null default public.generate_order_number() unique,
  order_status                varchar(50) not null default 'Laundry In Progress',
  order_type                  varchar(30) not null default 'walk-in',
  service_category            varchar(50) default 'Standard',
  pickup_schedule             timestamptz,
  expected_delivery           timestamptz,

  -- Customer Identification & Contact
  customer_id                 varchar(30) not null default 'CUST-00001',
  customer_name               varchar(150) not null,
  mobile_number               varchar(10) not null check (mobile_number ~ '^[6-9]\d{9}$'),
  alternate_phone             varchar(10) check (alternate_phone is null or alternate_phone ~ '^[6-9]\d{9}$'),
  email                       varchar(255) check (email is null or email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
  company_name                varchar(150),
  gst_number                  varchar(15),
  tax_exemption               boolean not null default false,

  -- Location & Logistics
  street_area                 text,
  city                        varchar(100) default 'Vellore',
  pincode                     varchar(6) check (pincode is null or pincode ~ '^\d{6}$'),
  area_service_zone           varchar(50) default 'Zone 1',
  map_link                    text,

  -- Intake & Preferences
  intake_type                 varchar(50) not null default 'Walk-In',
  communication_preference    varchar(50) not null default 'WhatsApp',
  preferred_language          varchar(50) not null default 'English',
  do_not_disturb              boolean not null default false,
  internal_comments           text,
  order_notes                 text,

  -- Commercial, Loyalty & Pricing Rules
  customer_classification     varchar(50) not null default 'Regular Customer',
  customer_status             varchar(30) not null default 'Active',
  tier                        varchar(50) not null default 'SILVER',
  membership_id               varchar(50),
  price_list                  varchar(50) not null default 'Standard',
  default_discount_pct        numeric(5,2) not null default 0.00 check (default_discount_pct >= 0 and default_discount_pct <= 100),
  credit_limit                numeric(12,2) not null default 0.00 check (credit_limit >= 0),
  wallet_balance              numeric(12,2) not null default 0.00,
  referral_code               varchar(50),
  marketing_source            varchar(100) default 'Walk-in',

  -- Personal Occasions
  date_of_birth               date,
  anniversary_date            date,
  special_occasion            varchar(100),
  special_occasion_date       date,

  -- Billing, Amounts & Payment
  item_count                  integer not null default 1 check (item_count >= 0),
  subtotal_amount             numeric(10,2) not null default 0.00 check (subtotal_amount >= 0),
  discount_amount             numeric(10,2) not null default 0.00 check (discount_amount >= 0),
  tax_amount                  numeric(10,2) not null default 0.00 check (tax_amount >= 0),
  total_amount                numeric(10,2) not null default 0.00 check (total_amount >= 0),
  payment_status              varchar(50) not null default 'Pending',
  payment_method              varchar(50) default 'Cash',

  -- Insights & Audit
  customer_insights           jsonb default '{}'::jsonb,
  customer_history            jsonb default '{}'::jsonb,
  created_at                  timestamptz not null default now(),
  updated_at                  timestamptz not null default now()
);

-- 4. Fast Lookup Indexes
create index if not exists idx_orders_master_phone on public.washdoor_orders_master (mobile_number);
create index if not exists idx_orders_master_code  on public.washdoor_orders_master (customer_id);
create index if not exists idx_orders_master_num   on public.washdoor_orders_master (order_number);
create index if not exists idx_orders_master_name  on public.washdoor_orders_master using gin (to_tsvector('english', customer_name));

-- 5. Row Level Security (RLS)
alter table public.washdoor_orders_master enable row level security;

-- Policies for POS counter access
drop policy if exists "allow_all_read_orders_master" on public.washdoor_orders_master;
create policy "allow_all_read_orders_master" on public.washdoor_orders_master
  for select using (true);

drop policy if exists "allow_all_insert_orders_master" on public.washdoor_orders_master;
create policy "allow_all_insert_orders_master" on public.washdoor_orders_master
  for insert with check (true);

drop policy if exists "allow_all_update_orders_master" on public.washdoor_orders_master;
create policy "allow_all_update_orders_master" on public.washdoor_orders_master
  for update using (true) with check (true);

drop policy if exists "allow_all_delete_orders_master" on public.washdoor_orders_master;
create policy "allow_all_delete_orders_master" on public.washdoor_orders_master
  for delete using (true);

grant all on public.washdoor_orders_master to anon, authenticated;
grant usage, select on sequence public.order_number_seq to anon, authenticated;
grant execute on function public.generate_order_number to anon, authenticated;

-- 6. Seed Data (All 10 Master Customers)
insert into public.washdoor_orders_master (
  order_number, order_status, order_type, customer_id, customer_name, mobile_number,
  street_area, city, pincode, area_service_zone, intake_type, communication_preference,
  preferred_language, do_not_disturb, internal_comments, customer_classification,
  customer_status, tier, membership_id, price_list, default_discount_pct, credit_limit,
  wallet_balance, referral_code, marketing_source, email, alternate_phone, gst_number,
  company_name, date_of_birth, anniversary_date, special_occasion, special_occasion_date,
  order_notes, total_amount, payment_status, payment_method
) values
  ('WD-112016', 'Laundry In Progress', 'walk-in', 'CUST-0001', 'Vijay Kumar', '9876543210',
   'Anna Nagar', 'Vellore', '632001', 'Zone 1', 'Walk-In', 'WhatsApp',
   'Tamil', false, 'Regular customer', 'Regular Customer',
   'Active', 'PLATINUM ELITE', 'MEM-0001', 'Standard', 5.0, 0,
   1500.00, 'REF-001', 'Walk-in', 'vijay@example.com', null, null,
   null, null, null, null, null,
   'Standard wash and steam press', 450.00, 'Paid', 'UPI'),

  ('WD-112017', 'Ready', 'on-call', 'CUST-0002', 'Pooja Sharma', '9876543211',
   'Gandhi Nagar', 'Vellore', '632006', 'Zone 2', 'On-Call', 'SMS',
   'English', false, 'Pickup requested', 'Regular Customer',
   'Active', 'GOLD', null, 'Standard', 2.0, 0,
   850.00, null, 'Google', 'pooja@example.com', '9876543212', null,
   null, '1998-07-12', '2026-02-14', 'Birthday', '1998-07-12',
   'Prefers morning pickup', 320.00, 'Paid', 'Cash'),

  ('WD-112018', 'Ready', 'walk-in', 'CUST-0003', 'Arun Prakash', '9876543213',
   'Katpadi', 'Vellore', '632007', 'Zone 1', 'Walk-In', 'Email',
   'English', true, 'Do not send promotional messages', 'VIP Customer',
   'Active', 'PLATINUM ELITE', 'MEM-0003', 'Premium', 0.0, 0,
   3200.00, null, 'Referral', 'arun@example.com', null, null,
   null, null, null, null, null,
   'VIP customer express delivery', 880.00, 'Paid', 'Card'),

  ('WD-112019', 'Laundry In Progress', 'on-call', 'CUST-0004', 'Lakshmi Devi', '9876543214',
   'Sathuvachari', 'Vellore', '632009', 'Zone 2', 'On-Call', 'Phone call',
   'Tamil', false, 'Call before delivery', 'Regular Customer',
   'Active', 'SILVER', null, 'Standard', 3.0, 0,
   420.00, 'REF-004', 'WhatsApp', 'lakshmi@example.com', null, null,
   null, null, null, null, null,
   'Evening delivery preferred', 147.00, 'Pending', 'Cash'),

  ('WD-112020', 'In Part', 'on-call', 'CUST-0005', 'Ramesh Enterprises', '9876543215',
   'New Bypass Road', 'Vellore', '632004', 'Zone 3', 'On-Call', 'Email',
   'English', false, 'Corporate account', 'Corporate Customer',
   'Active', 'CORPORATE', 'MEM-0005', 'Corporate', 10.0, 25000.00,
   0.00, null, 'Advertisement', 'accounts@example.com', null, '33ABCDE1234F1Z5',
   'Ramesh Enterprises', null, null, null, null,
   'Credit limit requires authorized approval', 1850.00, 'Pending', 'Credit'),

  ('WD-112021', 'Laundry In Progress', 'walk-in', 'CUST-0006', 'Divya Suresh', '9876543216',
   'Bagayam', 'Vellore', '632002', 'Zone 1', 'Walk-In', 'WhatsApp',
   'Telugu', false, 'New customer', 'Regular Customer',
   'Active', 'SILVER', null, 'Standard', 0.0, 0,
   0.00, null, 'Social media', 'divya@example.com', null, null,
   null, null, null, null, null,
   'First visit promo applied', 260.00, 'Paid', 'UPI'),

  ('WD-112022', 'Ready', 'on-call', 'CUST-0007', 'Suresh Babu', '9876543217',
   'Thorapadi', 'Vellore', '632002', 'Zone 2', 'On-Call', 'SMS',
   'Tamil', false, 'Prefers weekend delivery', 'Regular Customer',
   'Active', 'SILVER', null, 'Standard', 0.0, 0,
   150.00, 'REF-007', 'Walk-in', 'suresh@example.com', null, null,
   null, null, null, null, null,
   'Weekend orders only', 410.00, 'Paid', 'Cash'),

  ('WD-112023', 'In Part', 'walk-in', 'CUST-0008', 'Meena Raj', '9876543218',
   'Otteri', 'Vellore', '632002', 'Zone 1', 'Walk-In', 'WhatsApp',
   'Tamil', false, 'Staff discount eligible', 'VIP Customer',
   'Active', 'GOLD', 'MEM-0008', 'Premium', 5.0, 0,
   1100.00, null, 'Referral', 'meena@example.com', null, null,
   null, null, null, null, null,
   'Express service preferred', 650.00, 'Paid', 'UPI'),

  ('WD-112024', 'Laundry In Progress', 'on-call', 'CUST-0009', 'Karthik Rajan', '9876543219',
   'Saidapet', 'Vellore', '632012', 'Zone 3', 'On-Call', 'Phone call',
   'Tamil', false, 'Door delivery required', 'Regular Customer',
   'Active', 'SILVER', null, 'Standard', 0.0, 0,
   0.00, null, 'Google', 'karthik@example.com', '9876543221', null,
   null, null, null, null, null,
   'Call before coming', 190.00, 'Pending', 'Cash'),

  ('WD-112025', 'Ready', 'walk-in', 'CUST-0010', 'Priya Natarajan', '9876543220',
   'Shenbakkam', 'Vellore', '632008', 'Zone 1', 'Walk-In', 'WhatsApp',
   'English', false, 'Loyalty member', 'VIP Customer',
   'Active', 'PLATINUM ELITE', 'MEM-0010', 'Premium', 7.5, 0,
   2450.00, 'REF-010', 'WhatsApp', 'priya@example.com', null, null,
   null, '1995-11-20', '2025-05-18', 'Anniversary', '2025-05-18',
   'Handle silk garments with care', 1120.00, 'Paid', 'Card')
on conflict (order_number) do nothing;
