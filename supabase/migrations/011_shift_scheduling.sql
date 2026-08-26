create table shift_assignments (
  id uuid primary key default uuid_generate_v4(),
  facility_id uuid not null references facilities(id) on delete cascade,
  lifeguard_id uuid not null references user_profiles(id) on delete cascade,
  work_date date not null,
  shift_code text,
  start_time text,
  end_time text,
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (facility_id, lifeguard_id, work_date)
);

create index shift_assignments_facility_date_idx on shift_assignments (facility_id, work_date);

alter table shift_assignments enable row level security;

create policy shift_assignments_select on shift_assignments
  for select using (
    facility_id in (select facility_id from user_profiles where id = auth.uid())
  );

-- Backfill configurable shift types into existing facilities (idempotent)
update facilities
set config = config || jsonb_build_object('shift_types', '[
  {"code":"O","label":"Open","start":"09:30","end":"16:00","color":"emerald"},
  {"code":"M","label":"Mid","start":"11:00","end":"19:00","color":"blue"},
  {"code":"C","label":"Close","start":"14:00","end":"21:30","color":"purple"}
]'::jsonb)
where not (config ? 'shift_types');
