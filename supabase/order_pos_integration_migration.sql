-- ==============================================================================
-- WASHDOOR ORDER & POS COMPLETE SUPABASE INTEGRATION MIGRATION
-- Adds missing relational tables & columns for:
--   1. washdoor_factory_orders (Central Plant Transit, Workshop & QC)
--   2. washdoor_pickup_delivery_schedules (Order Pickup/Delivery Slots & Riders)
--   3. washdoor_customer_addresses (Customer Additional Addresses 1-5)
--   4. washdoor_held_orders (POS Counter Parked/Held Orders)
--   5. washdoor_products & washdoor_order_items (DDL parity with live DB)
--   6. notification_templates & notification_logs (Customer Notification Hub)
--   7. Missing columns on customer_works, washdoor_garment_cards, washdoor_garment_photos
--   8. get_next_order_number() RPC + RLS policies + Grants
-- ==============================================================================

-- 1. Sequence & Generator for Factory Order Numbers (FAC00001)
CREATE SEQUENCE IF NOT EXISTS public.seq_washdoor_factory_number START WITH 1 INCREMENT BY 1;
CREATE SEQUENCE IF NOT EXISTS public.seq_washdoor_hold_number START WITH 1 INCREMENT BY 1;

CREATE OR REPLACE FUNCTION public.generate_factory_order_number()
RETURNS TEXT LANGUAGE plpgsql AS $$
BEGIN
  RETURN 'FAC' || LPAD(nextval('public.seq_washdoor_factory_number')::TEXT, 5, '0');
END;
$$;

CREATE OR REPLACE FUNCTION public.generate_hold_order_number()
RETURNS TEXT LANGUAGE plpgsql AS $$
BEGIN
  RETURN 'HLD' || LPAD(nextval('public.seq_washdoor_hold_number')::TEXT, 5, '0');
END;
$$;

-- Compatibility RPC used by frontend getNextOrderId()
CREATE OR REPLACE FUNCTION public.get_next_order_number()
RETURNS TEXT LANGUAGE plpgsql AS $$
DECLARE
  v_last_val BIGINT := 0;
  v_num TEXT;
BEGIN
  SELECT COALESCE(MAX(NULLIF(regexp_replace(work_number, '\D', '', 'g'), '')::BIGINT), 0)
  INTO v_last_val
  FROM public.customer_works;
  v_num := 'ORD' || LPAD((v_last_val + 1)::TEXT, 5, '0');
  RETURN v_num;
END;
$$;

-- ──────────────────────────────────────────────────────────────────────────────
-- 2. ALTER EXISTING TABLES TO ADD MISSING COLUMNS
-- ──────────────────────────────────────────────────────────────────────────────

-- 2.1 customer_works: Tax Exemption, GST Breakdown, Invoice, Flags, Staff Notes, Actor Tracking
ALTER TABLE public.customer_works
  ADD COLUMN IF NOT EXISTS tax_exemption   BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS discount_pct    NUMERIC(5,2) NOT NULL DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS taxable_amount  NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS gst_percentage  NUMERIC(5,2) NOT NULL DEFAULT 5.00,
  ADD COLUMN IF NOT EXISTS cgst_amount     NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS sgst_amount     NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS igst_amount     NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS refund_amount   NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS invoice_number  VARCHAR(40),
  ADD COLUMN IF NOT EXISTS invoice_date    TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS handling_flags  JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS staff_notes     TEXT,
  ADD COLUMN IF NOT EXISTS created_by      UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS updated_by      UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS created_by_name VARCHAR(100) DEFAULT 'POS Counter',
  ADD COLUMN IF NOT EXISTS updated_by_name VARCHAR(100) DEFAULT 'POS Counter';

-- 2.2 washdoor_garment_cards: Make, Stains, Damage, Finish, Size, Assigned Staff, QC & Customer Ack
ALTER TABLE public.washdoor_garment_cards
  ADD COLUMN IF NOT EXISTS make               VARCHAR(100),
  ADD COLUMN IF NOT EXISTS stains             TEXT,
  ADD COLUMN IF NOT EXISTS damage             TEXT,
  ADD COLUMN IF NOT EXISTS finish_preference  VARCHAR(50) DEFAULT 'Standard Fold',
  ADD COLUMN IF NOT EXISTS size               VARCHAR(30),
  ADD COLUMN IF NOT EXISTS assigned_staff     VARCHAR(100),
  ADD COLUMN IF NOT EXISTS qc_passed          BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS customer_ack       BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS customer_ack_at    TIMESTAMPTZ;

ALTER TABLE public.washdoor_order_items
  ADD COLUMN IF NOT EXISTS work_id UUID REFERENCES public.customer_works(work_id) ON DELETE CASCADE;

-- 2.3 washdoor_garment_photos: Metadata, Storage Bucket & Customer Visibility
ALTER TABLE public.washdoor_garment_photos
  ADD COLUMN IF NOT EXISTS work_number         VARCHAR(30),
  ADD COLUMN IF NOT EXISTS inspection_id       UUID,
  ADD COLUMN IF NOT EXISTS storage_bucket      VARCHAR(100) DEFAULT 'washdoor-garment-photos',
  ADD COLUMN IF NOT EXISTS file_name           VARCHAR(255),
  ADD COLUMN IF NOT EXISTS file_size_kb        INTEGER,
  ADD COLUMN IF NOT EXISTS mime_type           VARCHAR(100),
  ADD COLUMN IF NOT EXISTS is_customer_visible BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS annotation_data     JSONB DEFAULT '{}'::jsonb;

-- ──────────────────────────────────────────────────────────────────────────────
-- 3. NEW DEDICATED TABLES FOR ORDER & POS INTEGRATION
-- ──────────────────────────────────────────────────────────────────────────────

-- 3.1 Factory Orders (Central Plant Transit, Workshop Station & QC)
CREATE TABLE IF NOT EXISTS public.washdoor_factory_orders (
  factory_order_id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  factory_order_number  VARCHAR(30) UNIQUE NOT NULL DEFAULT public.generate_factory_order_number(),
  work_id               UUID NOT NULL UNIQUE REFERENCES public.customer_works(work_id) ON DELETE CASCADE,
  work_number           VARCHAR(30) NOT NULL,
  routing_type          VARCHAR(20) NOT NULL DEFAULT 'factory' CHECK (routing_type IN ('factory', 'in_store')),
  store_outlet          VARCHAR(150),
  factory_outlet        VARCHAR(150),
  factory_hub           VARCHAR(150),
  workshop_station      VARCHAR(150),
  factory_manifest_no   VARCHAR(60),
  dispatch_bag_tag      VARCHAR(60),
  factory_supervisor    VARCHAR(100),
  collected_by_staff    VARCHAR(100),
  assigned_driver       VARCHAR(100),
  driver_phone          VARCHAR(20),
  vehicle_name          VARCHAR(100),
  mode_of_transport     VARCHAR(50),
  route_from_to         TEXT,
  route_return          TEXT,
  weight_kg             NUMERIC(6,2),
  factory_gate_in       VARCHAR(60),
  factory_gate_out      VARCHAR(60),
  plant_transit_status  VARCHAR(80),
  logistics_status      VARCHAR(60),
  assigned_machine      VARCHAR(100),
  qc_inspector          VARCHAR(100),
  rack_shelf_location   VARCHAR(50),
  driver_instructions   TEXT,
  factory_remarks       TEXT,
  created_by            UUID REFERENCES auth.users(id),
  updated_by            UUID REFERENCES auth.users(id),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_factory_orders_work_id ON public.washdoor_factory_orders(work_id);
CREATE INDEX IF NOT EXISTS idx_factory_orders_work_num ON public.washdoor_factory_orders(work_number);

-- 3.2 Pickup & Delivery Schedules (Counter-friendly, no auth.users FK required on driver)
CREATE TABLE IF NOT EXISTS public.washdoor_pickup_delivery_schedules (
  schedule_id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  work_id               UUID NOT NULL REFERENCES public.customer_works(work_id) ON DELETE CASCADE,
  work_number           VARCHAR(30) NOT NULL,
  schedule_type         VARCHAR(20) NOT NULL DEFAULT 'Pickup' CHECK (schedule_type IN ('Pickup', 'Delivery')),
  scheduled_date        DATE NOT NULL DEFAULT CURRENT_DATE,
  slot_label            VARCHAR(80) NOT NULL DEFAULT 'Morning (09:00 AM - 12:00 PM)',
  pickup_time_display   VARCHAR(80),
  delivery_slot_display VARCHAR(80),
  assigned_driver_name  VARCHAR(120),
  assigned_driver_full  VARCHAR(200),
  driver_phone          VARCHAR(20),
  vehicle_number        VARCHAR(50),
  route_zone            VARCHAR(100),
  address_text          TEXT,
  landmark              TEXT,
  status                VARCHAR(30) NOT NULL DEFAULT 'Scheduled',
  notes                 TEXT,
  created_by            UUID REFERENCES auth.users(id),
  updated_by            UUID REFERENCES auth.users(id),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pickup_delivery_work_id ON public.washdoor_pickup_delivery_schedules(work_id);

-- 3.3 Customer Additional Addresses (Normalized 1-5 addresses per customer)
CREATE TABLE IF NOT EXISTS public.washdoor_customer_addresses (
  address_id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id           VARCHAR(50) NOT NULL,
  address_label         VARCHAR(30) DEFAULT 'Additional',
  address_line          TEXT NOT NULL,
  city                  VARCHAR(100),
  pincode               VARCHAR(6),
  map_link              TEXT,
  alternate_phone       VARCHAR(15),
  email                 VARCHAR(255),
  is_default            BOOLEAN NOT NULL DEFAULT FALSE,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_customer_addresses_cust_id ON public.washdoor_customer_addresses(customer_id);

-- 3.4 POS Held / Parked Orders
CREATE TABLE IF NOT EXISTS public.washdoor_held_orders (
  hold_id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hold_number           VARCHAR(30) UNIQUE NOT NULL DEFAULT public.generate_hold_order_number(),
  customer_id           VARCHAR(50),
  customer_name         VARCHAR(150),
  mobile_number         VARCHAR(15),
  cart_items            JSONB NOT NULL DEFAULT '[]'::jsonb,
  subtotal              NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  tax_amount            NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  total_amount          NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  special_notes         TEXT,
  held_by               VARCHAR(100) DEFAULT 'Store Staff',
  status                VARCHAR(20) NOT NULL DEFAULT 'Held' CHECK (status IN ('Held', 'Resumed', 'Cancelled')),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3.5 Products Catalog & Order Items (Schema parity with live DB)
CREATE TABLE IF NOT EXISTS public.washdoor_products (
  product_id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_code             VARCHAR(40) UNIQUE NOT NULL,
  name                  VARCHAR(150) NOT NULL,
  category              VARCHAR(60) NOT NULL DEFAULT 'General',
  secondary_category    VARCHAR(60),
  base_price            NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  iron_price            NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  wash_price            NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  dry_clean_price       NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  unit                  VARCHAR(30) NOT NULL DEFAULT 'piece',
  is_active             BOOLEAN NOT NULL DEFAULT TRUE,
  display_order         INTEGER NOT NULL DEFAULT 99,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.washdoor_order_items (
  item_id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number          VARCHAR(30) NOT NULL,
  work_id               UUID REFERENCES public.customer_works(work_id) ON DELETE CASCADE,
  product_id            VARCHAR(80),
  product_name          VARCHAR(150) NOT NULL,
  service_type          VARCHAR(60) NOT NULL DEFAULT 'Ironing',
  rate                  NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  quantity              INTEGER NOT NULL DEFAULT 1,
  line_amount           NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  care_instructions     TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_order_items_order_num ON public.washdoor_order_items(order_number);

-- 3.6 Notification Templates & Logs (Customer Notification Hub)
CREATE TABLE IF NOT EXISTS public.notification_templates (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_name         TEXT NOT NULL,
  category              TEXT NOT NULL,
  channel               TEXT NOT NULL,
  subject               TEXT,
  message_body          TEXT NOT NULL,
  supported_variables   JSONB DEFAULT '[]'::jsonb,
  is_active             BOOLEAN DEFAULT TRUE,
  is_default            BOOLEAN DEFAULT FALSE,
  version               INTEGER DEFAULT 1,
  created_by            UUID,
  updated_by            UUID,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW(),
  deleted_at            TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.notification_logs (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id              TEXT,
  customer_id           TEXT,
  template_id           TEXT,
  event_type            TEXT NOT NULL,
  channel               TEXT NOT NULL,
  recipient             TEXT,
  rendered_subject      TEXT,
  rendered_message      TEXT,
  provider              TEXT,
  provider_message_id   TEXT,
  status                TEXT NOT NULL DEFAULT 'Delivered',
  error_message         TEXT,
  retry_count           INTEGER DEFAULT 0,
  idempotency_key       TEXT UNIQUE,
  triggered_at          TIMESTAMPTZ DEFAULT NOW(),
  sent_at               TIMESTAMPTZ,
  delivered_at          TIMESTAMPTZ,
  created_at            TIMESTAMPTZ DEFAULT NOW()
);

-- ──────────────────────────────────────────────────────────────────────────────
-- 4. ROW LEVEL SECURITY (RLS) & GRANTS
-- ──────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.washdoor_factory_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.washdoor_pickup_delivery_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.washdoor_customer_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.washdoor_held_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.washdoor_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.washdoor_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "allow_all_counter_factory_orders" ON public.washdoor_factory_orders;
CREATE POLICY "allow_all_counter_factory_orders" ON public.washdoor_factory_orders FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "allow_all_counter_pickup_delivery_schedules" ON public.washdoor_pickup_delivery_schedules;
CREATE POLICY "allow_all_counter_pickup_delivery_schedules" ON public.washdoor_pickup_delivery_schedules FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "allow_all_counter_customer_addresses" ON public.washdoor_customer_addresses;
CREATE POLICY "allow_all_counter_customer_addresses" ON public.washdoor_customer_addresses FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "allow_all_counter_held_orders" ON public.washdoor_held_orders;
CREATE POLICY "allow_all_counter_held_orders" ON public.washdoor_held_orders FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "allow_all_counter_products" ON public.washdoor_products;
CREATE POLICY "allow_all_counter_products" ON public.washdoor_products FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "allow_all_counter_order_items" ON public.washdoor_order_items;
CREATE POLICY "allow_all_counter_order_items" ON public.washdoor_order_items FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "allow_all_counter_notification_templates" ON public.notification_templates;
CREATE POLICY "allow_all_counter_notification_templates" ON public.notification_templates FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "allow_all_counter_notification_logs" ON public.notification_logs;
CREATE POLICY "allow_all_counter_notification_logs" ON public.notification_logs FOR ALL USING (true) WITH CHECK (true);

-- Allow counter anon/authenticated uploads & reads in garment photos Storage bucket
DROP POLICY IF EXISTS "allow_all_garment_photos_bucket" ON storage.objects;
CREATE POLICY "allow_all_garment_photos_bucket"
  ON storage.objects
  FOR ALL
  TO anon, authenticated
  USING (bucket_id = 'washdoor-garment-photos')
  WITH CHECK (bucket_id = 'washdoor-garment-photos');

-- Ensure POS counter can write/read audit logs & workflow status history tables
DROP POLICY IF EXISTS "allow_all_counter_audit_logs" ON public.washdoor_audit_logs;
DROP POLICY IF EXISTS "allow_insert_audit_logs" ON public.washdoor_audit_logs;
CREATE POLICY "allow_all_counter_audit_logs" ON public.washdoor_audit_logs
  FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "allow_all_counter_status_history" ON public.washdoor_status_history;
DROP POLICY IF EXISTS "allow_insert_status_history" ON public.washdoor_status_history;
CREATE POLICY "allow_all_counter_status_history" ON public.washdoor_status_history
  FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "allow_all_counter_live_status_actions" ON public.washdoor_live_status_actions;
CREATE POLICY "allow_all_counter_live_status_actions" ON public.washdoor_live_status_actions
  FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.generate_factory_order_number TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.generate_hold_order_number TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_next_order_number TO anon, authenticated, service_role;
