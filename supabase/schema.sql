-- ============================================================
-- Washdoor Supabase PostgreSQL Schema & RPC
-- Based on Washdoor Counter Intake UI Specification
-- Run in Supabase SQL Editor (Database → SQL Editor)
-- ============================================================

-- ─── Extensions ──────────────────────────────────────────────
create extension if not exists "uuid-ossp";

-- ─── CUSTOMERS TABLE ─────────────────────────────────────────
create table if not exists public.customers (
  id                     bigint generated always as identity primary key,
  customer_name          text not null check (char_length(trim(customer_name)) >= 1),
  mobile_number          varchar(10) not null unique check (mobile_number ~ '^[0-9]{10}$'),
  alternate_phone        varchar(10) check (alternate_phone is null or alternate_phone ~ '^[0-9]{10}$'),
  address                text,
  city                   text,
  pincode                varchar(6) check (pincode is null or pincode ~ '^[0-9]{6}$'),
  date_of_birth          date,
  map_link               text check (map_link is null or map_link ~ '^https?://'),
  email                  text check (email is null or email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  gst_number             text,
  company_name           text,
  tax_exemption          boolean not null default false,
  notes                  text,
  
  -- Additional fields matching UI spec
  communication_pref     text default 'sms' check (communication_pref in ('sms', 'whatsapp', 'email', 'phone', 'none')),
  communication_lang     text default 'en' check (communication_lang in ('en', 'ta', 'hi', 'te', 'kn', 'ml')),
  dnd                    boolean not null default false,
  internal_comments      text,
  default_discount       numeric(5,2) default 0.00 check (default_discount >= 0 and default_discount <= 100),
  referral_code          text,
  marketing_source       text,
  membership_id          text,
  tier                   text default 'SILVER' check (tier in ('SILVER', 'GOLD', 'PLATINUM ELITE')),
  wallet_balance         numeric(10,2) default 0.00 check (wallet_balance >= 0),
  customer_classification text default 'regular' check (customer_classification in ('regular', 'vip', 'fraud', 'corporate')),
  customer_status        text default 'active' check (customer_status in ('active', 'inactive', 'archived')),
  price_list             text default 'standard',
  service_zone           text default 'zone-1',
  credit_limit           numeric(10,2) default 0.00 check (credit_limit >= 0),
  anniversary_date       date,
  special_occasion       text,
  special_occasion_date  date,

  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

-- Indexes for ultra-fast customer lookup by mobile and name
create index if not exists idx_customers_mobile on public.customers (mobile_number);
create index if not exists idx_customers_name on public.customers (customer_name);
create index if not exists idx_customers_search on public.customers using gin (to_tsvector('simple', customer_name || ' ' || mobile_number || ' ' || coalesce(address, '')));

-- ─── ORDERS TABLE ────────────────────────────────────────────
create table if not exists public.orders (
  id                     bigint generated always as identity primary key,
  order_number           text not null unique,
  customer_id            bigint not null references public.customers (id) on delete restrict,
  order_type             text not null default 'walk-in' check (order_type in ('walk-in', 'on-call')),
  preference             text,
  preference_notes       text,
  status                 text not null default 'Laundry In Progress'
                         check (status in ('Laundry In Progress', 'Ready', 'In Part', 'Completed', 'Cancelled', 'Pending')),
  total_amount           numeric(10,2) not null default 0.00 check (total_amount >= 0),
  notes                  text,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

create index if not exists idx_orders_customer_id on public.orders (customer_id);
create index if not exists idx_orders_created_at on public.orders (created_at desc);

-- ─── UPDATED_AT TRIGGER ──────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create or replace trigger trg_customers_updated_at
  before update on public.customers
  for each row execute function public.set_updated_at();

create or replace trigger trg_orders_updated_at
  before update on public.orders
  for each row execute function public.set_updated_at();

-- ─── ORDER NUMBER GENERATOR SEQUENCE ─────────────────────────
create sequence if not exists order_number_seq start 112016;

create or replace function public.generate_order_number()
returns text language plpgsql as $$
begin
  return 'WD-' || nextval('order_number_seq')::text;
end;
$$;

-- ─── TRANSACTIONAL RPC: create_order_with_customer ───────────
-- Executes customer insertion/validation + order creation atomically.
create or replace function public.create_order_with_customer(
  p_customer_name          text,
  p_mobile_number          varchar(10),
  p_alternate_phone        varchar(10)  default null,
  p_address                text         default null,
  p_city                   text         default null,
  p_pincode                varchar(6)   default null,
  p_date_of_birth          date         default null,
  p_map_link               text         default null,
  p_email                  text         default null,
  p_gst_number             text         default null,
  p_company_name           text         default null,
  p_tax_exemption          boolean      default false,
  p_notes                  text         default null,
  p_communication_pref     text         default 'sms',
  p_communication_lang     text         default 'en',
  p_dnd                    boolean      default false,
  p_internal_comments      text         default null,
  p_default_discount       numeric      default 0.00,
  p_referral_code          text         default null,
  p_marketing_source       text         default null,
  p_membership_id          text         default null,
  p_customer_classification text        default 'regular',
  p_customer_status        text         default 'active',
  p_price_list             text         default 'standard',
  p_service_zone           text         default 'zone-1',
  p_credit_limit           numeric      default 0.00,
  p_anniversary_date       date         default null,
  p_special_occasion       text         default null,
  p_special_occasion_date  date         default null,
  p_order_type             text         default 'walk-in',
  p_order_preference       text         default null,
  p_order_preference_notes text         default null,
  p_total_amount           numeric      default 0.00,
  p_customer_id            bigint       default null
)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_customer_id   bigint;
  v_order_id      bigint;
  v_order_number  text;
begin
  -- Resolve or Insert Customer
  if p_customer_id is not null then
    v_customer_id := p_customer_id;
  else
    insert into public.customers (
      customer_name, mobile_number, alternate_phone,
      address, city, pincode, date_of_birth, map_link,
      email, gst_number, company_name, tax_exemption, notes,
      communication_pref, communication_lang, dnd, internal_comments,
      default_discount, referral_code, marketing_source, membership_id,
      customer_classification, customer_status, price_list, service_zone,
      credit_limit, anniversary_date, special_occasion, special_occasion_date
    ) values (
      p_customer_name, p_mobile_number, p_alternate_phone,
      p_address, p_city, p_pincode, p_date_of_birth, p_map_link,
      p_email, p_gst_number, p_company_name, p_tax_exemption, p_notes,
      coalesce(p_communication_pref, 'sms'), coalesce(p_communication_lang, 'en'),
      coalesce(p_dnd, false), p_internal_comments,
      coalesce(p_default_discount, 0.00), p_referral_code, p_marketing_source, p_membership_id,
      coalesce(p_customer_classification, 'regular'), coalesce(p_customer_status, 'active'),
      coalesce(p_price_list, 'standard'), coalesce(p_service_zone, 'zone-1'),
      coalesce(p_credit_limit, 0.00), p_anniversary_date, p_special_occasion, p_special_occasion_date
    )
    returning id into v_customer_id;
  end if;

  -- Generate order number
  v_order_number := public.generate_order_number();

  -- Insert Order
  insert into public.orders (
    order_number,
    customer_id,
    order_type,
    preference,
    preference_notes,
    status,
    total_amount,
    notes
  ) values (
    v_order_number,
    v_customer_id,
    p_order_type,
    p_order_preference,
    p_order_preference_notes,
    'Laundry In Progress',
    coalesce(p_total_amount, 0.00),
    p_order_preference_notes
  )
  returning id into v_order_id;

  return jsonb_build_object(
    'order_id',     v_order_id,
    'order_number', v_order_number,
    'customer_id',  v_customer_id,
    'status',       'success'
  );
end;
$$;

-- ─── ROW LEVEL SECURITY ──────────────────────────────────────
alter table public.customers enable row level security;
alter table public.orders enable row level security;

-- Policies for anon access (ideal for POS counter apps)
create policy "allow_all_customers_anon" on public.customers
  for all using (true) with check (true);

create policy "allow_all_orders_anon" on public.orders
  for all using (true) with check (true);

-- Grant RPC execution
grant execute on function public.create_order_with_customer to anon, authenticated;
grant execute on function public.generate_order_number to anon, authenticated;
grant usage, select on sequence order_number_seq to anon, authenticated;

-- ─── SEED SAMPLE DATA (Master Customers CUST-0001 to CUST-0010) ────
insert into public.customers (
  customer_code, customer_name, mobile_number, address, city, pincode,
  intake_type, communication_pref, preferred_language, dnd, internal_comments,
  default_discount_pct, referral_code, marketing_source, membership_id,
  customer_classification, status, price_list, area_service_zone, credit_limit,
  email, alternate_phone, gst_number, company_name, date_of_birth, anniversary_date,
  special_occasion, special_occasion_date, notes, tier, wallet_balance
) values
  ('CUST-0001', 'Vijay Kumar', '9876543210', 'Anna Nagar', 'Vellore', '632001',
   'Walk-In', 'whatsapp', 'ta', false, 'Regular customer', 5.0, 'REF-001', 'Walk-in', 'MEM-0001',
   'Regular Customer', 'Active', 'Standard', 'Zone 1', 0, 'vijay@example.com', null, null, null, null, null, null, null, null, 'PLATINUM ELITE', 1500.00),
  ('CUST-0002', 'Pooja Sharma', '9876543211', 'Gandhi Nagar', 'Vellore', '632006',
   'On-Call', 'sms', 'en', false, 'Pickup requested', 2.0, null, 'Google', null,
   'Regular Customer', 'Active', 'Standard', 'Zone 2', 0, 'pooja@example.com', '9876543212', null, null, '1998-07-12', '2026-02-14', 'Birthday', '1998-07-12', 'Prefers morning pickup', 'GOLD', 850.00),
  ('CUST-0003', 'Arun Prakash', '9876543213', 'Katpadi', 'Vellore', '632007',
   'Walk-In', 'none', 'en', true, 'Do not send promotional messages', 0.0, null, 'Referral', 'MEM-0003',
   'VIP Customer', 'Active', 'Premium', 'Zone 1', 0, 'arun@example.com', null, null, null, null, null, null, null, 'VIP customer', 'PLATINUM ELITE', 3200.00),
  ('CUST-0004', 'Lakshmi Devi', '9876543214', 'Sathuvachari', 'Vellore', '632009',
   'On-Call', 'phone', 'ta', false, 'Call before delivery', 3.0, 'REF-004', 'WhatsApp', null,
   'Regular Customer', 'Active', 'Standard', 'Zone 2', 0, 'lakshmi@example.com', null, null, null, null, null, null, null, 'Evening delivery preferred', 'SILVER', 420.00),
  ('CUST-0005', 'Ramesh Enterprises', '9876543215', 'New Bypass Road', 'Vellore', '632004',
   'On-Call', 'email', 'en', false, 'Corporate account', 10.0, null, 'Advertisement', 'MEM-0005',
   'Corporate Customer', 'Active', 'Corporate', 'Zone 3', 25000.00, 'accounts@example.com', null, '33ABCDE1234F1Z5', 'Ramesh Enterprises', null, null, null, null, 'Credit limit requires authorized approval', 'CORPORATE', 0.00),
  ('CUST-0006', 'Divya Suresh', '9876543216', 'Bagayam', 'Vellore', '632002',
   'Walk-In', 'whatsapp', 'te', false, 'New customer', 0.0, null, 'Social media', null,
   'Regular Customer', 'Active', 'Standard', 'Zone 1', 0, 'divya@example.com', null, null, null, null, null, null, null, 'First visit promo applied', 'SILVER', 0.00),
  ('CUST-0007', 'Suresh Babu', '9876543217', 'Thorapadi', 'Vellore', '632002',
   'On-Call', 'sms', 'ta', false, 'Prefers weekend delivery', 0.0, 'REF-007', 'Walk-in', null,
   'Regular Customer', 'Active', 'Standard', 'Zone 2', 0, 'suresh@example.com', null, null, null, null, null, null, null, 'Weekend orders only', 'SILVER', 150.00),
  ('CUST-0008', 'Meena Raj', '9876543218', 'Otteri', 'Vellore', '632002',
   'Walk-In', 'whatsapp', 'ta', false, 'Staff discount eligible', 5.0, null, 'Referral', 'MEM-0008',
   'VIP Customer', 'Active', 'Premium', 'Zone 1', 0, 'meena@example.com', null, null, null, null, null, null, null, 'Express service preferred', 'GOLD', 1100.00),
  ('CUST-0009', 'Karthik Rajan', '9876543219', 'Saidapet', 'Vellore', '632012',
   'On-Call', 'phone', 'ta', false, 'Door delivery required', 0.0, null, 'Google', null,
   'Regular Customer', 'Active', 'Standard', 'Zone 3', 0, 'karthik@example.com', '9876543221', null, null, null, null, null, null, 'Call before coming', 'SILVER', 0.00),
  ('CUST-0010', 'Priya Natarajan', '9876543220', 'Shenbakkam', 'Vellore', '632008',
   'Walk-In', 'whatsapp', 'en', false, 'Loyalty member', 7.5, 'REF-010', 'WhatsApp', 'MEM-0010',
   'VIP Customer', 'Active', 'Premium', 'Zone 1', 0, 'priya@example.com', null, null, null, '1995-11-20', '2025-05-18', 'Anniversary', '2025-05-18', 'Handle silk garments with care', 'PLATINUM ELITE', 2450.00)
on conflict (mobile_number) do nothing;

insert into public.orders (
  order_number, customer_id, order_type, status, total_amount
)
select 'WD-112016', id, 'walk-in', 'Laundry In Progress', 450.00
from public.customers where mobile_number = '9876543210'
on conflict (order_number) do nothing;

insert into public.orders (
  order_number, customer_id, order_type, status, total_amount
)
select 'WD-112015', id, 'on-call', 'Laundry In Progress', 740.00
from public.customers where mobile_number = '9876543211'
on conflict (order_number) do nothing;

insert into public.orders (
  order_number, customer_id, order_type, status, total_amount
)
select 'WD-112013', id, 'walk-in', 'Ready', 378.00
from public.customers where mobile_number = '9876543213'
on conflict (order_number) do nothing;

insert into public.orders (
  order_number, customer_id, order_type, status, total_amount
)
select 'WD-112014', id, 'on-call', 'Ready', 147.00
from public.customers where mobile_number = '9876543214'
on conflict (order_number) do nothing;

insert into public.orders (
  order_number, customer_id, order_type, status, total_amount
)
select 'WD-112012', id, 'on-call', 'In Part', 1850.00
from public.customers where mobile_number = '9876543215'
on conflict (order_number) do nothing;
