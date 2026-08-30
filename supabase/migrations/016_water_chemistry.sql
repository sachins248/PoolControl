-- ─────────────────────────────────────────────────────────────────────────────
-- 016 — water chemistry logging
--
-- Replaces the clipboard in the pump room. Health code requires testing every
-- 2-4 hours while open and retaining records for years; it's the first thing an
-- inspector asks for and the first thing a plaintiff subpoenas.
--
-- Three states, not a boolean: "out of range" and "must close the pool" are
-- legally different, and the paper log being replaced has a box for it.
--
-- Every reading snapshots the thresholds it was judged against, so a record
-- stays interpretable after the facility retunes its limits.
--
-- Idempotent: safe to re-run.
-- ─────────────────────────────────────────────────────────────────────────────

do $$ begin
  create type chem_reading_status as enum ('ok', 'out_of_range', 'closure_required');
exception when duplicate_object then null; end $$;

create table if not exists chemistry_readings (
  id uuid primary key default uuid_generate_v4(),
  facility_id uuid not null references facilities(id) on delete cascade,
  water_body_id uuid not null references water_bodies(id) on delete cascade,
  tested_at timestamptz not null default now(),
  tested_by_id uuid not null references user_profiles(id),

  free_chlorine     numeric(6,2),
  combined_chlorine numeric(6,2),
  ph                numeric(4,2) check (ph is null or ph between 0 and 14),
  total_alkalinity  numeric(7,1),
  calcium_hardness  numeric(7,1),
  cyanuric_acid     numeric(6,1),
  water_temp_f      numeric(5,1),
  turbidity_ntu     numeric(6,2),

  status chem_reading_status not null default 'ok',
  -- [{param, value, bound, limit}] for the reading's own record
  breaches jsonb not null default '[]'::jsonb,
  thresholds_snapshot jsonb not null default '{}'::jsonb,
  notes text,

  -- Operators fix and retest in minutes; this is deliberately lighter than the
  -- multi-day remediation_tasks workflow.
  corrected_at timestamptz,
  corrected_by_id uuid references user_profiles(id),
  corrective_note text,
  retest_of uuid references chemistry_readings(id) on delete set null,

  created_at timestamptz not null default now()
);

create index if not exists chemistry_readings_body_idx
  on chemistry_readings (water_body_id, tested_at desc);
create index if not exists chemistry_readings_facility_idx
  on chemistry_readings (facility_id, tested_at desc);
create index if not exists chemistry_readings_open_idx
  on chemistry_readings (facility_id, status)
  where status <> 'ok' and corrected_at is null;

-- Readings are evidence: only the correction fields may change after the fact.
create or replace function prevent_chemistry_modification()
returns trigger language plpgsql as $$
declare
  old_j jsonb;
  new_j jsonb;
  mutable text[] := array['corrected_at', 'corrected_by_id', 'corrective_note'];
  k text;
begin
  old_j := to_jsonb(old);
  new_j := to_jsonb(new);
  foreach k in array mutable loop
    old_j := old_j - k;
    new_j := new_j - k;
  end loop;
  if old_j is distinct from new_j then
    raise exception 'Chemistry readings are immutable. Log a retest instead.';
  end if;
  return new;
end;
$$;

drop trigger if exists chemistry_immutability on chemistry_readings;
create trigger chemistry_immutability before update on chemistry_readings
  for each row execute function prevent_chemistry_modification();

alter table chemistry_readings enable row level security;

-- Everyone on staff can see the log; it's an operational board, not PII.
drop policy if exists chemistry_readings_select on chemistry_readings;
create policy chemistry_readings_select on chemistry_readings for select
  using (facility_id = get_my_facility_id() or is_platform_reader());

-- Facility-wide chemistry defaults, only where not already configured.
update facilities
set config = config || jsonb_build_object('chem_defaults', jsonb_build_object(
  'test_interval_minutes', 240,
  'thresholds', jsonb_build_object(
    'free_chlorine',    jsonb_build_object('min', 1.0, 'max', 8.0, 'close_below', 1.0, 'unit', 'ppm'),
    'combined_chlorine',jsonb_build_object('max', 0.4, 'unit', 'ppm'),
    'ph',               jsonb_build_object('min', 7.2, 'max', 7.8, 'close_below', 7.0, 'close_above', 8.0, 'unit', ''),
    'total_alkalinity', jsonb_build_object('min', 60, 'max', 180, 'unit', 'ppm'),
    'calcium_hardness', jsonb_build_object('min', 150, 'max', 1000, 'unit', 'ppm'),
    'cyanuric_acid',    jsonb_build_object('max', 100, 'unit', 'ppm'),
    'water_temp_f',     jsonb_build_object('min', 70, 'max', 104, 'close_above', 104, 'unit', 'F'),
    'turbidity_ntu',    jsonb_build_object('max', 1.0, 'unit', 'NTU')
  )
))
where not (config ? 'chem_defaults');

-- Verification
select
  (select count(*) from information_schema.tables
    where table_schema = 'public' and table_name = 'chemistry_readings') as table_created,
  (select count(*) from pg_trigger where tgname = 'chemistry_immutability') as immutability_trigger,
  (select count(*) from facilities where config ? 'chem_defaults') as facilities_with_defaults;
