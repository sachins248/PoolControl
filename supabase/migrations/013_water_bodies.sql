-- ─────────────────────────────────────────────────────────────────────────────
-- 013 — water_bodies
--
-- Until now a "zone" was a bare string: facilities.config.zones for the picker,
-- and free-text audits.zone on each record. Chemistry needs a real entity (each
-- body has its own thresholds and test interval) and so will attraction
-- inspections later.
--
-- audits.zone is deliberately NOT backfilled: an UPDATE over historical audits
-- would trip the audit_immutability trigger from 001 and abort the migration.
-- History keeps its text; new records carry water_body_id alongside.
--
-- Idempotent: safe to re-run.
-- ─────────────────────────────────────────────────────────────────────────────

do $$ begin
  create type water_body_kind as enum (
    'lap_pool', 'leisure_pool', 'wave_pool', 'lazy_river',
    'kiddie_pool', 'spa', 'splash_pad', 'slide_plunge', 'other'
  );
exception when duplicate_object then null; end $$;

create table if not exists water_bodies (
  id uuid primary key default uuid_generate_v4(),
  facility_id uuid not null references facilities(id) on delete cascade,
  name text not null,
  kind water_body_kind not null default 'other',
  -- per-body overrides: chem_thresholds, test_interval_minutes
  config jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  unique (facility_id, name)
);

create index if not exists water_bodies_facility_idx
  on water_bodies (facility_id, sort_order);

alter table water_bodies enable row level security;

drop policy if exists water_bodies_select on water_bodies;
create policy water_bodies_select on water_bodies for select
  using (facility_id = get_my_facility_id() or is_platform_reader());

-- Seed each facility's existing config.zones, guessing kind from the name so
-- chemistry thresholds start sensible rather than uniformly 'other'.
insert into water_bodies (facility_id, name, kind, sort_order)
select
  f.id,
  z.name,
  (case
     when lower(z.name) like '%wave%'                                     then 'wave_pool'
     when lower(z.name) like '%lazy%' or lower(z.name) like '%river%'     then 'lazy_river'
     when lower(z.name) like '%kiddie%' or lower(z.name) like '%tot%'
       or lower(z.name) like '%children%'                                 then 'kiddie_pool'
     when lower(z.name) like '%spa%' or lower(z.name) like '%hot tub%'    then 'spa'
     when lower(z.name) like '%splash%'                                   then 'splash_pad'
     when lower(z.name) like '%lap%'                                      then 'lap_pool'
     when lower(z.name) like '%plunge%'                                   then 'slide_plunge'
     when lower(z.name) like '%activity%' or lower(z.name) like '%leisure%'
       or lower(z.name) like '%main%'                                     then 'leisure_pool'
     else 'other'
   end)::water_body_kind,
  (z.ord - 1)::int
from facilities f
cross join lateral jsonb_array_elements_text(
  coalesce(f.config -> 'zones', '[]'::jsonb)
) with ordinality as z(name, ord)
where coalesce(z.name, '') <> ''
on conflict (facility_id, name) do nothing;

-- Verification
select
  (select count(*) from water_bodies) as water_bodies,
  (select count(distinct facility_id) from water_bodies) as facilities_seeded;
