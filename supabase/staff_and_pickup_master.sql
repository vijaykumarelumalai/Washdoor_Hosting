-- ==============================================================================
-- WASHDOOR POS: Staff Master & Pickup/Delivery Person Master Migration
-- Run directly in Supabase SQL Editor (Dashboard -> SQL Editor -> New Query)
-- Creates separate master tables with unique IDs, zones, Active/Inactive status,
-- sample seed records, order foreign-key columns, RLS policies, and grants.
-- ==============================================================================

-- 1. Staff Master Table (Counter / Attend Staff)
CREATE TABLE IF NOT EXISTS public.washdoor_staff_master (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id    VARCHAR(30) NOT NULL UNIQUE,
  staff_name  VARCHAR(120) NOT NULL,
  zone        VARCHAR(100) NOT NULL,
  city        VARCHAR(100),
  phone       VARCHAR(20),
  role        VARCHAR(60) DEFAULT 'Counter Staff',
  status      VARCHAR(20) NOT NULL DEFAULT 'Active'
              CHECK (status IN ('Active', 'Inactive')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_washdoor_staff_master_status
  ON public.washdoor_staff_master (status);
CREATE INDEX IF NOT EXISTS idx_washdoor_staff_master_name
  ON public.washdoor_staff_master (staff_name);
CREATE INDEX IF NOT EXISTS idx_washdoor_staff_master_zone
  ON public.washdoor_staff_master (zone);

-- 2. Pickup & Delivery Person Master Table
CREATE TABLE IF NOT EXISTS public.washdoor_pickup_delivery_master (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id    VARCHAR(30) NOT NULL UNIQUE,
  employee_name  VARCHAR(120) NOT NULL,
  zone           VARCHAR(100) NOT NULL,
  city           VARCHAR(100),
  phone          VARCHAR(20),
  vehicle_info   VARCHAR(100),
  status         VARCHAR(20) NOT NULL DEFAULT 'Active'
                 CHECK (status IN ('Active', 'Inactive')),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_washdoor_pickup_delivery_master_status
  ON public.washdoor_pickup_delivery_master (status);
CREATE INDEX IF NOT EXISTS idx_washdoor_pickup_delivery_master_name
  ON public.washdoor_pickup_delivery_master (employee_name);
CREATE INDEX IF NOT EXISTS idx_washdoor_pickup_delivery_master_zone
  ON public.washdoor_pickup_delivery_master (zone);

-- 3. Auto-update updated_at Triggers
CREATE OR REPLACE FUNCTION public.handle_master_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_staff_master_updated_at ON public.washdoor_staff_master;
CREATE TRIGGER trigger_staff_master_updated_at
  BEFORE UPDATE ON public.washdoor_staff_master
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_master_updated_at();

DROP TRIGGER IF EXISTS trigger_pickup_delivery_master_updated_at ON public.washdoor_pickup_delivery_master;
CREATE TRIGGER trigger_pickup_delivery_master_updated_at
  BEFORE UPDATE ON public.washdoor_pickup_delivery_master
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_master_updated_at();

-- 4. Seed Example Staff Master & Pickup/Delivery Master Records
INSERT INTO public.washdoor_staff_master (staff_id, staff_name, zone, status)
VALUES
  ('STF001', 'Sakthi', 'Zone A', 'Active'),
  ('STF002', 'Balaji', 'Zone B', 'Active'),
  ('STF003', 'Kumar', 'Zone A', 'Active')
ON CONFLICT (staff_id) DO NOTHING;

INSERT INTO public.washdoor_pickup_delivery_master (employee_id, employee_name, zone, status)
VALUES
  ('PUD001', 'Ramesh', 'Zone A', 'Active'),
  ('PUD002', 'Venkat', 'Zone B', 'Active')
ON CONFLICT (employee_id) DO NOTHING;

-- 5. Add Unique Staff ID & Pickup/Delivery Person ID Columns to Orders (customer_works)
ALTER TABLE public.customer_works
  ADD COLUMN IF NOT EXISTS attend_staff_id                 VARCHAR(30),
  ADD COLUMN IF NOT EXISTS attend_staff_name               VARCHAR(120),
  ADD COLUMN IF NOT EXISTS assigned_pickup_person_id       VARCHAR(30),
  ADD COLUMN IF NOT EXISTS assigned_pickup_delivery_person VARCHAR(120);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_customer_works_attend_staff'
  ) THEN
    ALTER TABLE public.customer_works
      ADD CONSTRAINT fk_customer_works_attend_staff
      FOREIGN KEY (attend_staff_id)
      REFERENCES public.washdoor_staff_master (staff_id)
      ON UPDATE CASCADE
      ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_customer_works_pickup_person'
  ) THEN
    ALTER TABLE public.customer_works
      ADD CONSTRAINT fk_customer_works_pickup_person
      FOREIGN KEY (assigned_pickup_person_id)
      REFERENCES public.washdoor_pickup_delivery_master (employee_id)
      ON UPDATE CASCADE
      ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_customer_works_attend_staff_id
  ON public.customer_works (attend_staff_id);
CREATE INDEX IF NOT EXISTS idx_customer_works_pickup_person_id
  ON public.customer_works (assigned_pickup_person_id);

-- 6. Safely Add Columns to washdoor_orders_master (if present)
DO $$
BEGIN
  IF to_regclass('public.washdoor_orders_master') IS NOT NULL THEN
    ALTER TABLE public.washdoor_orders_master
      ADD COLUMN IF NOT EXISTS attend_staff_id                 VARCHAR(30),
      ADD COLUMN IF NOT EXISTS attend_staff_name               VARCHAR(120),
      ADD COLUMN IF NOT EXISTS assigned_pickup_person_id       VARCHAR(30),
      ADD COLUMN IF NOT EXISTS assigned_pickup_delivery_person VARCHAR(120);

    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint WHERE conname = 'fk_orders_master_attend_staff'
    ) THEN
      ALTER TABLE public.washdoor_orders_master
        ADD CONSTRAINT fk_orders_master_attend_staff
        FOREIGN KEY (attend_staff_id)
        REFERENCES public.washdoor_staff_master (staff_id)
        ON UPDATE CASCADE
        ON DELETE SET NULL;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint WHERE conname = 'fk_orders_master_pickup_person'
    ) THEN
      ALTER TABLE public.washdoor_orders_master
        ADD CONSTRAINT fk_orders_master_pickup_person
        FOREIGN KEY (assigned_pickup_person_id)
        REFERENCES public.washdoor_pickup_delivery_master (employee_id)
        ON UPDATE CASCADE
        ON DELETE SET NULL;
    END IF;
  END IF;
END $$;

-- 7. Row Level Security (RLS) & Grants for POS Counter Access
ALTER TABLE public.washdoor_staff_master ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.washdoor_pickup_delivery_master ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "allow_all_read_staff_master" ON public.washdoor_staff_master;
CREATE POLICY "allow_all_read_staff_master" ON public.washdoor_staff_master
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "allow_all_insert_staff_master" ON public.washdoor_staff_master;
CREATE POLICY "allow_all_insert_staff_master" ON public.washdoor_staff_master
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "allow_all_update_staff_master" ON public.washdoor_staff_master;
CREATE POLICY "allow_all_update_staff_master" ON public.washdoor_staff_master
  FOR UPDATE USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "allow_all_delete_staff_master" ON public.washdoor_staff_master;
CREATE POLICY "allow_all_delete_staff_master" ON public.washdoor_staff_master
  FOR DELETE USING (true);

DROP POLICY IF EXISTS "allow_all_read_pickup_delivery_master" ON public.washdoor_pickup_delivery_master;
CREATE POLICY "allow_all_read_pickup_delivery_master" ON public.washdoor_pickup_delivery_master
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "allow_all_insert_pickup_delivery_master" ON public.washdoor_pickup_delivery_master;
CREATE POLICY "allow_all_insert_pickup_delivery_master" ON public.washdoor_pickup_delivery_master
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "allow_all_update_pickup_delivery_master" ON public.washdoor_pickup_delivery_master;
CREATE POLICY "allow_all_update_pickup_delivery_master" ON public.washdoor_pickup_delivery_master
  FOR UPDATE USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "allow_all_delete_pickup_delivery_master" ON public.washdoor_pickup_delivery_master;
CREATE POLICY "allow_all_delete_pickup_delivery_master" ON public.washdoor_pickup_delivery_master
  FOR DELETE USING (true);

GRANT ALL ON public.washdoor_staff_master TO anon, authenticated, service_role;
GRANT ALL ON public.washdoor_pickup_delivery_master TO anon, authenticated, service_role;

-- 8. Refresh PostgREST schema cache so API endpoints see new tables & columns immediately
NOTIFY pgrst, 'reload schema';
