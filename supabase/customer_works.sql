-- ==============================================================================
-- WASHDOOR POS: Registered Customer Works & Service Orders Table
-- Run directly in Supabase SQL Editor (Dashboard -> SQL Editor -> New Query)
-- ==============================================================================

-- 1. Create Work Order Sequence
CREATE SEQUENCE IF NOT EXISTS public.customer_work_seq START WITH 1 INCREMENT BY 1;

-- 2. Auto-generating work order number function (Format: ORD00001)
CREATE OR REPLACE FUNCTION public.generate_customer_work_number()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  next_val BIGINT;
BEGIN
  next_val := nextval('public.customer_work_seq');
  RETURN 'ORD' || lpad(next_val::TEXT, 5, '0');
END;
$$;

-- 3. Create Table: customer_works
CREATE TABLE IF NOT EXISTS public.customer_works (
  -- Primary Identification
  work_id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  work_number              VARCHAR(30) NOT NULL DEFAULT public.generate_customer_work_number() UNIQUE,

  -- Customer Identification & Contact
  customer_id              VARCHAR(50) NOT NULL,
  customer_name            VARCHAR(150) NOT NULL,
  mobile_number            VARCHAR(15) NOT NULL,
  alternate_phone          VARCHAR(15),
  email                    VARCHAR(255),
  delivery_address         TEXT,

  -- Service & Workflow Status
  service_type             VARCHAR(60) NOT NULL DEFAULT 'Wash & Steam Press',
  work_status              VARCHAR(40) NOT NULL DEFAULT 'Received'
                           CHECK (work_status IN (
                             'Received',
                             'In Progress',
                             'Washing',
                             'Steam Pressing',
                             'Dry Cleaning',
                             'Quality Check',
                             'Ready for Delivery',
                             'Delivered',
                             'Cancelled'
                           )),
  priority                 VARCHAR(20) NOT NULL DEFAULT 'Normal'
                           CHECK (priority IN ('Normal', 'Express 24H', 'Urgent')),
  intake_method            VARCHAR(30) NOT NULL DEFAULT 'Walk-In'
                           CHECK (intake_method IN ('Walk-In', 'On-Call', 'Pickup & Delivery')),

  -- Garment & Work Item Breakdown (JSON array of line items)
  -- Structure: [{ "id": "shirt", "name": "Shirt", "qty": 2, "rate": 15, "amount": 30, "service": "Wash & Steam Press", "notes": "" }]
  items                    JSONB NOT NULL DEFAULT '[]'::jsonb,
  total_pieces             INTEGER NOT NULL DEFAULT 1 CHECK (total_pieces >= 0),
  weight_kg                NUMERIC(6,2) DEFAULT NULL CHECK (weight_kg IS NULL OR weight_kg >= 0),
  special_instructions     TEXT,
  rack_shelf_location      VARCHAR(50), -- Tag storage rack location (e.g., 'Rack B-14')

  -- Commercial & Billing
  subtotal                 NUMERIC(10,2) NOT NULL DEFAULT 0.00 CHECK (subtotal >= 0),
  discount_amount          NUMERIC(10,2) NOT NULL DEFAULT 0.00 CHECK (discount_amount >= 0),
  tax_amount               NUMERIC(10,2) NOT NULL DEFAULT 0.00 CHECK (tax_amount >= 0),
  total_amount             NUMERIC(10,2) NOT NULL DEFAULT 0.00 CHECK (total_amount >= 0),
  advance_paid             NUMERIC(10,2) NOT NULL DEFAULT 0.00 CHECK (advance_paid >= 0),
  balance_due              NUMERIC(10,2) GENERATED ALWAYS AS (GREATEST(0.00, total_amount - advance_paid)) STORED,

  -- Payment Tracking
  payment_status           VARCHAR(30) NOT NULL DEFAULT 'Unpaid'
                           CHECK (payment_status IN ('Unpaid', 'Partially Paid', 'Paid', 'Refunded')),
  payment_method           VARCHAR(30) DEFAULT 'Cash'
                           CHECK (payment_method IN ('Cash', 'UPI / QR', 'Card', 'Wallet', 'Net Banking')),

  -- Schedule & Timestamps
  intake_date              TIMESTAMPTZ NOT NULL DEFAULT now(),
  target_delivery_date     TIMESTAMPTZ,
  completed_at             TIMESTAMPTZ,
  delivered_at             TIMESTAMPTZ,

  -- Staff & Internal Notes
  assigned_staff           VARCHAR(100),
  internal_notes           TEXT,

  created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Fast Lookup Indexes
CREATE INDEX IF NOT EXISTS idx_customer_works_cust_id ON public.customer_works (customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_works_phone   ON public.customer_works (mobile_number);
CREATE INDEX IF NOT EXISTS idx_customer_works_status  ON public.customer_works (work_status);
CREATE INDEX IF NOT EXISTS idx_customer_works_date    ON public.customer_works (intake_date DESC);
CREATE INDEX IF NOT EXISTS idx_customer_works_target  ON public.customer_works (target_delivery_date);
CREATE INDEX IF NOT EXISTS idx_customer_works_items   ON public.customer_works USING gin (items);

-- 5. Auto-update updated_at Trigger
CREATE OR REPLACE FUNCTION public.handle_customer_works_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_customer_works_updated_at ON public.customer_works;
CREATE TRIGGER trigger_customer_works_updated_at
  BEFORE UPDATE ON public.customer_works
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_customer_works_updated_at();

-- 6. Row Level Security (RLS)
ALTER TABLE public.customer_works ENABLE ROW LEVEL SECURITY;

-- Allow read, insert, update, delete for counter apps
DROP POLICY IF EXISTS "allow_all_read_customer_works" ON public.customer_works;
CREATE POLICY "allow_all_read_customer_works" ON public.customer_works
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "allow_all_insert_customer_works" ON public.customer_works;
CREATE POLICY "allow_all_insert_customer_works" ON public.customer_works
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "allow_all_update_customer_works" ON public.customer_works;
CREATE POLICY "allow_all_update_customer_works" ON public.customer_works
  FOR UPDATE USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "allow_all_delete_customer_works" ON public.customer_works;
CREATE POLICY "allow_all_delete_customer_works" ON public.customer_works
  FOR DELETE USING (true);

-- 7. Grant Permissions to anon & authenticated roles
GRANT ALL ON public.customer_works TO anon, authenticated, service_role;
GRANT USAGE, SELECT ON SEQUENCE public.customer_work_seq TO anon, authenticated, service_role;

-- 8. Optional Customer Works Summary View
CREATE OR REPLACE VIEW public.customer_works_summary AS
SELECT
  customer_id,
  customer_name,
  mobile_number,
  COUNT(work_id) AS total_works_count,
  COUNT(work_id) FILTER (WHERE work_status NOT IN ('Delivered', 'Cancelled')) AS active_works_count,
  COALESCE(SUM(total_amount), 0.00) AS total_spent,
  COALESCE(SUM(balance_due), 0.00) AS total_outstanding_balance,
  MAX(intake_date) AS last_work_date
FROM public.customer_works
GROUP BY customer_id, customer_name, mobile_number;

GRANT SELECT ON public.customer_works_summary TO anon, authenticated, service_role;
