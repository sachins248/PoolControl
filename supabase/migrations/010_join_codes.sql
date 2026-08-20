-- Latent bug fix: addStaffMember + the super-admin UI have supported role
-- 'manager' since early on, but no migration ever added it to the enum
-- (only 007 added 'super_admin'). Adding a manager today would fail at insert.
alter type user_role add value if not exists 'manager';

alter table facilities
  add column if not exists lifeguard_join_code text,
  add column if not exists supervisor_join_code text;

create unique index if not exists facilities_lifeguard_join_code_idx
  on facilities (lifeguard_join_code) where lifeguard_join_code is not null;

create unique index if not exists facilities_supervisor_join_code_idx
  on facilities (supervisor_join_code) where supervisor_join_code is not null;
