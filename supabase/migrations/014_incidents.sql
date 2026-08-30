-- ─────────────────────────────────────────────────────────────────────────────
-- 014 — incident reporting
--
-- Saves, assists, first aid, medical emergencies, guest injuries. This is the
-- other half of the liability story: audits prove the guard was trained and
-- evaluated; incidents record what happened when it counted.
--
-- Immutability model differs from audits on purpose. 001's trigger blocks ALL
-- updates once submitted, which is too blunt — post-hoc amendment is the norm
-- (EMS run numbers arrive later, witnesses come forward). Here the evidence
-- columns freeze and everything else stays editable, with corrections filed as
-- numbered addenda. Rewriting a filed narrative reads as tampering in discovery.
--
-- Idempotent: safe to re-run.
-- ─────────────────────────────────────────────────────────────────────────────

do $$ begin
  create type incident_kind as enum
    ('save', 'assist', 'first_aid', 'medical_emergency', 'guest_injury', 'other');
exception when duplicate_object then null; end $$;

do $$ begin
  create type incident_severity as enum ('minor', 'moderate', 'severe');
exception when duplicate_object then null; end $$;

do $$ begin
  create type incident_status as enum ('draft', 'submitted', 'under_review', 'closed');
exception when duplicate_object then null; end $$;

do $$ begin
  create type responder_role as enum
    ('primary_rescuer', 'assist', 'first_aid', 'supervisor', 'witness');
exception when duplicate_object then null; end $$;

create table if not exists incidents (
  id uuid primary key default uuid_generate_v4(),
  facility_id uuid not null references facilities(id) on delete cascade,
  water_body_id uuid references water_bodies(id) on delete set null,
  occurred_at timestamptz not null,
  kind incident_kind not null,
  severity incident_severity not null default 'minor',
  -- Guest identity kept minimal on purpose: no DOB, no SSN, no diagnosis.
  guest_name text,
  guest_age int check (guest_age is null or guest_age between 0 and 120),
  narrative text not null,
  actions_taken text,
  ems_called boolean not null default false,
  ems_arrival_at timestamptz,
  outcome text,
  witnesses text,
  status incident_status not null default 'draft',
  reported_by_id uuid not null references user_profiles(id),
  submitted_at timestamptz,
  reviewed_by_id uuid references user_profiles(id),
  review_notes text,
  corrective_action text,
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists incidents_facility_idx on incidents (facility_id, occurred_at desc);
create index if not exists incidents_water_body_idx on incidents (water_body_id);

-- Multiple guards respond to one incident, and which role they played is the
-- most consequential fact in the report — so this is a table, not a uuid[].
create table if not exists incident_responders (
  id uuid primary key default uuid_generate_v4(),
  incident_id uuid not null references incidents(id) on delete cascade,
  user_id uuid not null references user_profiles(id) on delete cascade,
  role responder_role not null default 'assist',
  created_at timestamptz not null default now(),
  unique (incident_id, user_id)
);

create index if not exists incident_responders_user_idx on incident_responders (user_id);
create unique index if not exists incident_one_primary_idx
  on incident_responders (incident_id) where role = 'primary_rescuer';

-- Append-only addenda. Same hardening as audit_log in 001.
create table if not exists incident_amendments (
  id uuid primary key default uuid_generate_v4(),
  incident_id uuid not null references incidents(id) on delete cascade,
  seq int not null,
  body text not null,
  author_id uuid not null references user_profiles(id),
  created_at timestamptz not null default now(),
  unique (incident_id, seq)
);

drop rule if exists incident_amendments_no_update on incident_amendments;
drop rule if exists incident_amendments_no_delete on incident_amendments;
create rule incident_amendments_no_update as on update to incident_amendments do instead nothing;
create rule incident_amendments_no_delete as on delete to incident_amendments do instead nothing;

-- ─── Immutability with a mutable allowlist ───────────────────────────────────
create or replace function prevent_incident_modification()
returns trigger language plpgsql as $$
declare
  old_j jsonb;
  new_j jsonb;
  mutable text[] := array[
    'status', 'reviewed_by_id', 'review_notes', 'corrective_action',
    'closed_at', 'submitted_at', 'updated_at'
  ];
  k text;
begin
  -- Drafts are freely editable; the record only hardens once filed.
  if old.status = 'draft' then
    return new;
  end if;

  old_j := to_jsonb(old);
  new_j := to_jsonb(new);
  foreach k in array mutable loop
    old_j := old_j - k;
    new_j := new_j - k;
  end loop;

  if old_j is distinct from new_j then
    raise exception 'Submitted incidents are immutable. File an amendment instead.';
  end if;
  return new;
end;
$$;

drop trigger if exists incident_immutability on incidents;
create trigger incident_immutability before update on incidents
  for each row execute function prevent_incident_modification();

-- ─── RLS ─────────────────────────────────────────────────────────────────────
-- Incidents carry guest PII, so lifeguards see only their own involvement —
-- deliberately narrower than the facility-wide audits policy.

alter table incidents enable row level security;
drop policy if exists incidents_select on incidents;
create policy incidents_select on incidents for select using (
  is_platform_reader()
  or (facility_id = get_my_facility_id() and is_facility_staff())
  or reported_by_id = auth.uid()
  or exists (
    select 1 from incident_responders r
    where r.incident_id = incidents.id and r.user_id = auth.uid()
  )
);

alter table incident_responders enable row level security;
drop policy if exists incident_responders_select on incident_responders;
create policy incident_responders_select on incident_responders for select using (
  user_id = auth.uid()
  or exists (
    select 1 from incidents i
    where i.id = incident_responders.incident_id
      and (is_platform_reader()
           or (i.facility_id = get_my_facility_id() and is_facility_staff())
           or i.reported_by_id = auth.uid())
  )
);

alter table incident_amendments enable row level security;
drop policy if exists incident_amendments_select on incident_amendments;
create policy incident_amendments_select on incident_amendments for select using (
  exists (
    select 1 from incidents i
    where i.id = incident_amendments.incident_id
      and (is_platform_reader()
           or (i.facility_id = get_my_facility_id() and is_facility_staff())
           or i.reported_by_id = auth.uid()
           or exists (select 1 from incident_responders r
                      where r.incident_id = i.id and r.user_id = auth.uid()))
  )
);

-- Verification
select
  (select count(*) from information_schema.tables
    where table_schema = 'public'
      and table_name in ('incidents','incident_responders','incident_amendments')) as tables_created,
  (select count(*) from pg_trigger where tgname = 'incident_immutability') as immutability_trigger;
