-- ─────────────────────────────────────────────────────────────────────────────
-- 015 — staff advisements
--
-- Backs the report's "Medical Restrictions & Official Advisements" section:
-- physician-issued duty restrictions, light duty, written advisements.
--
-- It answers the question opposing counsel asks first — was this guard cleared
-- for the duty they were performing when the incident occurred?
--
-- Records the RESTRICTION, never the diagnosis. Storing medical conditions in a
-- SaaS with no BAA is an unforced liability, so the UI label says so explicitly.
-- Visibility is manager/director only, narrower than every other policy here.
--
-- Idempotent: safe to re-run.
-- ─────────────────────────────────────────────────────────────────────────────

do $$ begin
  create type advisement_kind as enum (
    'medical_restriction', 'duty_restriction', 'written_advisement',
    'accommodation', 'return_to_duty'
  );
exception when duplicate_object then null; end $$;

create table if not exists staff_advisements (
  id uuid primary key default uuid_generate_v4(),
  facility_id uuid not null references facilities(id) on delete cascade,
  user_id uuid not null references user_profiles(id) on delete cascade,
  kind advisement_kind not null,
  -- The restriction itself. NOT the underlying condition.
  restriction text not null,
  issued_by text,
  effective_from date not null,
  effective_to date,
  recorded_by_id uuid not null references user_profiles(id),
  created_at timestamptz not null default now(),
  check (effective_to is null or effective_to >= effective_from)
);

create index if not exists staff_advisements_user_idx
  on staff_advisements (user_id, effective_from desc);

alter table staff_advisements enable row level security;

drop policy if exists staff_advisements_select on staff_advisements;
create policy staff_advisements_select on staff_advisements for select using (
  user_id = auth.uid()
  or (facility_id = get_my_facility_id() and is_facility_admin())
  or is_platform_reader()
);

-- Verification
select
  (select count(*) from information_schema.tables
    where table_schema = 'public' and table_name = 'staff_advisements') as table_created,
  (select count(*) from pg_policies
    where schemaname = 'public' and tablename = 'staff_advisements') as policies;
