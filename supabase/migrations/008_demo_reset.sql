-- PoolControl.ai — Demo Reset (Coral Bay Aquatic Center)
--
-- Purpose: replace the May smoke-test data with a demo-grade fixture.
-- Run this whole file in the Supabase SQL editor. Safe to re-run.
--
-- All audit dates are written as NOW() - INTERVAL, so the fixture self-freshens:
-- run it today, run it Thursday morning, the numbers stay correct either way.
--
-- Supersedes 003_seed_demo_data.sql, which was never applied. Do NOT run 003 as
-- well: its supervisor upsert forces role='director' onto the oldest auth.users
-- row, which would silently strip your super_admin.
--
-- ⚠️  SECTION 2 DELETES ALL EXISTING AUDITS for this facility. That is the point
--     (they are 3-month-old all-failing test runs, and the audits table has an
--     immutability trigger so their dates cannot be shifted forward instead).
--     Skip section 2 if you want to keep them.

do $$
declare
  v_facility     uuid := 'a1b2c3d4-0001-0001-0001-000000000001';
  v_supervisor   uuid;

  v_scanning     uuid;
  v_vat          uuid;
  v_cpr          uuid;
  v_dispatch     uuid;

  lg_brooks      uuid := 'b0000001-0000-0000-0000-000000000001';
  lg_webb        uuid := 'b0000001-0000-0000-0000-000000000002';
  lg_winters     uuid := 'b0000001-0000-0000-0000-000000000003';
  lg_novak       uuid := 'b0000001-0000-0000-0000-000000000004';
  lg_williams    uuid := 'b0000001-0000-0000-0000-000000000005';
  lg_rodriguez   uuid := 'b0000001-0000-0000-0000-000000000006';
  lg_singh       uuid := 'b0000001-0000-0000-0000-000000000007';
  lg_park        uuid := 'b0000001-0000-0000-0000-000000000008';
  lg_osei        uuid := 'b0000001-0000-0000-0000-000000000009';
  lg_castellano  uuid := 'b0000001-0000-0000-0000-000000000010';
  lg_chen        uuid := 'b0000001-0000-0000-0000-000000000011';
  lg_kowalski    uuid := 'b0000001-0000-0000-0000-000000000012';
  lg_turner      uuid := 'b0000001-0000-0000-0000-000000000013';
  lg_okafor      uuid := 'b0000001-0000-0000-0000-000000000014';
begin

-- ── 1. Clear the expired trial ───────────────────────────────────────────────
-- middleware.ts redirects expired-trial facilities to /billing for every role
-- except super_admin. Without this, the operator demo never leaves /billing.
update facilities
set trial_ends_at = now() + interval '90 days',
    billing_status = 'active'
where id = v_facility;

-- ── 2. Remove the May smoke-test data ────────────────────────────────────────
-- Cascades to audit_criteria_results and remediation_tasks via ON DELETE CASCADE.
delete from audits where facility_id = v_facility;

-- Retire the four hand-made test lifeguards. Deactivating rather than deleting
-- keeps FK history intact; every app query filters on is_active = true.
update user_profiles
set is_active = false
where facility_id = v_facility
  and role = 'lifeguard'
  and id not in (
    lg_brooks, lg_webb, lg_winters, lg_novak, lg_williams, lg_rodriguez,
    lg_singh, lg_park, lg_osei, lg_castellano, lg_chen, lg_kowalski,
    lg_turner, lg_okafor
  );

-- ── 3. Resolve the acting supervisor and audit types ─────────────────────────
select id into v_supervisor
from user_profiles
where facility_id = v_facility
  and role in ('supervisor', 'director', 'super_admin')
order by case role when 'supervisor' then 0 when 'director' then 1 else 2 end
limit 1;

if v_supervisor is null then
  raise exception 'No supervisor/director/super_admin at facility %. Create one first.', v_facility;
end if;

select id into v_scanning from audit_types where name = 'scanning'   and cert_body = 'ellis';
select id into v_vat      from audit_types where name = 'vat'        and cert_body = 'ellis';
select id into v_cpr      from audit_types where name = 'cpr_skills' and cert_body = 'ellis';
select id into v_dispatch from audit_types where name = 'dispatch'   and cert_body = 'ellis';

-- ── 4. Demo lifeguards ───────────────────────────────────────────────────────
-- user_profiles.id references auth.users(id), so the auth rows must exist first.
-- These are seed accounts with no usable password — they are never signed into.
insert into auth.users (
  id, instance_id, email, encrypted_password, email_confirmed_at,
  created_at, updated_at, raw_app_meta_data, raw_user_meta_data,
  is_super_admin, role, aud
) values
  (lg_brooks,     '00000000-0000-0000-0000-000000000000', 'i.brooks@coralbay.demo',     '', now(), now(), now(), '{"provider":"email","providers":["email"]}', '{}', false, 'authenticated', 'authenticated'),
  (lg_webb,       '00000000-0000-0000-0000-000000000000', 'm.webb@coralbay.demo',       '', now(), now(), now(), '{"provider":"email","providers":["email"]}', '{}', false, 'authenticated', 'authenticated'),
  (lg_winters,    '00000000-0000-0000-0000-000000000000', 'c.winters@coralbay.demo',    '', now(), now(), now(), '{"provider":"email","providers":["email"]}', '{}', false, 'authenticated', 'authenticated'),
  (lg_novak,      '00000000-0000-0000-0000-000000000000', 't.novak@coralbay.demo',      '', now(), now(), now(), '{"provider":"email","providers":["email"]}', '{}', false, 'authenticated', 'authenticated'),
  (lg_williams,   '00000000-0000-0000-0000-000000000000', 'j.williams@coralbay.demo',   '', now(), now(), now(), '{"provider":"email","providers":["email"]}', '{}', false, 'authenticated', 'authenticated'),
  (lg_rodriguez,  '00000000-0000-0000-0000-000000000000', 'd.rodriguez@coralbay.demo',  '', now(), now(), now(), '{"provider":"email","providers":["email"]}', '{}', false, 'authenticated', 'authenticated'),
  (lg_singh,      '00000000-0000-0000-0000-000000000000', 'a.singh@coralbay.demo',      '', now(), now(), now(), '{"provider":"email","providers":["email"]}', '{}', false, 'authenticated', 'authenticated'),
  (lg_park,       '00000000-0000-0000-0000-000000000000', 'j.park@coralbay.demo',       '', now(), now(), now(), '{"provider":"email","providers":["email"]}', '{}', false, 'authenticated', 'authenticated'),
  (lg_osei,       '00000000-0000-0000-0000-000000000000', 'b.osei@coralbay.demo',       '', now(), now(), now(), '{"provider":"email","providers":["email"]}', '{}', false, 'authenticated', 'authenticated'),
  (lg_castellano, '00000000-0000-0000-0000-000000000000', 'r.castellano@coralbay.demo', '', now(), now(), now(), '{"provider":"email","providers":["email"]}', '{}', false, 'authenticated', 'authenticated'),
  (lg_chen,       '00000000-0000-0000-0000-000000000000', 'd.chen@coralbay.demo',       '', now(), now(), now(), '{"provider":"email","providers":["email"]}', '{}', false, 'authenticated', 'authenticated'),
  (lg_kowalski,   '00000000-0000-0000-0000-000000000000', 'l.kowalski@coralbay.demo',   '', now(), now(), now(), '{"provider":"email","providers":["email"]}', '{}', false, 'authenticated', 'authenticated'),
  (lg_turner,     '00000000-0000-0000-0000-000000000000', 'k.turner@coralbay.demo',     '', now(), now(), now(), '{"provider":"email","providers":["email"]}', '{}', false, 'authenticated', 'authenticated'),
  (lg_okafor,     '00000000-0000-0000-0000-000000000000', 's.okafor@coralbay.demo',     '', now(), now(), now(), '{"provider":"email","providers":["email"]}', '{}', false, 'authenticated', 'authenticated')
on conflict (id) do nothing;

insert into user_profiles (id, facility_id, role, name, email, hire_date, avatar_color, employee_id, is_active)
values
  (lg_brooks,     v_facility, 'lifeguard', 'Isaiah Brooks',     'i.brooks@coralbay.demo',     '2023-03-15', '#ef4444', 'LG-001', true),
  (lg_webb,       v_facility, 'lifeguard', 'Marcus Webb',       'm.webb@coralbay.demo',       '2026-06-20', '#f97316', 'LG-002', true),
  (lg_winters,    v_facility, 'lifeguard', 'Caleb Winters',     'c.winters@coralbay.demo',    '2024-06-01', '#fbbf24', 'LG-003', true),
  (lg_novak,      v_facility, 'lifeguard', 'Tyler Novak',       't.novak@coralbay.demo',      '2025-08-15', '#ec4899', 'LG-004', true),
  (lg_williams,   v_facility, 'lifeguard', 'Jade Williams',     'j.williams@coralbay.demo',   '2024-03-08', '#a855f7', 'LG-005', true),
  (lg_rodriguez,  v_facility, 'lifeguard', 'Destiny Rodriguez', 'd.rodriguez@coralbay.demo',  '2024-09-12', '#f59e0b', 'LG-006', true),
  (lg_singh,      v_facility, 'lifeguard', 'Amara Singh',       'a.singh@coralbay.demo',      '2025-05-20', '#3b82f6', 'LG-007', true),
  (lg_park,       v_facility, 'lifeguard', 'Jordan Park',       'j.park@coralbay.demo',       '2022-05-10', '#14b8a6', 'LG-008', true),
  (lg_osei,       v_facility, 'lifeguard', 'Brianna Osei',      'b.osei@coralbay.demo',       '2023-11-01', '#10b981', 'LG-009', true),
  (lg_castellano, v_facility, 'lifeguard', 'Ryan Castellano',   'r.castellano@coralbay.demo', '2023-06-20', '#22c55e', 'LG-010', true),
  (lg_chen,       v_facility, 'lifeguard', 'Devon Chen',        'd.chen@coralbay.demo',       '2021-04-05', '#6366f1', 'LG-011', true),
  (lg_kowalski,   v_facility, 'lifeguard', 'Lily Kowalski',     'l.kowalski@coralbay.demo',   '2025-11-30', '#d946ef', 'LG-012', true),
  (lg_turner,     v_facility, 'lifeguard', 'Kezia Turner',      'k.turner@coralbay.demo',     '2024-01-15', '#0ea5e9', 'LG-013', true),
  (lg_okafor,     v_facility, 'lifeguard', 'Sam Okafor',        's.okafor@coralbay.demo',     '2023-08-22', '#84cc16', 'LG-014', true)
on conflict (id) do update
set facility_id = excluded.facility_id,
    role        = excluded.role,
    name        = excluded.name,
    is_active   = true;

-- ── 5. Audit history ─────────────────────────────────────────────────────────
-- Cadence: scanning 7d, vat/cpr/dispatch 30d.
--   overdue   = never audited, or days_ago > cadence
--   due_today = days_ago >= cadence - 1
--   done      = submitted after midnight today
--
-- Target board: 14 on shift · 4 due today · 9 overdue · 7 done
--               3 HIGH · 4 MED · 7 ON TRACK
insert into audits (facility_id, lifeguard_id, supervisor_id, audit_type_id, audit_type_name, status, score, passed, zone, submitted_at)
values
  -- HIGH — Isaiah Brooks: scanning + dispatch never done, VAT failed
  (v_facility, lg_brooks, v_supervisor, v_vat,      'vat',        'remediated', 2.4, false, 'Wave Pool',     now() - interval '18 days'),
  (v_facility, lg_brooks, v_supervisor, v_cpr,      'cpr_skills', 'completed',  3.6, true,  'Main Pool',     now() - interval '12 days'),

  -- HIGH — Marcus Webb: new hire, only CPR on record
  (v_facility, lg_webb, v_supervisor, v_cpr,        'cpr_skills', 'completed',  3.8, true,  'Kiddie Pool',   now() - interval '5 days'),

  -- HIGH — Caleb Winters: scanning + VAT overdue, VAT failed
  (v_facility, lg_winters, v_supervisor, v_scanning, 'scanning',   'completed',  3.4, true,  'Wave Pool',     now() - interval '10 days'),
  (v_facility, lg_winters, v_supervisor, v_vat,      'vat',        'remediated', 2.6, false, 'Wave Pool',     now() - interval '38 days'),
  (v_facility, lg_winters, v_supervisor, v_cpr,      'cpr_skills', 'completed',  3.8, true,  'Activity Pool', now() - interval '15 days'),
  (v_facility, lg_winters, v_supervisor, v_dispatch, 'dispatch',   'completed',  4.0, true,  'Wave Pool',     now() - interval '20 days'),

  -- MED — Tyler Novak: scanning overdue
  (v_facility, lg_novak, v_supervisor, v_scanning,  'scanning',   'completed',  3.6, true,  'Kiddie Pool',   now() - interval '8 days'),
  (v_facility, lg_novak, v_supervisor, v_vat,       'vat',        'completed',  3.8, true,  'Kiddie Pool',   now() - interval '20 days'),
  (v_facility, lg_novak, v_supervisor, v_cpr,       'cpr_skills', 'completed',  4.0, true,  'Main Pool',     now() - interval '11 days'),
  (v_facility, lg_novak, v_supervisor, v_dispatch,  'dispatch',   'completed',  3.9, true,  'Kiddie Pool',   now() - interval '25 days'),

  -- MED — Jade Williams: dispatch overdue, CPR done this morning
  (v_facility, lg_williams, v_supervisor, v_scanning, 'scanning',   'completed', 4.5, true, 'Main Pool',     now() - interval '3 days'),
  (v_facility, lg_williams, v_supervisor, v_vat,      'vat',        'completed', 4.2, true, 'Main Pool',     now() - interval '11 days'),
  (v_facility, lg_williams, v_supervisor, v_cpr,      'cpr_skills', 'completed', 4.4, true, 'Main Pool',     now() - interval '3 hours'),
  (v_facility, lg_williams, v_supervisor, v_dispatch, 'dispatch',   'completed', 3.9, true, 'Wave Pool',     now() - interval '33 days'),

  -- MED — Destiny Rodriguez: recent VAT failure
  (v_facility, lg_rodriguez, v_supervisor, v_scanning, 'scanning',   'completed',  4.2, true,  'Lazy River', now() - interval '4 days'),
  (v_facility, lg_rodriguez, v_supervisor, v_vat,      'vat',        'remediated', 2.2, false, 'Lazy River', now() - interval '5 days'),
  (v_facility, lg_rodriguez, v_supervisor, v_cpr,      'cpr_skills', 'completed',  4.1, true,  'Main Pool',  now() - interval '11 days'),
  (v_facility, lg_rodriguez, v_supervisor, v_dispatch, 'dispatch',   'completed',  4.4, true,  'Lazy River', now() - interval '8 days'),

  -- MED — Amara Singh: recent CPR failure, scanning due today
  (v_facility, lg_singh, v_supervisor, v_scanning, 'scanning',   'completed',  3.9, true,  'Activity Pool', now() - interval '6 days'),
  (v_facility, lg_singh, v_supervisor, v_vat,      'vat',        'completed',  3.7, true,  'Activity Pool', now() - interval '14 days'),
  (v_facility, lg_singh, v_supervisor, v_cpr,      'cpr_skills', 'remediated', 2.8, false, 'Main Pool',     now() - interval '8 days'),
  (v_facility, lg_singh, v_supervisor, v_dispatch, 'dispatch',   'completed',  3.8, true,  'Activity Pool', now() - interval '18 days'),

  -- ON TRACK — Jordan Park: top performer, scanning done this morning, VAT due today
  (v_facility, lg_park, v_supervisor, v_scanning, 'scanning',   'completed', 4.9, true, 'Wave Pool', now() - interval '2 hours'),
  (v_facility, lg_park, v_supervisor, v_vat,      'vat',        'completed', 5.0, true, 'Wave Pool', now() - interval '29 days'),
  (v_facility, lg_park, v_supervisor, v_cpr,      'cpr_skills', 'completed', 4.8, true, 'Main Pool', now() - interval '9 days'),
  (v_facility, lg_park, v_supervisor, v_dispatch, 'dispatch',   'completed', 4.9, true, 'Wave Pool', now() - interval '13 days'),

  -- ON TRACK — Brianna Osei: scanning done this morning
  (v_facility, lg_osei, v_supervisor, v_scanning, 'scanning',   'completed', 4.4, true, 'Lazy River', now() - interval '3 hours'),
  (v_facility, lg_osei, v_supervisor, v_vat,      'vat',        'completed', 4.6, true, 'Lazy River', now() - interval '4 days'),
  (v_facility, lg_osei, v_supervisor, v_cpr,      'cpr_skills', 'completed', 4.2, true, 'Main Pool',  now() - interval '10 days'),
  (v_facility, lg_osei, v_supervisor, v_dispatch, 'dispatch',   'completed', 4.5, true, 'Lazy River', now() - interval '14 days'),

  -- ON TRACK — Ryan Castellano: dispatch done this morning
  (v_facility, lg_castellano, v_supervisor, v_scanning, 'scanning',   'completed', 4.1, true, 'Activity Pool', now() - interval '4 days'),
  (v_facility, lg_castellano, v_supervisor, v_vat,      'vat',        'completed', 3.9, true, 'Activity Pool', now() - interval '12 days'),
  (v_facility, lg_castellano, v_supervisor, v_cpr,      'cpr_skills', 'completed', 4.3, true, 'Main Pool',     now() - interval '19 days'),
  (v_facility, lg_castellano, v_supervisor, v_dispatch, 'dispatch',   'completed', 4.0, true, 'Activity Pool', now() - interval '4 hours'),

  -- ON TRACK — Devon Chen: 5-year veteran, scanning done this morning
  (v_facility, lg_chen, v_supervisor, v_scanning, 'scanning',   'completed', 4.7, true, 'Wave Pool', now() - interval '5 hours'),
  (v_facility, lg_chen, v_supervisor, v_vat,      'vat',        'completed', 4.8, true, 'Wave Pool', now() - interval '7 days'),
  (v_facility, lg_chen, v_supervisor, v_cpr,      'cpr_skills', 'completed', 4.9, true, 'Main Pool', now() - interval '14 days'),
  (v_facility, lg_chen, v_supervisor, v_dispatch, 'dispatch',   'completed', 4.7, true, 'Wave Pool', now() - interval '21 days'),

  -- ON TRACK — Lily Kowalski: newest guard, scanning due today
  (v_facility, lg_kowalski, v_supervisor, v_scanning, 'scanning',   'completed', 3.8, true, 'Kiddie Pool', now() - interval '6 days'),
  (v_facility, lg_kowalski, v_supervisor, v_vat,      'vat',        'completed', 3.6, true, 'Kiddie Pool', now() - interval '9 days'),
  (v_facility, lg_kowalski, v_supervisor, v_cpr,      'cpr_skills', 'completed', 4.2, true, 'Main Pool',   now() - interval '15 days'),
  (v_facility, lg_kowalski, v_supervisor, v_dispatch, 'dispatch',   'completed', 3.9, true, 'Kiddie Pool', now() - interval '11 days'),

  -- ON TRACK — Kezia Turner: scanning done this morning, VAT due today
  (v_facility, lg_turner, v_supervisor, v_scanning, 'scanning',   'completed', 4.0, true, 'Main Pool',  now() - interval '2 hours'),
  (v_facility, lg_turner, v_supervisor, v_vat,      'vat',        'completed', 3.8, true, 'Main Pool',  now() - interval '29 days'),
  (v_facility, lg_turner, v_supervisor, v_cpr,      'cpr_skills', 'completed', 4.1, true, 'Main Pool',  now() - interval '22 days'),
  (v_facility, lg_turner, v_supervisor, v_dispatch, 'dispatch',   'completed', 3.9, true, 'Lazy River', now() - interval '17 days'),

  -- ON TRACK — Sam Okafor: CPR done this morning
  (v_facility, lg_okafor, v_supervisor, v_scanning, 'scanning',   'completed', 4.3, true, 'Activity Pool', now() - interval '4 days'),
  (v_facility, lg_okafor, v_supervisor, v_vat,      'vat',        'completed', 4.1, true, 'Activity Pool', now() - interval '11 days'),
  (v_facility, lg_okafor, v_supervisor, v_cpr,      'cpr_skills', 'completed', 4.4, true, 'Main Pool',     now() - interval '1 hour'),
  (v_facility, lg_okafor, v_supervisor, v_dispatch, 'dispatch',   'completed', 4.2, true, 'Activity Pool', now() - interval '24 days');

-- ── 6. Certifications ────────────────────────────────────────────────────────
delete from certifications
where user_id in (
  lg_brooks, lg_webb, lg_winters, lg_novak, lg_williams, lg_rodriguez, lg_singh,
  lg_park, lg_osei, lg_castellano, lg_chen, lg_kowalski, lg_turner, lg_okafor
);

insert into certifications (user_id, body, issued_at, expiry) values
  (lg_brooks,  'ellis', (now() - interval '11 months')::date, (now() + interval '12 days')::date),   -- expiring soon
  (lg_webb,    'ellis', (now() - interval '11 months')::date, (now() + interval '25 days')::date),   -- expiring soon
  (lg_winters, 'ellis', (now() - interval '8 months')::date,  (now() + interval '4 months')::date),
  (lg_park,    'ellis', (now() - interval '5 months')::date,  (now() + interval '7 months')::date),
  (lg_chen,    'ellis', (now() - interval '3 months')::date,  (now() + interval '9 months')::date),
  (lg_osei,    'ellis', (now() - interval '6 months')::date,  (now() + interval '6 months')::date);

end $$;

-- ── 7. Criteria results ──────────────────────────────────────────────────────
-- Generated from each audit's score so the detail always agrees with the header.
-- Non-passes are concentrated on the same liability-critical criteria across
-- guards, so Team Analysis → "Most Common Failures" shows a real pattern rather
-- than noise, and Coach PC has genuine per-guard history to reference live.
do $$
declare
  a       record;
  crit    jsonb;
  focus   text[];
  cid     text;
begin
  for a in
    select au.id, au.audit_type_name::text as type_name, au.score, au.passed, t.criteria
    from audits au
    join audit_types t on t.id = au.audit_type_id
    where au.facility_id = 'a1b2c3d4-0001-0001-0001-000000000001'
      and au.submitted_at is not null
  loop
    focus := case a.type_name
      when 'scanning'   then array['scan_4', 'scan_6']   -- rescue ready / bottom scan
      when 'vat'        then array['vat_1', 'vat_4']     -- 10-20 recognition / rescue
      when 'cpr_skills' then array['cpr_2', 'cpr_4']     -- compression quality / AED
      when 'dispatch'   then array['disp_1', 'disp_2']   -- pre-dispatch check / rider reqs
      else array[]::text[]
    end;

    for crit in select * from jsonb_array_elements(a.criteria)
    loop
      cid := crit ->> 'id';

      insert into audit_criteria_results (audit_id, criterion_id, criterion_label, result, comment)
      values (
        a.id,
        cid,
        crit ->> 'label',
        case
          -- Failed audit: both focus criteria fail outright
          when not a.passed and cid = any(focus) then 'fail'::criterion_result
          -- Failed audit: one more criterion flagged
          when not a.passed and cid = (a.criteria -> 0 ->> 'id') then 'needs_attention'::criterion_result
          -- Passed but under 4.0: the primary focus criterion needs work
          when a.passed and a.score < 4.0 and cid = focus[1] then 'needs_attention'::criterion_result
          else 'pass'::criterion_result
        end,
        case
          when not a.passed and cid = any(focus)
            then 'Observed during audit — remediation assigned.'
          else null
        end
      );
    end loop;
  end loop;
end $$;

-- ── 8. Remediation queue ─────────────────────────────────────────────────────
-- Two open (one counting down, one overdue) and two closed, so both sections of
-- /remediation are populated.
do $$
declare
  v_facility uuid := 'a1b2c3d4-0001-0001-0001-000000000001';
  v_sup      uuid;
begin
  select id into v_sup from user_profiles
  where facility_id = v_facility and role in ('supervisor', 'director', 'super_admin')
  order by case role when 'supervisor' then 0 when 'director' then 1 else 2 end
  limit 1;

  insert into remediation_tasks
    (audit_id, facility_id, lifeguard_id, assigned_by_id, deadline, status, coaching_notes, verified_by_id, verified_at)
  select
    au.id, v_facility, au.lifeguard_id, v_sup, r.deadline, r.status::remediation_status, r.notes,
    case when r.status = 'verified' then v_sup end,
    case when r.status = 'verified' then now() - interval '2 days' end
  from audits au
  join (values
    ('d.rodriguez@coralbay.demo', 'vat',        now() + interval '18 hours', 'acknowledged', 'Re-run VAT scenario with focus on 10/20 recognition time.'),
    ('a.singh@coralbay.demo',     'cpr_skills', now() - interval '6 hours',  'assigned',     'Compression depth below standard — repeat skills check with AED.'),
    ('i.brooks@coralbay.demo',    'vat',        now() - interval '14 days',  'verified',     'Retested and cleared. Recognition time within standard.'),
    ('c.winters@coralbay.demo',   'vat',        now() - interval '30 days',  'verified',     'Rescue technique corrected and verified on deck.')
  ) as r(email, type_name, deadline, status, notes)
    on r.type_name = au.audit_type_name::text
  join user_profiles p on p.id = au.lifeguard_id and p.email = r.email
  where au.facility_id = v_facility and au.passed = false;
end $$;

-- ── 9. Re-assert super_admin ─────────────────────────────────────────────────
-- Belt and braces: nothing above touches this, but 003 did, so make it explicit.
update user_profiles
set role = 'super_admin'
where email = 'sachin.selvakumar24@gmail.com';

-- ── Verify ───────────────────────────────────────────────────────────────────
-- Expect: 14 active lifeguards · 51 audits · ~250 criteria results · 4 remediations
select
  (select count(*) from user_profiles where facility_id = 'a1b2c3d4-0001-0001-0001-000000000001' and role = 'lifeguard' and is_active) as active_lifeguards,
  (select count(*) from audits where facility_id = 'a1b2c3d4-0001-0001-0001-000000000001')                                            as audits,
  (select count(*) from audit_criteria_results r join audits a on a.id = r.audit_id where a.facility_id = 'a1b2c3d4-0001-0001-0001-000000000001') as criteria_results,
  (select count(*) from remediation_tasks where facility_id = 'a1b2c3d4-0001-0001-0001-000000000001')                                 as remediations,
  (select trial_ends_at from facilities where id = 'a1b2c3d4-0001-0001-0001-000000000001')                                            as trial_ends_at,
  (select role::text from user_profiles where email = 'sachin.selvakumar24@gmail.com')                                                as your_role;
