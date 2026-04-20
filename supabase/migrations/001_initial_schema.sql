-- PoolControl.ai — Initial Schema
-- Run this in your Supabase SQL editor or via supabase db push

-- ─── Extensions ───────────────────────────────────────────────────────────────
create extension if not exists "uuid-ossp";

-- ─── Enums ────────────────────────────────────────────────────────────────────
create type user_role as enum ('lifeguard', 'supervisor', 'director', 'corporate');
create type cert_body as enum ('ellis', 'red_cross', 'starguard', 'ymca', 'jeff_ellis');
create type audit_type_name as enum ('scanning', 'vat', 'cpr_skills', 'dispatch', 'supervisor_eavs', 'guest_service', 'cleaning');
create type criterion_result as enum ('pass', 'needs_attention', 'fail');
create type audit_status as enum ('in_progress', 'completed', 'remediated', 'closed');
create type remediation_status as enum ('assigned', 'acknowledged', 'in_deck', 'verified', 'escalated');

-- ─── Facilities ───────────────────────────────────────────────────────────────
create table facilities (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  cert_body cert_body not null default 'ellis',
  timezone text not null default 'America/Chicago',
  config jsonb not null default '{
    "remediation_deadline_hours": 48,
    "audit_cadence": {
      "scanning": 7,
      "vat": 30,
      "cpr_skills": 30,
      "dispatch": 30,
      "supervisor_eavs": 30,
      "guest_service": 14,
      "cleaning": 7
    },
    "zones": ["Main Pool", "Wave Pool", "Lazy River", "Activity Pool", "Kiddie Pool"]
  }'::jsonb,
  created_at timestamptz default now()
);

-- ─── User Profiles ────────────────────────────────────────────────────────────
-- Extends Supabase auth.users with app-specific data
create table user_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  facility_id uuid references facilities(id) on delete cascade,
  role user_role not null default 'lifeguard',
  name text not null,
  employee_id text,
  photo_url text,
  hire_date date,
  phone text,
  email text not null,
  avatar_color text default '#10b981',
  created_at timestamptz default now()
);

-- Corporate users may not belong to a single facility
alter table user_profiles alter column facility_id drop not null;

-- ─── Certifications ───────────────────────────────────────────────────────────
create table certifications (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references user_profiles(id) on delete cascade,
  body cert_body not null,
  expiry date not null,
  issued_at date not null,
  created_at timestamptz default now()
);

-- ─── Audit Types (cert-body parameterized) ────────────────────────────────────
create table audit_types (
  id uuid primary key default uuid_generate_v4(),
  name audit_type_name not null,
  display_name text not null,
  cert_body cert_body not null,
  criteria jsonb not null default '[]'::jsonb,
  pass_threshold numeric not null default 0.7,
  icon text not null default 'eye',
  director_only boolean not null default false,
  created_at timestamptz default now(),
  unique(name, cert_body)
);

-- ─── Audits (append-only after submit) ───────────────────────────────────────
create table audits (
  id uuid primary key default uuid_generate_v4(),
  facility_id uuid not null references facilities(id) on delete cascade,
  lifeguard_id uuid not null references user_profiles(id),
  supervisor_id uuid not null references user_profiles(id),
  audit_type_id uuid not null references audit_types(id),
  audit_type_name audit_type_name not null,
  status audit_status not null default 'in_progress',
  score numeric,
  passed boolean,
  zone text,
  notes text,
  submitted_at timestamptz,
  created_at timestamptz default now()
);

-- Prevent updates to submitted audits (legal defensibility)
create or replace function prevent_audit_modification()
returns trigger language plpgsql as $$
begin
  if old.status in ('completed', 'remediated', 'closed') then
    raise exception 'Submitted audits are immutable. Create an amendment record instead.';
  end if;
  return new;
end;
$$;

create trigger audit_immutability
  before update on audits
  for each row execute function prevent_audit_modification();

-- ─── Audit Criteria Results ───────────────────────────────────────────────────
create table audit_criteria_results (
  id uuid primary key default uuid_generate_v4(),
  audit_id uuid not null references audits(id) on delete cascade,
  criterion_id text not null,
  criterion_label text not null,
  result criterion_result not null,
  comment text,
  created_at timestamptz default now()
);

-- ─── Remediation Tasks ────────────────────────────────────────────────────────
create table remediation_tasks (
  id uuid primary key default uuid_generate_v4(),
  audit_id uuid not null references audits(id) on delete cascade,
  facility_id uuid not null references facilities(id) on delete cascade,
  lifeguard_id uuid not null references user_profiles(id),
  assigned_by_id uuid not null references user_profiles(id),
  deadline timestamptz not null,
  status remediation_status not null default 'assigned',
  coaching_notes text,
  verified_by_id uuid references user_profiles(id),
  verified_at timestamptz,
  created_at timestamptz default now()
);

-- ─── Training Sessions ────────────────────────────────────────────────────────
create table training_sessions (
  id uuid primary key default uuid_generate_v4(),
  facility_id uuid not null references facilities(id) on delete cascade,
  scheduled_date date not null,
  topic text not null,
  why_this_topic text,
  lesson_plan jsonb not null default '{}'::jsonb,
  is_ai_generated boolean not null default false,
  priority text not null default 'Medium',
  ai_generated_version jsonb,
  created_at timestamptz default now()
);

-- ─── Immutable Audit Log ──────────────────────────────────────────────────────
create table audit_log (
  id uuid primary key default uuid_generate_v4(),
  facility_id uuid references facilities(id),
  user_id uuid references auth.users(id),
  action text not null,
  entity_type text not null,
  entity_id text,
  metadata jsonb default '{}'::jsonb,
  ip text,
  created_at timestamptz default now()
);

-- Prevent deletion or updates to audit log
create rule audit_log_no_update as on update to audit_log do instead nothing;
create rule audit_log_no_delete as on delete to audit_log do instead nothing;

-- ─── Row Level Security ───────────────────────────────────────────────────────

-- Enable RLS on all tables
alter table facilities enable row level security;
alter table user_profiles enable row level security;
alter table certifications enable row level security;
alter table audit_types enable row level security;
alter table audits enable row level security;
alter table audit_criteria_results enable row level security;
alter table remediation_tasks enable row level security;
alter table training_sessions enable row level security;
alter table audit_log enable row level security;

-- Helper function: get current user's facility_id
create or replace function get_my_facility_id()
returns uuid language sql stable as $$
  select facility_id from user_profiles where id = auth.uid()
$$;

-- Helper function: get current user's role
create or replace function get_my_role()
returns user_role language sql stable as $$
  select role from user_profiles where id = auth.uid()
$$;

-- Facilities: users see their own facility; corporate sees all
create policy "facility_select" on facilities for select
  using (
    id = get_my_facility_id()
    or get_my_role() = 'corporate'
  );

-- User profiles: lifeguards see own; supervisors/directors see facility; corporate sees all
create policy "profiles_select" on user_profiles for select
  using (
    id = auth.uid()
    or (facility_id = get_my_facility_id() and get_my_role() in ('supervisor', 'director'))
    or get_my_role() = 'corporate'
  );

create policy "profiles_update" on user_profiles for update
  using (
    id = auth.uid()
    or (facility_id = get_my_facility_id() and get_my_role() = 'director')
  );

-- Audit types: all authenticated users can read
create policy "audit_types_select" on audit_types for select to authenticated using (true);

-- Audits: lifeguards see own; supervisors/directors see facility
create policy "audits_select" on audits for select
  using (
    lifeguard_id = auth.uid()
    or (facility_id = get_my_facility_id() and get_my_role() in ('supervisor', 'director'))
    or get_my_role() = 'corporate'
  );

create policy "audits_insert" on audits for insert
  with check (
    facility_id = get_my_facility_id()
    and get_my_role() in ('supervisor', 'director')
    and supervisor_id = auth.uid()
  );

create policy "audits_update" on audits for update
  using (
    facility_id = get_my_facility_id()
    and get_my_role() in ('supervisor', 'director')
    and status = 'in_progress'
  );

-- Criteria results
create policy "criteria_results_select" on audit_criteria_results for select
  using (
    exists (
      select 1 from audits a
      where a.id = audit_id
      and (a.lifeguard_id = auth.uid() or a.facility_id = get_my_facility_id())
    )
  );

create policy "criteria_results_insert" on audit_criteria_results for insert
  with check (
    exists (
      select 1 from audits a
      where a.id = audit_id
      and a.facility_id = get_my_facility_id()
      and get_my_role() in ('supervisor', 'director')
    )
  );

-- Remediation tasks
create policy "remediation_select" on remediation_tasks for select
  using (
    lifeguard_id = auth.uid()
    or (facility_id = get_my_facility_id() and get_my_role() in ('supervisor', 'director'))
    or get_my_role() = 'corporate'
  );

create policy "remediation_insert" on remediation_tasks for insert
  with check (
    facility_id = get_my_facility_id()
    and get_my_role() in ('supervisor', 'director')
  );

create policy "remediation_update" on remediation_tasks for update
  using (
    facility_id = get_my_facility_id()
    and get_my_role() in ('supervisor', 'director')
  );

-- Training sessions
create policy "training_sessions_select" on training_sessions for select
  using (
    facility_id = get_my_facility_id()
    or get_my_role() = 'corporate'
  );

create policy "training_sessions_write" on training_sessions for all
  using (
    facility_id = get_my_facility_id()
    and get_my_role() in ('supervisor', 'director')
  );

-- Audit log: supervisors/directors can read; no one can write directly (triggers only)
create policy "audit_log_select" on audit_log for select
  using (
    facility_id = get_my_facility_id()
    and get_my_role() in ('supervisor', 'director')
    or get_my_role() = 'corporate'
  );

-- ─── Indexes ──────────────────────────────────────────────────────────────────
create index audits_facility_id_idx on audits(facility_id);
create index audits_lifeguard_id_idx on audits(lifeguard_id);
create index audits_submitted_at_idx on audits(submitted_at desc);
create index audits_type_lifeguard_idx on audits(lifeguard_id, audit_type_name, submitted_at desc);
create index remediation_facility_status_idx on remediation_tasks(facility_id, status);
create index remediation_deadline_idx on remediation_tasks(deadline);
create index user_profiles_facility_idx on user_profiles(facility_id);
