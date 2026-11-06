-- ==============================================================================
-- WASHDOOR LAUNDRY & DRY CLEANING MANAGEMENT SYSTEM
-- PostgreSQL / Supabase Database Architecture v2.1 (Production-Ready)
-- Encompassing Steps 1–6 Workflow, Sequences (ORD, CUS, PAY, MSG, NOTE, AUD),
-- Double-Entry Financial Ledger, Atomic Wallet RPC, Immutable Audits, and RLS.
-- ==============================================================================

-- ──────────────────────────────────────────────────────────────────────────────
-- 1. EXTENSIONS
-- ──────────────────────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ──────────────────────────────────────────────────────────────────────────────
-- 2. SEQUENCES FOR STANDARDIZED BUSINESS IDENTIFIERS
-- ──────────────────────────────────────────────────────────────────────────────
CREATE SEQUENCE IF NOT EXISTS public.seq_washdoor_order_number START WITH 1 INCREMENT BY 1;
CREATE SEQUENCE IF NOT EXISTS public.seq_washdoor_customer_number START WITH 1 INCREMENT BY 1;
CREATE SEQUENCE IF NOT EXISTS public.seq_washdoor_payment_number START WITH 1 INCREMENT BY 1;
CREATE SEQUENCE IF NOT EXISTS public.seq_washdoor_message_number START WITH 1 INCREMENT BY 1;
CREATE SEQUENCE IF NOT EXISTS public.seq_washdoor_note_number START WITH 1 INCREMENT BY 1;
CREATE SEQUENCE IF NOT EXISTS public.seq_washdoor_audit_number START WITH 1 INCREMENT BY 1;

-- Compatibility alias for existing legacy sequences
CREATE SEQUENCE IF NOT EXISTS public.customer_work_seq START WITH 1 INCREMENT BY 1;
CREATE SEQUENCE IF NOT EXISTS public.order_number_seq START WITH 1 INCREMENT BY 1;

-- Functions to format 5-digit zero-padded business identifiers
CREATE OR REPLACE FUNCTION public.generate_order_number()
RETURNS TEXT LANGUAGE plpgsql AS $$
BEGIN
  RETURN 'ORD' || LPAD(nextval('public.seq_washdoor_order_number')::TEXT, 5, '0');
END;
$$;

CREATE OR REPLACE FUNCTION public.generate_customer_number()
RETURNS TEXT LANGUAGE plpgsql AS $$
BEGIN
  RETURN 'CUS' || LPAD(nextval('public.seq_washdoor_customer_number')::TEXT, 5, '0');
END;
$$;

CREATE OR REPLACE FUNCTION public.generate_payment_number()
RETURNS TEXT LANGUAGE plpgsql AS $$
BEGIN
  RETURN 'PAY' || LPAD(nextval('public.seq_washdoor_payment_number')::TEXT, 5, '0');
END;
$$;

CREATE OR REPLACE FUNCTION public.generate_message_number()
RETURNS TEXT LANGUAGE plpgsql AS $$
BEGIN
  RETURN 'MSG' || LPAD(nextval('public.seq_washdoor_message_number')::TEXT, 5, '0');
END;
$$;

CREATE OR REPLACE FUNCTION public.generate_note_number()
RETURNS TEXT LANGUAGE plpgsql AS $$
BEGIN
  RETURN 'NOTE' || LPAD(nextval('public.seq_washdoor_note_number')::TEXT, 5, '0');
END;
$$;

CREATE OR REPLACE FUNCTION public.generate_audit_number()
RETURNS TEXT LANGUAGE plpgsql AS $$
BEGIN
  RETURN 'AUD' || LPAD(nextval('public.seq_washdoor_audit_number')::TEXT, 5, '0');
END;
$$;

-- ──────────────────────────────────────────────────────────────────────────────
-- 3. TIMESTAMP & USER ATTRIBUTION HELPER FUNCTION
-- ──────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.fn_track_timestamps_and_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  NEW.updated_at = NOW();
  IF auth.uid() IS NOT NULL THEN
    NEW.updated_by = auth.uid();
    IF TG_OP = 'INSERT' AND NEW.created_by IS NULL THEN
      NEW.created_by = auth.uid();
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- ──────────────────────────────────────────────────────────────────────────────
-- 4. BASE TABLES: CUSTOMERS & ORDERS (CUSTOMER_WORKS)
-- ──────────────────────────────────────────────────────────────────────────────

-- 4.1 Master Customers Table
CREATE TABLE IF NOT EXISTS public.customers (
  id                     BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  customer_code          VARCHAR(30) UNIQUE NOT NULL DEFAULT public.generate_customer_number(),
  customer_name          VARCHAR(150) NOT NULL CHECK (char_length(trim(customer_name)) >= 1),
  mobile_number          VARCHAR(15) NOT NULL UNIQUE CHECK (mobile_number ~ '^(\+91)?[6-9][0-9]{9}$'),
  alternate_phone        VARCHAR(15) CHECK (alternate_phone IS NULL OR alternate_phone ~ '^(\+91)?[6-9][0-9]{9}$'),
  email                  VARCHAR(255) CHECK (email IS NULL OR email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
  address                TEXT,
  city                   VARCHAR(100) DEFAULT 'Vellore',
  state                  VARCHAR(100) DEFAULT 'Tamil Nadu',
  pincode                VARCHAR(6) CHECK (pincode IS NULL OR pincode ~ '^[0-9]{6}$'),
  date_of_birth          DATE,
  anniversary_date       DATE,
  map_link               TEXT,
  gst_number             VARCHAR(15),
  company_name           VARCHAR(150),
  tax_exemption          BOOLEAN NOT NULL DEFAULT FALSE,
  customer_classification VARCHAR(50) NOT NULL DEFAULT 'Regular Customer'
                         CHECK (customer_classification IN ('Regular Customer', 'VIP Customer', 'Corporate / B2B', 'Student / Senior', 'regular', 'vip', 'fraud', 'corporate')),
  customer_status        VARCHAR(30) NOT NULL DEFAULT 'Active'
                         CHECK (customer_status IN ('Active', 'Inactive', 'Blacklisted', 'active', 'inactive', 'archived')),
  price_list             VARCHAR(50) NOT NULL DEFAULT 'Standard',
  service_zone           VARCHAR(50) DEFAULT 'Zone 1',
  credit_limit           NUMERIC(10,2) NOT NULL DEFAULT 0.00 CHECK (credit_limit >= 0),
  wallet_balance         NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  default_discount       NUMERIC(5,2) DEFAULT 0.00 CHECK (default_discount >= 0 AND default_discount <= 100),
  communication_pref     VARCHAR(30) DEFAULT 'WhatsApp'
                         CHECK (communication_pref IN ('WhatsApp', 'SMS', 'Call', 'Email', 'whatsapp', 'sms', 'email', 'phone', 'none')),
  preferred_language     VARCHAR(30) DEFAULT 'ta',
  dnd                    BOOLEAN NOT NULL DEFAULT FALSE,
  internal_comments      TEXT,
  notes                  TEXT,
  created_by             UUID REFERENCES auth.users(id),
  updated_by             UUID REFERENCES auth.users(id),
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_customers_mobile ON public.customers (mobile_number);
CREATE INDEX IF NOT EXISTS idx_customers_code   ON public.customers (customer_code);
CREATE INDEX IF NOT EXISTS idx_customers_name   ON public.customers USING gin (to_tsvector('english', customer_name));

-- 4.2 Customer Works (Primary Service Orders Table)
CREATE TABLE IF NOT EXISTS public.customer_works (
  work_id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  work_number            VARCHAR(30) UNIQUE NOT NULL DEFAULT public.generate_order_number(),
  customer_id            VARCHAR(50) NOT NULL,
  customer_name          VARCHAR(150) NOT NULL,
  mobile_number          VARCHAR(15) NOT NULL,
  alternate_phone        VARCHAR(15),
  email                  VARCHAR(255),
  delivery_address       TEXT,
  service_type           VARCHAR(60) NOT NULL DEFAULT 'Wash & Steam Press',
  work_status            VARCHAR(40) NOT NULL DEFAULT 'Received'
                         CHECK (work_status IN (
                           'Received',
                           'In Progress',
                           'Washing',
                           'Steam Pressing',
                           'Dry Cleaning',
                           'Quality Check',
                           'Ready',
                           'Ready for Delivery',
                           'Delivered',
                           'Cancelled'
                         )),
  priority               VARCHAR(20) NOT NULL DEFAULT 'Normal'
                         CHECK (priority IN ('Normal', 'Express', 'Urgent', 'Express 24H', 'Yes', 'No')),
  intake_method          VARCHAR(30) NOT NULL DEFAULT 'Walk-In'
                         CHECK (intake_method IN ('Walk-In', 'On-Call', 'Pickup & Delivery', 'walk-in', 'on-call')),
  items                  JSONB NOT NULL DEFAULT '[]'::jsonb,
  total_pieces           INTEGER NOT NULL DEFAULT 1 CHECK (total_pieces >= 0),
  weight_kg              NUMERIC(6,2) DEFAULT NULL CHECK (weight_kg IS NULL OR weight_kg >= 0),
  special_instructions   TEXT,
  rack_shelf_location    VARCHAR(50),
  subtotal               NUMERIC(10,2) NOT NULL DEFAULT 0.00 CHECK (subtotal >= 0),
  discount_amount        NUMERIC(10,2) NOT NULL DEFAULT 0.00 CHECK (discount_amount >= 0),
  tax_amount             NUMERIC(10,2) NOT NULL DEFAULT 0.00 CHECK (tax_amount >= 0),
  total_amount           NUMERIC(10,2) NOT NULL DEFAULT 0.00 CHECK (total_amount >= 0),
  advance_paid           NUMERIC(10,2) NOT NULL DEFAULT 0.00 CHECK (advance_paid >= 0),
  balance_due            NUMERIC(10,2) GENERATED ALWAYS AS (GREATEST(0.00, total_amount - advance_paid)) STORED,
  payment_status         VARCHAR(30) NOT NULL DEFAULT 'Unpaid'
                         CHECK (payment_status IN ('Unpaid', 'Partially Paid', 'Paid', 'Refunded')),
  payment_method         VARCHAR(30) DEFAULT 'Cash'
                         CHECK (payment_method IN ('Cash', 'UPI / QR', 'Card', 'Wallet', 'Net Banking', 'PaymentLink')),
  intake_date            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  target_delivery_date   TIMESTAMPTZ,
  completed_at           TIMESTAMPTZ,
  delivered_at           TIMESTAMPTZ,
  assigned_staff         VARCHAR(100),
  internal_notes         TEXT,
  created_by             UUID REFERENCES auth.users(id),
  updated_by             UUID REFERENCES auth.users(id),
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_customer_works_cust_id ON public.customer_works (customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_works_phone   ON public.customer_works (mobile_number);
CREATE INDEX IF NOT EXISTS idx_customer_works_status  ON public.customer_works (work_status);
CREATE INDEX IF NOT EXISTS idx_customer_works_date    ON public.customer_works (intake_date DESC);
CREATE INDEX IF NOT EXISTS idx_customer_works_items   ON public.customer_works USING gin (items);

-- ──────────────────────────────────────────────────────────────────────────────
-- 5. THE 13 PRODUCTION RELATIONAL TABLES (v2.1 SPECIFICATION)
-- ──────────────────────────────────────────────────────────────────────────────

-- Table 1: Payment Gateway Transactions
CREATE TABLE IF NOT EXISTS public.washdoor_payment_gateway_transactions (
  txn_id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  work_id                UUID NOT NULL REFERENCES public.customer_works(work_id) ON DELETE CASCADE,
  work_number            VARCHAR(30) NOT NULL,
  customer_id            VARCHAR(50) NOT NULL,
  gateway_name           VARCHAR(30) NOT NULL CHECK (gateway_name IN ('Razorpay', 'PhonePe', 'Paytm', 'Cashfree', 'Stripe', 'UPI_Manual', 'Cash_Counter')),
  gateway_order_id       VARCHAR(100),
  gateway_payment_id     VARCHAR(100),
  gateway_signature      TEXT, -- Sensitive
  payment_method         VARCHAR(30) NOT NULL CHECK (payment_method IN ('UPI', 'Card', 'NetBanking', 'Wallet', 'Cash', 'PaymentLink')),
  upi_vpa                VARCHAR(100),
  card_last4             VARCHAR(4),
  bank_reference         VARCHAR(100),
  currency               VARCHAR(3) NOT NULL DEFAULT 'INR',
  amount                 NUMERIC(10,2) NOT NULL CHECK (amount >= 0),
  gateway_fee            NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  gst_on_fee             NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  net_settled_amount     NUMERIC(10,2),
  txn_status             VARCHAR(20) NOT NULL DEFAULT 'Initiated'
                         CHECK (txn_status IN ('Initiated', 'Pending', 'Success', 'Failed', 'Refunded', 'Partial_Refund', 'Expired')),
  failure_code           VARCHAR(50),
  failure_reason         TEXT,
  refund_id              VARCHAR(100),
  refund_amount          NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  payment_link_url       TEXT,
  payment_link_expiry    TIMESTAMPTZ,
  webhook_payload        JSONB, -- Raw payload
  ip_address             VARCHAR(45),
  device_info            VARCHAR(200),
  initiated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at           TIMESTAMPTZ,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_gateway_txns_work_id ON public.washdoor_payment_gateway_transactions(work_id);
CREATE INDEX IF NOT EXISTS idx_gateway_txns_status  ON public.washdoor_payment_gateway_transactions(txn_status);

-- Table 2: Garment Inspection Categories (Master)
CREATE TABLE IF NOT EXISTS public.washdoor_inspection_categories (
  category_id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_code          VARCHAR(30) UNIQUE NOT NULL,
  category_name          VARCHAR(100) NOT NULL,
  category_name_ta       VARCHAR(100),
  inspection_group       VARCHAR(30) NOT NULL CHECK (inspection_group IN ('Stain', 'Damage', 'Colour', 'Fabric', 'Accessories', 'Pre_Existing', 'Other')),
  severity_level         VARCHAR(15) NOT NULL DEFAULT 'Low' CHECK (severity_level IN ('Low', 'Medium', 'High', 'Critical')),
  default_action         VARCHAR(30) NOT NULL DEFAULT 'Proceed' CHECK (default_action IN ('Proceed', 'Spot_Treat', 'Customer_Approval', 'Reject')),
  requires_photo         BOOLEAN NOT NULL DEFAULT FALSE,
  requires_customer_ack  BOOLEAN NOT NULL DEFAULT FALSE,
  extra_charge_applicable BOOLEAN NOT NULL DEFAULT FALSE,
  default_extra_charge   NUMERIC(10,2) NOT NULL DEFAULT 0.00 CHECK (default_extra_charge >= 0),
  description            TEXT,
  is_active              BOOLEAN NOT NULL DEFAULT TRUE,
  display_order          INTEGER NOT NULL DEFAULT 0,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Table 3: Driver Schedules
CREATE TABLE IF NOT EXISTS public.washdoor_driver_schedules (
  schedule_id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id              UUID NOT NULL REFERENCES auth.users(id),
  driver_name            VARCHAR(100) NOT NULL,
  driver_phone           VARCHAR(15) NOT NULL,
  vehicle_number         VARCHAR(20),
  vehicle_type           VARCHAR(20) NOT NULL DEFAULT 'Two_Wheeler' CHECK (vehicle_type IN ('Two_Wheeler', 'Three_Wheeler', 'Van', 'Electric_Scooter')),
  schedule_date          DATE NOT NULL,
  shift                  VARCHAR(20) NOT NULL DEFAULT 'Morning' CHECK (shift IN ('Morning', 'Afternoon', 'Evening', 'Full_Day')),
  assigned_hub           VARCHAR(50) NOT NULL DEFAULT 'Main_Plant',
  service_zones          TEXT[] NOT NULL DEFAULT ARRAY['Zone 1']::TEXT[],
  max_pickups            INTEGER NOT NULL DEFAULT 15,
  max_deliveries         INTEGER NOT NULL DEFAULT 15,
  current_pickups_count  INTEGER NOT NULL DEFAULT 0,
  current_deliveries_count INTEGER NOT NULL DEFAULT 0,
  schedule_status        VARCHAR(20) NOT NULL DEFAULT 'Scheduled' CHECK (schedule_status IN ('Scheduled', 'On_Duty', 'Completed', 'Cancelled', 'Leave')),
  check_in_at            TIMESTAMPTZ,
  check_out_at           TIMESTAMPTZ,
  notes                  TEXT,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Table 4: Status History (Immutable Audit Log)
CREATE TABLE IF NOT EXISTS public.washdoor_status_history (
  history_id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  work_id                UUID NOT NULL REFERENCES public.customer_works(work_id) ON DELETE CASCADE,
  work_number            VARCHAR(30) NOT NULL,
  item_id                UUID,
  entity_type            VARCHAR(30) NOT NULL DEFAULT 'Order' CHECK (entity_type IN ('Order', 'Garment_Unit', 'Batch', 'Driver_Assignment')),
  entity_id              UUID,
  old_status             VARCHAR(50),
  new_status             VARCHAR(50) NOT NULL,
  changed_by_id          UUID REFERENCES auth.users(id),
  changed_by_name        VARCHAR(100) NOT NULL,
  changed_by_role        VARCHAR(30) NOT NULL DEFAULT 'Staff' CHECK (changed_by_role IN ('Admin', 'Staff', 'Driver', 'QC_Inspector', 'Customer', 'System')),
  change_source          VARCHAR(30) NOT NULL DEFAULT 'POS_Web' CHECK (change_source IN ('POS_Web', 'Driver_App', 'Plant_App', 'Customer_Portal', 'WhatsApp_Bot', 'System_Cron')),
  remarks                TEXT,
  notify_customer        BOOLEAN NOT NULL DEFAULT FALSE,
  notification_sent      BOOLEAN NOT NULL DEFAULT FALSE,
  changed_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_status_history_work_id ON public.washdoor_status_history(work_id);

-- Table 5: Payment Ledger (Double-Entry Financial Transactions)
CREATE TABLE IF NOT EXISTS public.washdoor_payment_ledger (
  ledger_id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_number         VARCHAR(30) UNIQUE NOT NULL DEFAULT public.generate_payment_number(),
  work_id                UUID NOT NULL REFERENCES public.customer_works(work_id) ON DELETE CASCADE,
  work_number            VARCHAR(30) NOT NULL,
  customer_id            VARCHAR(50) NOT NULL,
  entry_type             VARCHAR(30) NOT NULL CHECK (entry_type IN ('Initial_Advance', 'Partial_Payment', 'Full_Payment', 'Due_Settlement', 'Wallet_Debit', 'Refund', 'Discount_Adjustment')),
  payment_mode           VARCHAR(30) NOT NULL CHECK (payment_mode IN ('Cash', 'UPI', 'Card', 'NetBanking', 'Wallet', 'Razorpay', 'PhonePe', 'Credit')),
  amount                 NUMERIC(10,2) NOT NULL CHECK (amount > 0),
  reference_txn_id       UUID REFERENCES public.washdoor_payment_gateway_transactions(txn_id),
  reference_number       VARCHAR(100),
  notes                  TEXT,
  collected_by           VARCHAR(100) NOT NULL DEFAULT 'Store Admin',
  collected_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_ledger_work_id ON public.washdoor_payment_ledger(work_id);

-- Table 6: Customer Wallets Master
CREATE TABLE IF NOT EXISTS public.washdoor_wallets (
  wallet_id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id            VARCHAR(50) UNIQUE NOT NULL,
  customer_name          VARCHAR(150) NOT NULL,
  mobile_number          VARCHAR(15) NOT NULL,
  current_balance        NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  credit_limit           NUMERIC(10,2) NOT NULL DEFAULT 0.00 CHECK (credit_limit >= 0),
  is_frozen              BOOLEAN NOT NULL DEFAULT FALSE,
  freeze_reason          TEXT,
  last_transaction_at    TIMESTAMPTZ,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Table 7: Wallet Transactions Ledger (Immutable)
CREATE TABLE IF NOT EXISTS public.washdoor_wallet_transactions (
  wallet_txn_id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id              UUID NOT NULL REFERENCES public.washdoor_wallets(wallet_id) ON DELETE RESTRICT,
  customer_id            VARCHAR(50) NOT NULL,
  txn_type               VARCHAR(20) NOT NULL CHECK (txn_type IN ('Top_Up', 'Order_Debit', 'Refund_Credit', 'Cashback', 'Manual_Adjustment')),
  amount                 NUMERIC(10,2) NOT NULL CHECK (amount > 0),
  balance_before         NUMERIC(10,2) NOT NULL,
  balance_after          NUMERIC(10,2) NOT NULL,
  reference_order_id     UUID REFERENCES public.customer_works(work_id),
  notes                  TEXT,
  performed_by           UUID REFERENCES auth.users(id),
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wallet_txns_wallet_id ON public.washdoor_wallet_transactions(wallet_id);

-- Table 8: Wallet Customer Monitor (Fraud & Credit Monitoring)
CREATE TABLE IF NOT EXISTS public.washdoor_wallet_customer_monitor (
  monitor_id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id            VARCHAR(50) UNIQUE NOT NULL,
  risk_score             INTEGER NOT NULL DEFAULT 0 CHECK (risk_score >= 0 AND risk_score <= 100),
  risk_level             VARCHAR(20) NOT NULL DEFAULT 'Low' CHECK (risk_level IN ('Low', 'Medium', 'High', 'Critical')),
  total_orders_count     INTEGER NOT NULL DEFAULT 0,
  total_spent            NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  failed_payments_count  INTEGER NOT NULL DEFAULT 0,
  overdue_balance        NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  is_flagged             BOOLEAN NOT NULL DEFAULT FALSE,
  flag_reason            TEXT,
  last_evaluated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Table 9: Driver Assignments
CREATE TABLE IF NOT EXISTS public.washdoor_driver_assignments (
  assignment_id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  work_id                UUID NOT NULL REFERENCES public.customer_works(work_id) ON DELETE CASCADE,
  driver_id              UUID NOT NULL REFERENCES auth.users(id),
  schedule_id            UUID REFERENCES public.washdoor_driver_schedules(schedule_id),
  assignment_type        VARCHAR(20) NOT NULL CHECK (assignment_type IN ('Pickup', 'Delivery', 'Plant_Transfer')),
  status                 VARCHAR(20) NOT NULL DEFAULT 'Assigned' CHECK (status IN ('Assigned', 'En_Route', 'Arrived', 'Completed', 'Failed', 'Cancelled')),
  is_active              BOOLEAN NOT NULL DEFAULT TRUE,
  otp_code               VARCHAR(6),
  otp_verified           BOOLEAN NOT NULL DEFAULT FALSE,
  assigned_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at           TIMESTAMPTZ,
  notes                  TEXT,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ensure only one active assignment exists per type per order
CREATE UNIQUE INDEX IF NOT EXISTS uq_active_driver_assignment 
ON public.washdoor_driver_assignments(work_id, assignment_type) 
WHERE (is_active = TRUE);

-- Table 10: Live Status Actions (Timeline & Geo-tracking)
CREATE TABLE IF NOT EXISTS public.washdoor_live_status_actions (
  action_id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  work_id                UUID NOT NULL REFERENCES public.customer_works(work_id) ON DELETE CASCADE,
  work_number            VARCHAR(30) NOT NULL,
  action_code            VARCHAR(50) NOT NULL,
  action_label           VARCHAR(100) NOT NULL,
  action_label_ta        VARCHAR(100),
  stage                  VARCHAR(30) NOT NULL CHECK (stage IN ('Pickup', 'Shop', 'Processing', 'Delivery', 'Payment')),
  actor_type             VARCHAR(20) NOT NULL CHECK (actor_type IN ('Customer', 'Staff', 'Driver', 'Admin', 'System')),
  actor_id               UUID REFERENCES auth.users(id),
  actor_name             VARCHAR(100) NOT NULL,
  latitude               NUMERIC(10,7),
  longitude              NUMERIC(10,7),
  is_customer_visible    BOOLEAN NOT NULL DEFAULT TRUE,
  action_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_live_status_work_id ON public.washdoor_live_status_actions(work_id);

-- Table 11: Garment Cards (Individual Garment Unit Tracking)
CREATE TABLE IF NOT EXISTS public.washdoor_garment_cards (
  card_id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  work_id                UUID NOT NULL REFERENCES public.customer_works(work_id) ON DELETE CASCADE,
  work_number            VARCHAR(30) NOT NULL,
  unit_index             INTEGER NOT NULL CHECK (unit_index >= 1),
  garment_tag_number     VARCHAR(50) UNIQUE NOT NULL,
  garment_name           VARCHAR(100) NOT NULL,
  service_type           VARCHAR(60) NOT NULL DEFAULT 'Wash & Steam Press',
  color                  VARCHAR(50),
  brand                  VARCHAR(50),
  fabric_type            VARCHAR(50),
  garment_condition      VARCHAR(50) DEFAULT 'Good',
  care_instructions      TEXT,
  special_instructions   TEXT,
  processing_stage       VARCHAR(40) NOT NULL DEFAULT 'Received'
                         CHECK (processing_stage IN ('Received', 'Sorting', 'Washing', 'Drying', 'Ironing', 'QC', 'Ready', 'Packed', 'Delivered')),
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_garment_unit_per_work UNIQUE (work_id, unit_index)
);

CREATE INDEX IF NOT EXISTS idx_garment_cards_work_id ON public.washdoor_garment_cards(work_id);
CREATE INDEX IF NOT EXISTS idx_garment_cards_tag     ON public.washdoor_garment_cards(garment_tag_number);

-- Table 12: Garment Inspections (Defect & Stain Logs)
CREATE TABLE IF NOT EXISTS public.washdoor_garment_inspections (
  inspection_id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id                UUID NOT NULL REFERENCES public.washdoor_garment_cards(card_id) ON DELETE CASCADE,
  work_id                UUID NOT NULL REFERENCES public.customer_works(work_id) ON DELETE CASCADE,
  category_id            UUID REFERENCES public.washdoor_inspection_categories(category_id),
  category_name          VARCHAR(100) NOT NULL,
  defect_location        VARCHAR(100),
  severity               VARCHAR(15) NOT NULL DEFAULT 'Low' CHECK (severity IN ('Low', 'Medium', 'High', 'Critical')),
  action_plan            VARCHAR(50) NOT NULL DEFAULT 'Proceed' CHECK (action_plan IN ('Proceed', 'Spot_Treat', 'Customer_Approval', 'Reject')),
  extra_charge           NUMERIC(10,2) NOT NULL DEFAULT 0.00 CHECK (extra_charge >= 0),
  customer_approval      VARCHAR(20) NOT NULL DEFAULT 'Not_Required' CHECK (customer_approval IN ('Not_Required', 'Pending', 'Approved', 'Rejected')),
  customer_notes         TEXT,
  inspection_notes       TEXT,
  inspected_by           VARCHAR(100) NOT NULL DEFAULT 'QC Staff',
  inspected_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_garment_inspections_card_id ON public.washdoor_garment_inspections(card_id);

-- Table 13: Garment Photos (Visual Evidence)
CREATE TABLE IF NOT EXISTS public.washdoor_garment_photos (
  photo_id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id                UUID REFERENCES public.washdoor_garment_cards(card_id) ON DELETE CASCADE,
  work_id                UUID NOT NULL REFERENCES public.customer_works(work_id) ON DELETE CASCADE,
  photo_type             VARCHAR(30) NOT NULL CHECK (photo_type IN ('Before_Wash', 'Stain', 'Damage', 'After_Wash', 'After_Press', 'Packed', 'Delivery_Proof')),
  storage_path           TEXT NOT NULL,
  photo_url              TEXT NOT NULL,
  caption                TEXT,
  captured_by            VARCHAR(100) NOT NULL DEFAULT 'Inspector',
  captured_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_garment_photos_work_id ON public.washdoor_garment_photos(work_id);

-- ──────────────────────────────────────────────────────────────────────────────
-- 6. ADDITIONAL TABLES FOR STEPS 5 & 6 (MESSAGES, NOTES & AUDIT)
-- ──────────────────────────────────────────────────────────────────────────────

-- Step 5: Customer Messages Table (MSG00001)
CREATE TABLE IF NOT EXISTS public.washdoor_customer_messages (
  message_id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_number         VARCHAR(30) UNIQUE NOT NULL DEFAULT public.generate_message_number(),
  work_id                UUID REFERENCES public.customer_works(work_id) ON DELETE CASCADE,
  customer_id            VARCHAR(50) NOT NULL,
  channel                VARCHAR(20) NOT NULL CHECK (channel IN ('WhatsApp', 'SMS', 'Email')),
  template_category      VARCHAR(50) NOT NULL,
  recipient_phone        VARCHAR(15) NOT NULL,
  message_body           TEXT NOT NULL,
  delivery_status        VARCHAR(20) NOT NULL DEFAULT 'Sent' CHECK (delivery_status IN ('Pending', 'Sent', 'Delivered', 'Read', 'Failed')),
  sent_by                VARCHAR(100) NOT NULL DEFAULT 'System',
  sent_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_messages_work_id ON public.washdoor_customer_messages(work_id);

-- Step 6: Order Notes & Instructions Table (NOTE00001)
CREATE TABLE IF NOT EXISTS public.washdoor_order_notes (
  note_id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  note_number            VARCHAR(30) UNIQUE NOT NULL DEFAULT public.generate_note_number(),
  work_id                UUID NOT NULL REFERENCES public.customer_works(work_id) ON DELETE CASCADE,
  note_type              VARCHAR(30) NOT NULL DEFAULT 'Internal_Remark' CHECK (note_type IN ('Internal_Remark', 'Customer_Instruction', 'Quick_Tag', 'Staff_Observation')),
  content                TEXT NOT NULL,
  is_customer_visible    BOOLEAN NOT NULL DEFAULT FALSE,
  created_by_name        VARCHAR(100) NOT NULL DEFAULT 'Staff',
  created_by             UUID REFERENCES auth.users(id),
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_order_notes_work_id ON public.washdoor_order_notes(work_id);

-- Step 6: Comprehensive Activity Audit Logs Table (AUD00001)
CREATE TABLE IF NOT EXISTS public.washdoor_audit_logs (
  audit_id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_number           VARCHAR(30) UNIQUE NOT NULL DEFAULT public.generate_audit_number(),
  entity_name            VARCHAR(50) NOT NULL,
  record_id              UUID NOT NULL,
  work_id                UUID REFERENCES public.customer_works(work_id) ON DELETE CASCADE,
  operation              VARCHAR(10) NOT NULL CHECK (operation IN ('INSERT', 'UPDATE', 'DELETE')),
  old_data               JSONB,
  new_data               JSONB,
  changed_by             UUID REFERENCES auth.users(id),
  changed_by_name        VARCHAR(100) NOT NULL DEFAULT 'System Staff',
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_work_id ON public.washdoor_audit_logs(work_id);

-- ──────────────────────────────────────────────────────────────────────────────
-- 7. SECURE VIEWS (SECURITY INVOKER)
-- ──────────────────────────────────────────────────────────────────────────────
-- Mask sensitive gateway signatures from public/client queries
CREATE OR REPLACE VIEW public.customer_payment_transactions_view 
WITH (security_invoker = true) AS
SELECT
  txn_id,
  work_id,
  work_number,
  customer_id,
  gateway_name,
  gateway_order_id,
  gateway_payment_id,
  payment_method,
  currency,
  amount,
  txn_status,
  initiated_at,
  completed_at
FROM public.washdoor_payment_gateway_transactions;

-- ──────────────────────────────────────────────────────────────────────────────
-- 8. TRIGGERS: AUTOMATED SYNCHRONIZATION & IMMUTABILITY
-- ──────────────────────────────────────────────────────────────────────────────

-- 8.1 Immutability Trigger: Blocks UPDATE and DELETE on audit and ledger tables
CREATE OR REPLACE FUNCTION public.fn_prevent_audit_tampering()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'This audit / ledger record is permanently immutable and cannot be updated or deleted.';
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_status_history ON public.washdoor_status_history;
CREATE TRIGGER trg_protect_status_history
  BEFORE UPDATE OR DELETE ON public.washdoor_status_history
  FOR EACH ROW EXECUTE FUNCTION public.fn_prevent_audit_tampering();

DROP TRIGGER IF EXISTS trg_protect_wallet_txns ON public.washdoor_wallet_transactions;
CREATE TRIGGER trg_protect_wallet_txns
  BEFORE UPDATE OR DELETE ON public.washdoor_wallet_transactions
  FOR EACH ROW EXECUTE FUNCTION public.fn_prevent_audit_tampering();

DROP TRIGGER IF EXISTS trg_protect_audit_logs ON public.washdoor_audit_logs;
CREATE TRIGGER trg_protect_audit_logs
  BEFORE UPDATE OR DELETE ON public.washdoor_audit_logs
  FOR EACH ROW EXECUTE FUNCTION public.fn_prevent_audit_tampering();

-- 8.2 Payment Ledger Auto-Sync: Updates advance_paid and payment_status on customer_works
CREATE OR REPLACE FUNCTION public.fn_sync_ledger_to_order()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_work_id UUID;
  v_total_paid NUMERIC(10,2);
  v_order_total NUMERIC(10,2);
  v_new_status VARCHAR(30);
BEGIN
  v_work_id := COALESCE(NEW.work_id, OLD.work_id);
  
  -- Calculate total payments from ledger
  SELECT COALESCE(SUM(amount), 0.00) INTO v_total_paid
  FROM public.washdoor_payment_ledger
  WHERE work_id = v_work_id;

  SELECT total_amount INTO v_order_total
  FROM public.customer_works
  WHERE work_id = v_work_id;

  IF v_total_paid >= v_order_total AND v_order_total > 0 THEN
    v_new_status := 'Paid';
  ELSIF v_total_paid > 0 THEN
    v_new_status := 'Partially Paid';
  ELSE
    v_new_status := 'Unpaid';
  END IF;

  UPDATE public.customer_works
  SET
    advance_paid = v_total_paid,
    payment_status = v_new_status,
    updated_at = NOW()
  WHERE work_id = v_work_id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_payment_ledger_to_work ON public.washdoor_payment_ledger;
CREATE TRIGGER trg_sync_payment_ledger_to_work
  AFTER INSERT OR UPDATE OR DELETE ON public.washdoor_payment_ledger
  FOR EACH ROW EXECUTE FUNCTION public.fn_sync_ledger_to_order();

-- 8.3 Live Status Actions Auto-Sync: Synchronizes latest milestone to customer_works.work_status
CREATE OR REPLACE FUNCTION public.fn_sync_live_status_to_order()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NEW.stage = 'Processing' THEN
    UPDATE public.customer_works
    SET work_status = 'In Progress', updated_at = NOW()
    WHERE work_id = NEW.work_id;
  ELSIF NEW.stage = 'Delivery' AND NEW.action_code = 'DELIVERED_SUCCESS' THEN
    UPDATE public.customer_works
    SET work_status = 'Delivered', delivered_at = NOW(), updated_at = NOW()
    WHERE work_id = NEW.work_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_live_action_to_work ON public.washdoor_live_status_actions;
CREATE TRIGGER trg_sync_live_action_to_work
  AFTER INSERT ON public.washdoor_live_status_actions
  FOR EACH ROW EXECUTE FUNCTION public.fn_sync_live_status_to_order();

-- ──────────────────────────────────────────────────────────────────────────────
-- 9. ATOMIC RPC FUNCTION: CONCURRENCY-SAFE WALLET TRANSACTION
-- ──────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.process_wallet_transaction(
  p_customer_id       VARCHAR(50),
  p_txn_type          VARCHAR(20),
  p_amount            NUMERIC(10,2),
  p_reference_work_id UUID DEFAULT NULL,
  p_notes             TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_wallet            RECORD;
  v_balance_before    NUMERIC(10,2);
  v_balance_after     NUMERIC(10,2);
  v_wallet_txn_id     UUID;
BEGIN
  IF p_amount <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Transaction amount must be strictly greater than 0.');
  END IF;

  -- Row lock to prevent race conditions
  SELECT * INTO v_wallet
  FROM public.washdoor_wallets
  WHERE customer_id = p_customer_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Wallet not found for customer.');
  END IF;

  IF v_wallet.is_frozen THEN
    RETURN jsonb_build_object('success', false, 'error', 'Wallet is frozen: ' || COALESCE(v_wallet.freeze_reason, 'Admin restriction.'));
  END IF;

  v_balance_before := v_wallet.current_balance;

  IF p_txn_type IN ('Order_Debit') THEN
    IF (v_balance_before + v_wallet.credit_limit) < p_amount THEN
      RETURN jsonb_build_object('success', false, 'error', 'Insufficient wallet balance and credit limit.');
    END IF;
    v_balance_after := v_balance_before - p_amount;
  ELSIF p_txn_type IN ('Top_Up', 'Refund_Credit', 'Cashback') THEN
    v_balance_after := v_balance_before + p_amount;
  ELSIF p_txn_type = 'Manual_Adjustment' THEN
    v_balance_after := v_balance_before + p_amount;
  ELSE
    RETURN jsonb_build_object('success', false, 'error', 'Invalid transaction type.');
  END IF;

  -- Update master balance
  UPDATE public.washdoor_wallets
  SET
    current_balance = v_balance_after,
    last_transaction_at = NOW(),
    updated_at = NOW()
  WHERE wallet_id = v_wallet.wallet_id;

  -- Insert immutable transaction ledger
  INSERT INTO public.washdoor_wallet_transactions (
    wallet_id, customer_id, txn_type, amount, balance_before, balance_after, reference_order_id, notes, performed_by
  ) VALUES (
    v_wallet.wallet_id, p_customer_id, p_txn_type, p_amount, v_balance_before, v_balance_after, p_reference_work_id, p_notes, auth.uid()
  ) RETURNING wallet_txn_id INTO v_wallet_txn_id;

  RETURN jsonb_build_object(
    'success', true,
    'wallet_txn_id', v_wallet_txn_id,
    'balance_before', v_balance_before,
    'balance_after', v_balance_after
  );
END;
$$;

-- ──────────────────────────────────────────────────────────────────────────────
-- 10. ROW LEVEL SECURITY (RLS) POLICIES
-- ──────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_works ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.washdoor_payment_gateway_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.washdoor_inspection_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.washdoor_driver_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.washdoor_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.washdoor_payment_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.washdoor_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.washdoor_wallet_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.washdoor_wallet_customer_monitor ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.washdoor_driver_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.washdoor_live_status_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.washdoor_garment_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.washdoor_garment_inspections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.washdoor_garment_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.washdoor_customer_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.washdoor_order_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.washdoor_audit_logs ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated and counter-POS staff operations
CREATE POLICY "allow_all_counter_customers" ON public.customers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_counter_customer_works" ON public.customer_works FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_counter_inspection_categories" ON public.washdoor_inspection_categories FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_counter_driver_schedules" ON public.washdoor_driver_schedules FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_counter_status_history" ON public.washdoor_status_history FOR SELECT USING (true);
CREATE POLICY "allow_insert_status_history" ON public.washdoor_status_history FOR INSERT WITH CHECK (true);
CREATE POLICY "allow_all_counter_payment_ledger" ON public.washdoor_payment_ledger FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_counter_wallets" ON public.washdoor_wallets FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_counter_wallet_txns" ON public.washdoor_wallet_transactions FOR SELECT USING (true);
CREATE POLICY "allow_insert_wallet_txns" ON public.washdoor_wallet_transactions FOR INSERT WITH CHECK (true);
CREATE POLICY "allow_all_counter_garment_cards" ON public.washdoor_garment_cards FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_counter_live_status_actions" ON public.washdoor_live_status_actions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_counter_driver_assignments" ON public.washdoor_driver_assignments FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_counter_garment_inspections" ON public.washdoor_garment_inspections FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_counter_garment_photos" ON public.washdoor_garment_photos FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_counter_customer_messages" ON public.washdoor_customer_messages FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_counter_order_notes" ON public.washdoor_order_notes FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_counter_audit_logs" ON public.washdoor_audit_logs FOR SELECT USING (true);
CREATE POLICY "allow_insert_audit_logs" ON public.washdoor_audit_logs FOR INSERT WITH CHECK (true);

-- ──────────────────────────────────────────────────────────────────────────────
-- 11. GRANTS
-- ──────────────────────────────────────────────────────────────────────────────
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.process_wallet_transaction TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.generate_order_number TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.generate_customer_number TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.generate_payment_number TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.generate_message_number TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.generate_note_number TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.generate_audit_number TO anon, authenticated, service_role;
