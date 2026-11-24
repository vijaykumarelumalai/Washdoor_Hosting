ALTER TABLE public.washdoor_garment_cards
  ADD COLUMN IF NOT EXISTS order_item_id UUID,
  ADD COLUMN IF NOT EXISTS barcode TEXT,
  ADD COLUMN IF NOT EXISTS barcode_format TEXT,
  ADD COLUMN IF NOT EXISTS barcode_order_id VARCHAR(30),
  ADD COLUMN IF NOT EXISTS barcode_generated_at TIMESTAMPTZ;

UPDATE public.washdoor_garment_cards
SET barcode_format = 'CODE128'
WHERE barcode_format IS NULL OR btrim(barcode_format) = '';

ALTER TABLE public.washdoor_garment_cards
  ALTER COLUMN barcode_format SET DEFAULT 'CODE128',
  ALTER COLUMN barcode_format SET NOT NULL;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.washdoor_garment_cards
    GROUP BY work_id, unit_index
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'Duplicate (work_id, unit_index) garment cards exist. Resolve them before running the barcode migration.';
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS uq_washdoor_garment_cards_work_unit
ON public.washdoor_garment_cards (work_id, unit_index);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'fk_washdoor_garment_cards_order_item'
      AND conrelid = 'public.washdoor_garment_cards'::regclass
  ) THEN
    ALTER TABLE public.washdoor_garment_cards
      ADD CONSTRAINT fk_washdoor_garment_cards_order_item
      FOREIGN KEY (order_item_id)
      REFERENCES public.washdoor_order_items (item_id)
      ON DELETE SET NULL;
  END IF;
END $$;

WITH ranked_items AS (
  SELECT
    oi.item_id,
    oi.work_id,
    coalesce(
      sum(greatest(coalesce(oi.quantity, 1), 1)) OVER (
        PARTITION BY oi.work_id
        ORDER BY oi.created_at, oi.item_id
        ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING
      ),
      0
    ) AS start_index,
    sum(greatest(coalesce(oi.quantity, 1), 1)) OVER (
      PARTITION BY oi.work_id
      ORDER BY oi.created_at, oi.item_id
      ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
    ) AS end_index
  FROM public.washdoor_order_items oi
)
UPDATE public.washdoor_garment_cards gc
SET order_item_id = ri.item_id
FROM ranked_items ri
WHERE gc.work_id = ri.work_id
  AND gc.order_item_id IS NULL
  AND gc.unit_index > ri.start_index
  AND gc.unit_index <= ri.end_index;

WITH ranked_items AS (
  SELECT
    oi.item_id,
    oi.work_id,
    oi.product_name,
    oi.service_type,
    coalesce(
      sum(greatest(coalesce(oi.quantity, 1), 1)) OVER (
        PARTITION BY oi.work_id
        ORDER BY oi.created_at, oi.item_id
        ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING
      ),
      0
    ) AS start_index,
    sum(greatest(coalesce(oi.quantity, 1), 1)) OVER (
      PARTITION BY oi.work_id
      ORDER BY oi.created_at, oi.item_id
      ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
    ) AS end_index
  FROM public.washdoor_order_items oi
),
missing_cards AS (
  SELECT
    c.work_id,
    c.work_number,
    ri.item_id,
    ri.product_name,
    ri.service_type,
    (ri.start_index + gs.n)::int AS unit_index
  FROM ranked_items ri
  JOIN public.customer_works c ON c.work_id = ri.work_id
  CROSS JOIN generate_series(1, (ri.end_index - ri.start_index)::int) AS gs(n)
  WHERE NOT EXISTS (
    SELECT 1
    FROM public.washdoor_garment_cards gc
    WHERE gc.work_id = ri.work_id
      AND gc.unit_index = ri.start_index + gs.n
  )
)
INSERT INTO public.washdoor_garment_cards (
  work_id,
  work_number,
  unit_index,
  order_item_id,
  garment_name,
  service_type,
  barcode_format,
  barcode_order_id
)
SELECT
  mc.work_id,
  mc.work_number,
  mc.unit_index,
  mc.item_id,
  coalesce(nullif(btrim(mc.product_name), ''), 'Garment'),
  mc.service_type,
  'CODE128',
  left(upper(coalesce(nullif(btrim(mc.work_number), ''), 'WORK')), 30)
FROM missing_cards mc;

UPDATE public.washdoor_garment_cards gc
SET
  barcode = upper(coalesce(nullif(btrim(c.work_number), ''), 'WORK'))
            || '-G' || lpad(coalesce(gc.unit_index, 1)::TEXT, 3, '0'),
  barcode_format = 'CODE128',
  barcode_order_id = left(upper(coalesce(nullif(btrim(c.work_number), ''), 'WORK')), 30),
  barcode_generated_at = coalesce(gc.barcode_generated_at, now())
FROM public.customer_works c
WHERE c.work_id = gc.work_id
  AND (gc.barcode IS NULL OR btrim(gc.barcode) = '');

UPDATE public.washdoor_garment_cards gc
SET
  barcode = upper(btrim(gc.barcode)),
  barcode_format = 'CODE128',
  barcode_order_id = left(upper(coalesce(nullif(btrim(gc.barcode_order_id), ''), c.work_number, 'WORK')), 30)
FROM public.customer_works c
WHERE c.work_id = gc.work_id
  AND gc.barcode IS NOT NULL
  AND btrim(gc.barcode) <> '';

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.washdoor_garment_cards
    WHERE barcode IS NOT NULL AND btrim(barcode) <> ''
    GROUP BY barcode
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'Duplicate garment barcodes exist. Resolve them before creating the unique index.';
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS uq_washdoor_garment_cards_barcode
ON public.washdoor_garment_cards (barcode)
WHERE barcode IS NOT NULL AND btrim(barcode) <> '';

CREATE INDEX IF NOT EXISTS idx_washdoor_garment_cards_order_item
ON public.washdoor_garment_cards (order_item_id);

CREATE INDEX IF NOT EXISTS idx_washdoor_garment_cards_barcode_order
ON public.washdoor_garment_cards (barcode_order_id);

CREATE OR REPLACE FUNCTION public.set_washdoor_garment_barcode()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_work_number TEXT;
  v_old_barcode TEXT;
  v_old_format TEXT;
  v_old_order TEXT;
  v_old_generated TIMESTAMPTZ;
BEGIN
  v_work_number := nullif(btrim(coalesce(NEW.work_number, '')), '');

  IF v_work_number IS NULL THEN
    SELECT c.work_number
    INTO v_work_number
    FROM public.customer_works c
    WHERE c.work_id = NEW.work_id;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    v_old_barcode := OLD.barcode;
    v_old_format := OLD.barcode_format;
    v_old_order := OLD.barcode_order_id;
    v_old_generated := OLD.barcode_generated_at;
  END IF;

  IF TG_OP = 'UPDATE'
     AND v_old_barcode IS NOT NULL
     AND btrim(v_old_barcode) <> '' THEN
    NEW.barcode := upper(btrim(v_old_barcode));
    NEW.barcode_format := coalesce(nullif(btrim(v_old_format), ''), 'CODE128');
    NEW.barcode_order_id := left(upper(coalesce(nullif(btrim(v_old_order), ''), v_work_number, 'WORK')), 30);
    NEW.barcode_generated_at := coalesce(v_old_generated, now());
    RETURN NEW;
  END IF;

  IF NEW.barcode IS NULL OR btrim(NEW.barcode) = '' THEN
    NEW.barcode := upper(coalesce(v_work_number, 'WORK'))
                   || '-G' || lpad(coalesce(NEW.unit_index, 1)::TEXT, 3, '0');
    NEW.barcode_generated_at := now();
  END IF;

  NEW.barcode := upper(btrim(NEW.barcode));
  NEW.barcode_format := 'CODE128';
  NEW.barcode_order_id := left(upper(coalesce(nullif(btrim(NEW.barcode_order_id), ''), v_work_number, 'WORK')), 30);
  NEW.barcode_generated_at := coalesce(NEW.barcode_generated_at, now());

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_washdoor_garment_barcode
ON public.washdoor_garment_cards;

CREATE TRIGGER trg_set_washdoor_garment_barcode
BEFORE INSERT OR UPDATE ON public.washdoor_garment_cards
FOR EACH ROW
EXECUTE FUNCTION public.set_washdoor_garment_barcode();

CREATE OR REPLACE FUNCTION public.set_garment_tag_number()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Preserve existing garment tag
  IF TG_OP = 'UPDATE' THEN
    IF OLD.garment_tag_number IS NOT NULL
       AND btrim(OLD.garment_tag_number) <> '' THEN
      NEW.garment_tag_number := OLD.garment_tag_number;
      RETURN NEW;
    END IF;
  END IF;

  -- Generate missing garment tag from barcode
  IF NEW.garment_tag_number IS NULL
     OR btrim(NEW.garment_tag_number) = '' THEN
    NEW.garment_tag_number := NEW.barcode;
  END IF;

  IF NEW.garment_tag_number IS NULL
     OR btrim(NEW.garment_tag_number) = '' THEN
    RAISE EXCEPTION 'Garment tag generation failed';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_z_garment_tag_number
ON public.washdoor_garment_cards;

CREATE TRIGGER trg_set_z_garment_tag_number
BEFORE INSERT OR UPDATE
ON public.washdoor_garment_cards
FOR EACH ROW
EXECUTE FUNCTION public.set_garment_tag_number();

UPDATE public.washdoor_garment_cards gc
SET garment_tag_number = left(upper(btrim(gc.barcode)), 50)
WHERE (gc.garment_tag_number IS NULL OR btrim(gc.garment_tag_number) = '')
  AND gc.barcode IS NOT NULL
  AND btrim(gc.barcode) <> '';

CREATE OR REPLACE FUNCTION public.get_internal_notes_text(p_notes TEXT, p_key TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_json JSONB;
BEGIN
  IF p_notes IS NULL OR btrim(p_notes) = '' THEN
    RETURN NULL;
  END IF;

  BEGIN
    v_json := p_notes::jsonb;
  EXCEPTION WHEN others THEN
    RETURN NULL;
  END;

  IF jsonb_typeof(v_json) <> 'object' THEN
    RETURN NULL;
  END IF;

  RETURN nullif(btrim(coalesce(v_json ->> p_key, '')), '');
END;
$$;

CREATE OR REPLACE FUNCTION public.get_garment_barcode_details(p_barcode TEXT)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT coalesce(
    (
      SELECT jsonb_build_object(
        'order_id', c.work_number,
        'work_id', c.work_id::text,
        'work_number', c.work_number,
        'order_status', coalesce(public.get_internal_notes_text(c.internal_notes, 'order_status'), c.work_status),
        'expected_delivery_date', c.target_delivery_date,
        'customer_name', c.customer_name,
        'mobile_number', c.mobile_number,
        'delivery_address', c.delivery_address,
        'garment_name', gc.garment_name,
        'barcode', gc.barcode,
        'barcode_format', gc.barcode_format,
        'barcode_order_id', gc.barcode_order_id,
        'barcode_generated_at', gc.barcode_generated_at,
        'garment_id', gc.card_id::text,
        'order_item_id', gc.order_item_id::text,
        'unit_index', gc.unit_index,
        'garment_tag_number', gc.garment_tag_number,
        'service', gc.service_type,
        'quantity', coalesce(oi.quantity, 1),
        'total_garments', coalesce(item_totals.total_garments, c.total_pieces, 0),
        'color', gc.color,
        'fabric', gc.fabric_type,
        'brand', gc.brand,
        'condition', gc.garment_condition,
        'defect_location', ins.defect_location,
        'severity', ins.severity,
        'treatment_action', ins.action_plan,
        'inspection_notes', coalesce(ins.inspection_notes, gc.care_instructions),
        'inspected_by', ins.inspected_by,
        'inspected_at', ins.inspected_at,
        'processing_stage', coalesce(public.get_internal_notes_text(c.internal_notes, 'processing_stage'), gc.processing_stage),
        'assigned_staff', coalesce(gc.assigned_staff, public.get_internal_notes_text(c.internal_notes, 'attend_staff_name'), c.assigned_staff),
        'processing_instructions', coalesce(
          public.get_internal_notes_text(c.internal_notes, 'processing_instructions'),
          c.special_instructions
        )
      )
      FROM public.washdoor_garment_cards gc
      JOIN public.customer_works c ON c.work_id = gc.work_id
      LEFT JOIN public.washdoor_order_items oi ON oi.item_id = gc.order_item_id
      LEFT JOIN LATERAL (
        SELECT i.action_plan, i.inspection_notes, i.defect_location, i.severity, i.inspected_by, i.inspected_at
        FROM public.washdoor_garment_inspections i
        WHERE i.card_id = gc.card_id
        ORDER BY i.inspected_at DESC, i.created_at DESC
        LIMIT 1
      ) ins ON TRUE
      LEFT JOIN LATERAL (
        SELECT coalesce(sum(greatest(coalesce(oi2.quantity, 1), 1)), 0)::int AS total_garments
        FROM public.washdoor_order_items oi2
        WHERE oi2.work_id = c.work_id
      ) item_totals ON TRUE
      WHERE upper(btrim(gc.barcode)) = upper(btrim(p_barcode))
      LIMIT 1
    ),
    'null'::jsonb
  );
$$;

REVOKE ALL ON FUNCTION public.get_internal_notes_text(TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_garment_barcode_details(TEXT) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.get_internal_notes_text(TEXT, TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_garment_barcode_details(TEXT) TO anon, authenticated, service_role;

select column_name, data_type, is_nullable, column_default
from information_schema.columns
where table_schema = 'public'
  and table_name = 'washdoor_garment_cards'
  and column_name in (
    'order_item_id',
    'garment_tag_number',
    'barcode',
    'barcode_format',
    'barcode_order_id',
    'barcode_generated_at'
  )
order by ordinal_position;

select conname, pg_get_constraintdef(oid) as constraint_definition
from pg_constraint
where conrelid = 'public.washdoor_garment_cards'::regclass
  and contype = 'f'
order by conname;

select tgname, pg_get_triggerdef(oid) as trigger_definition
from pg_trigger
where tgrelid = 'public.washdoor_garment_cards'::regclass
  and not tgisinternal
  and tgname in (
    'trg_set_washdoor_garment_barcode',
    'trg_set_z_garment_tag_number'
  )
order by tgname;

select
  count(*) as total_cards,
  count(*) filter (where order_item_id is null) as cards_without_order_item,
  count(*) filter (where garment_tag_number is null or btrim(garment_tag_number) = '') as cards_without_tag,
  count(*) filter (where barcode is null or btrim(barcode) = '') as cards_without_barcode,
  count(*) filter (where barcode_format is distinct from 'CODE128') as cards_with_wrong_format,
  count(*) filter (where length(garment_tag_number) > 50) as tags_too_long
from public.washdoor_garment_cards;

select 'barcode' as duplicate_kind, barcode as duplicate_value, count(*) as duplicate_count
from public.washdoor_garment_cards
where barcode is not null and btrim(barcode) <> ''
group by barcode
having count(*) > 1
union all
select 'garment_tag_number', garment_tag_number, count(*)
from public.washdoor_garment_cards
where garment_tag_number is not null and btrim(garment_tag_number) <> ''
group by garment_tag_number
having count(*) > 1
union all
select 'work_unit', work_id::text || ':' || unit_index::text, count(*)
from public.washdoor_garment_cards
group by work_id, unit_index
having count(*) > 1;

select p.proname, pg_get_function_identity_arguments(p.oid) as arguments, p.prosecdef as security_definer
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in (
    'set_washdoor_garment_barcode',
    'set_garment_tag_number',
    'get_internal_notes_text',
    'get_garment_barcode_details'
  )
order by p.proname;

SELECT
  work_number,
  garment_name,
  garment_tag_number,
  barcode,
  order_item_id
FROM public.washdoor_garment_cards
ORDER BY work_number, unit_index;
