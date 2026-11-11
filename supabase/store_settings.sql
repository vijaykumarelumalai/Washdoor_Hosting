-- ==============================================================================
-- WASHDOOR LAUNDRY POS - STORE SETTINGS & BRANDING HISTORY SCHEMA
-- Tracks dynamic Shop Name & Shop Logo, previous values, and exact timestamps
-- ==============================================================================

-- 1. Master Store Settings Table (Current Profile + Previous Snapshot + Timestamps)
CREATE TABLE IF NOT EXISTS public.washdoor_store_settings (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_key              VARCHAR(50) NOT NULL UNIQUE DEFAULT 'default',
  shop_name              VARCHAR(150) NOT NULL DEFAULT 'Washdoor',
  shop_logo              TEXT NOT NULL DEFAULT '',
  shop_tagline           VARCHAR(255) DEFAULT 'Professional Laundry & Dry Cleaning',
  store_branch           VARCHAR(150) DEFAULT 'Ranipet Store #1',
  phone                  VARCHAR(30),
  email                  VARCHAR(255),
  whatsapp_number        VARCHAR(30),
  address                TEXT,
  city                   VARCHAR(100),
  state                  VARCHAR(100),
  pin_code               VARCHAR(10),
  gst_number             VARCHAR(20),
  latitude               NUMERIC(10,6) DEFAULT 12.924900,
  longitude              NUMERIC(10,6) DEFAULT 79.333800,
  settings_json          JSONB NOT NULL DEFAULT '{}'::jsonb,

  -- Previous Branding Details & Timestamps
  previous_shop_name     TEXT DEFAULT '',
  previous_shop_logo     TEXT DEFAULT '',
  shop_name_updated_at   TIMESTAMPTZ DEFAULT NOW(),
  logo_updated_at        TIMESTAMPTZ,
  updated_by             VARCHAR(150) NOT NULL DEFAULT 'Store Administrator',
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_washdoor_store_settings_key
  ON public.washdoor_store_settings (store_key);

-- 2. Immutable Branding History Table (Every Shop Name & Logo Update)
CREATE TABLE IF NOT EXISTS public.washdoor_brand_history (
  history_id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id               UUID REFERENCES public.washdoor_store_settings(id) ON DELETE CASCADE,
  store_key              VARCHAR(50) NOT NULL DEFAULT 'default',
  change_type            VARCHAR(30) NOT NULL
                         CHECK (change_type IN ('INITIAL', 'SHOP_NAME', 'SHOP_LOGO', 'BOTH')),
  previous_shop_name     TEXT,
  new_shop_name          TEXT,
  previous_shop_logo     TEXT,
  new_shop_logo          TEXT,
  changed_fields         JSONB NOT NULL DEFAULT '[]'::jsonb,
  change_summary         TEXT,
  changed_by             VARCHAR(150) NOT NULL DEFAULT 'Store Administrator',
  changed_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_washdoor_brand_history_store_key
  ON public.washdoor_brand_history (store_key, changed_at DESC);

CREATE INDEX IF NOT EXISTS idx_washdoor_brand_history_changed_at
  ON public.washdoor_brand_history (changed_at DESC);

-- 3. BEFORE Trigger: Auto-capture previous shop_name / shop_logo & timestamps
CREATE OR REPLACE FUNCTION public.fn_prepare_store_settings_brand_tracking()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  NEW.updated_at := NOW();

  IF TG_OP = 'INSERT' THEN
    IF NEW.shop_name_updated_at IS NULL THEN
      NEW.shop_name_updated_at := NOW();
    END IF;
    IF COALESCE(NEW.shop_logo, '') <> '' AND NEW.logo_updated_at IS NULL THEN
      NEW.logo_updated_at := NOW();
    END IF;
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF NEW.shop_name IS DISTINCT FROM OLD.shop_name THEN
      NEW.previous_shop_name := OLD.shop_name;
      NEW.shop_name_updated_at := NOW();
    ELSE
      NEW.previous_shop_name := COALESCE(OLD.previous_shop_name, '');
      NEW.shop_name_updated_at := OLD.shop_name_updated_at;
    END IF;

    IF COALESCE(NEW.shop_logo, '') IS DISTINCT FROM COALESCE(OLD.shop_logo, '') THEN
      NEW.previous_shop_logo := COALESCE(OLD.shop_logo, '');
      NEW.logo_updated_at := NOW();
    ELSE
      NEW.previous_shop_logo := COALESCE(OLD.previous_shop_logo, '');
      NEW.logo_updated_at := OLD.logo_updated_at;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prepare_store_settings_brand_tracking ON public.washdoor_store_settings;
CREATE TRIGGER trg_prepare_store_settings_brand_tracking
  BEFORE INSERT OR UPDATE ON public.washdoor_store_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_prepare_store_settings_brand_tracking();

-- 4. AFTER Trigger: Insert immutable history record whenever shop_name or shop_logo changes
CREATE OR REPLACE FUNCTION public.fn_log_store_brand_history()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_name_changed  BOOLEAN := FALSE;
  v_logo_changed  BOOLEAN := FALSE;
  v_change_type   VARCHAR(30);
  v_fields        JSONB := '[]'::jsonb;
  v_summary       TEXT;
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.washdoor_brand_history (
      store_id,
      store_key,
      change_type,
      previous_shop_name,
      new_shop_name,
      previous_shop_logo,
      new_shop_logo,
      changed_fields,
      change_summary,
      changed_by,
      changed_at
    ) VALUES (
      NEW.id,
      NEW.store_key,
      'INITIAL',
      NULL,
      NEW.shop_name,
      NULL,
      NULLIF(NEW.shop_logo, ''),
      '["shop_name", "shop_logo"]'::jsonb,
      'Initial store branding profile created: ' || NEW.shop_name,
      COALESCE(NEW.updated_by, 'Store Administrator'),
      NOW()
    );
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    v_name_changed := (NEW.shop_name IS DISTINCT FROM OLD.shop_name);
    v_logo_changed := (COALESCE(NEW.shop_logo, '') IS DISTINCT FROM COALESCE(OLD.shop_logo, ''));

    IF NOT v_name_changed AND NOT v_logo_changed THEN
      RETURN NEW;
    END IF;

    IF v_name_changed AND v_logo_changed THEN
      v_change_type := 'BOTH';
      v_fields := '["shop_name", "shop_logo"]'::jsonb;
      v_summary := format('Updated shop name from "%s" to "%s" and updated shop logo', OLD.shop_name, NEW.shop_name);
    ELSIF v_name_changed THEN
      v_change_type := 'SHOP_NAME';
      v_fields := '["shop_name"]'::jsonb;
      v_summary := format('Updated shop name from "%s" to "%s"', OLD.shop_name, NEW.shop_name);
    ELSE
      v_change_type := 'SHOP_LOGO';
      v_fields := '["shop_logo"]'::jsonb;
      v_summary := CASE
        WHEN COALESCE(NEW.shop_logo, '') = '' THEN 'Removed custom shop logo (reverted to default icon)'
        WHEN COALESCE(OLD.shop_logo, '') = '' THEN 'Uploaded new custom shop logo'
        ELSE 'Replaced shop logo with a new image'
      END;
    END IF;

    INSERT INTO public.washdoor_brand_history (
      store_id,
      store_key,
      change_type,
      previous_shop_name,
      new_shop_name,
      previous_shop_logo,
      new_shop_logo,
      changed_fields,
      change_summary,
      changed_by,
      changed_at
    ) VALUES (
      NEW.id,
      NEW.store_key,
      v_change_type,
      OLD.shop_name,
      NEW.shop_name,
      NULLIF(OLD.shop_logo, ''),
      NULLIF(NEW.shop_logo, ''),
      v_fields,
      v_summary,
      COALESCE(NEW.updated_by, 'Store Administrator'),
      NOW()
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_store_brand_history ON public.washdoor_store_settings;
CREATE TRIGGER trg_log_store_brand_history
  AFTER INSERT OR UPDATE ON public.washdoor_store_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_log_store_brand_history();

-- 5. Row Level Security (RLS) & Grants (Matching Counter-POS Policies)
ALTER TABLE public.washdoor_store_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.washdoor_brand_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "allow_all_counter_store_settings" ON public.washdoor_store_settings;
CREATE POLICY "allow_all_counter_store_settings"
  ON public.washdoor_store_settings
  FOR ALL
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "allow_select_brand_history" ON public.washdoor_brand_history;
CREATE POLICY "allow_select_brand_history"
  ON public.washdoor_brand_history
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "allow_insert_brand_history" ON public.washdoor_brand_history;
CREATE POLICY "allow_insert_brand_history"
  ON public.washdoor_brand_history
  FOR INSERT
  WITH CHECK (true);

GRANT ALL ON TABLE public.washdoor_store_settings TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.washdoor_brand_history TO anon, authenticated, service_role;

-- 6. Seed Default Store Row (Safe Idempotent Insert)
INSERT INTO public.washdoor_store_settings (
  store_key,
  shop_name,
  shop_logo,
  shop_tagline,
  store_branch,
  phone,
  email,
  whatsapp_number,
  address,
  city,
  state,
  pin_code,
  gst_number,
  updated_by
)
VALUES (
  'default',
  'Washdoor',
  '',
  'Professional Laundry & Dry Cleaning',
  'Ranipet Store #1',
  '+91 7338851369',
  'info@washdoor.in',
  '+91 7338851369',
  'No.7, 4th Avenue, 1st Cross Road, MBT Road',
  'Chennai',
  'Tamil Nadu',
  '632401',
  '33AABCT1332L1Z8',
  'System Seed'
)
ON CONFLICT (store_key) DO NOTHING;

-- ==============================================================================
-- 7. EXAMPLE QUERIES TO VIEW CURRENT & PREVIOUS SHOP NAME / LOGO + TIMESTAMPS
-- ==============================================================================
-- Current active store branding with previous snapshot & timestamps:
-- SELECT
--   store_key,
--   shop_name AS current_shop_name,
--   previous_shop_name,
--   shop_name_updated_at,
--   (shop_logo <> '') AS has_current_logo,
--   (previous_shop_logo <> '') AS has_previous_logo,
--   logo_updated_at,
--   updated_by,
--   updated_at
-- FROM public.washdoor_store_settings
-- WHERE store_key = 'default';
--
-- Full chronological history of all shop name & logo updates:
-- SELECT
--   history_id,
--   change_type,
--   previous_shop_name,
--   new_shop_name,
--   previous_shop_logo,
--   new_shop_logo,
--   change_summary,
--   changed_by,
--   changed_at
-- FROM public.washdoor_brand_history
-- WHERE store_key = 'default'
-- ORDER BY changed_at DESC;
