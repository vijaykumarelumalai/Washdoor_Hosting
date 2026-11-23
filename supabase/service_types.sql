-- ==============================================================================
-- WASHDOOR ORDERS v2: Service Type Master (Order Details tab)
-- Run directly in Supabase SQL Editor (Dashboard -> SQL Editor -> New Query).
-- Stores the dynamic service types created/edited/deleted from the
-- Orders v2 -> Order Details tab. Existing modules are untouched.
-- ==============================================================================

-- 1. Master table
CREATE TABLE IF NOT EXISTS public.washdoor_service_types (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_name  VARCHAR(80) NOT NULL,
  icon_type     VARCHAR(40) NOT NULL DEFAULT 'custom',
  is_default    BOOLEAN NOT NULL DEFAULT FALSE,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Case-insensitive uniqueness keeps "Dry Cleaning" and "dry cleaning" as one type
CREATE UNIQUE INDEX IF NOT EXISTS washdoor_service_types_name_key
  ON public.washdoor_service_types (lower(service_name));
CREATE INDEX IF NOT EXISTS washdoor_service_types_active_order_idx
  ON public.washdoor_service_types (is_active, display_order, service_name);

-- 2. updated_at trigger
CREATE OR REPLACE FUNCTION public.handle_service_types_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_washdoor_service_types_updated_at ON public.washdoor_service_types;
CREATE TRIGGER trg_washdoor_service_types_updated_at
  BEFORE UPDATE ON public.washdoor_service_types
  FOR EACH ROW EXECUTE FUNCTION public.handle_service_types_updated_at();

-- 3. Seed the built-in service types (idempotent)
INSERT INTO public.washdoor_service_types (service_name, icon_type, is_default, display_order)
VALUES
  ('Laundry', 'laundry', TRUE, 1),
  ('Dry Cleaning', 'dry_cleaning', TRUE, 2),
  ('Washing', 'washing', TRUE, 3),
  ('Shoe Cleaning', 'shoe', TRUE, 4),
  ('Ironing Only', 'iron', TRUE, 5),
  ('Custom Category', 'category', TRUE, 6)
ON CONFLICT (lower(service_name)) DO NOTHING;

-- 4. Row Level Security & Grants (same access model as the other Washdoor masters)
ALTER TABLE public.washdoor_service_types ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "allow_all_read_service_types" ON public.washdoor_service_types;
CREATE POLICY "allow_all_read_service_types" ON public.washdoor_service_types
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "allow_all_insert_service_types" ON public.washdoor_service_types;
CREATE POLICY "allow_all_insert_service_types" ON public.washdoor_service_types
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "allow_all_update_service_types" ON public.washdoor_service_types;
CREATE POLICY "allow_all_update_service_types" ON public.washdoor_service_types
  FOR UPDATE USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "allow_all_delete_service_types" ON public.washdoor_service_types;
CREATE POLICY "allow_all_delete_service_types" ON public.washdoor_service_types
  FOR DELETE USING (true);

GRANT ALL ON public.washdoor_service_types TO anon, authenticated, service_role;

-- 5. Refresh PostgREST schema cache so the API sees the new table immediately
NOTIFY pgrst, 'reload schema';
