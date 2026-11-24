select column_name, data_type, is_nullable, column_default
from information_schema.columns
where table_schema = 'public'
  and table_name = 'washdoor_garment_cards'
  and column_name in (
    'order_item_id',
    'barcode',
    'barcode_format',
    'barcode_order_id',
    'barcode_generated_at'
  )
order by ordinal_position;

select conname, pg_get_constraintdef(oid) as constraint_definition
from pg_constraint
where conrelid = 'public.washdoor_garment_cards'::regclass
  and conname = 'fk_washdoor_garment_cards_order_item';

select indexname, indexdef
from pg_indexes
where schemaname = 'public'
  and tablename = 'washdoor_garment_cards'
  and indexname in (
    'uq_washdoor_garment_cards_work_unit',
    'uq_washdoor_garment_cards_barcode',
    'idx_washdoor_garment_cards_order_item',
    'idx_washdoor_garment_cards_barcode_order'
  )
order by indexname;

select tgname, pg_get_triggerdef(oid) as trigger_definition
from pg_trigger
where tgrelid = 'public.washdoor_garment_cards'::regclass
  and not tgisinternal
  and tgname = 'trg_set_washdoor_garment_barcode';

select p.proname, pg_get_function_identity_arguments(p.oid) as arguments, p.prosecdef as security_definer
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in ('set_washdoor_garment_barcode', 'get_internal_notes_text', 'get_garment_barcode_details')
order by p.proname;

select
  count(*) as total_cards,
  count(*) filter (where order_item_id is null) as cards_without_order_item,
  count(*) filter (where barcode is null or btrim(barcode) = '') as cards_without_barcode,
  count(*) filter (where barcode_format is distinct from 'CODE128') as cards_with_wrong_format
from public.washdoor_garment_cards;

select barcode, count(*) as duplicate_count
from public.washdoor_garment_cards
where barcode is not null and btrim(barcode) <> ''
group by barcode
having count(*) > 1;

with ranked_items as (
  select
    oi.work_id,
    coalesce(
      sum(greatest(coalesce(oi.quantity, 1), 1)) over (
        partition by oi.work_id
        order by oi.created_at, oi.item_id
        rows between unbounded preceding and 1 preceding
      ),
      0
    ) as start_index,
    sum(greatest(coalesce(oi.quantity, 1), 1)) over (
      partition by oi.work_id
      order by oi.created_at, oi.item_id
      rows between unbounded preceding and current row
    ) as end_index
  from public.washdoor_order_items oi
),
expected_cards as (
  select c.work_number, ri.work_id, (ri.start_index + gs.n)::int as unit_index
  from ranked_items ri
  join public.customer_works c on c.work_id = ri.work_id
  cross join generate_series(1, (ri.end_index - ri.start_index)::int) as gs(n)
)
select
  e.work_number,
  count(*) as expected_garments,
  count(gc.card_id) as actual_cards,
  count(*) filter (where gc.barcode is null or btrim(gc.barcode) = '') as missing_barcodes
from expected_cards e
left join public.washdoor_garment_cards gc
  on gc.work_id = e.work_id
 and gc.unit_index = e.unit_index
group by e.work_number
order by e.work_number;

select c.work_number, gc.unit_index, gc.barcode, gc.order_item_id, gc.garment_name
from public.washdoor_garment_cards gc
join public.customer_works c on c.work_id = gc.work_id
order by c.work_number, gc.unit_index
limit 50;

select public.get_garment_barcode_details(
  (select barcode from public.washdoor_garment_cards
   where barcode is not null and btrim(barcode) <> ''
   order by work_id, unit_index
   limit 1)
) as rpc_smoke_test;
