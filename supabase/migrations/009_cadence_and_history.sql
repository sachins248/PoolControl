-- PoolControl.ai — Per-lifeguard cadence + historical audit depth
--
-- Run AFTER 008_demo_reset.sql. Safe to re-run (guarded inserts).
--
-- Part 1: audit_cadence_override column — managers can tune audit frequency
--         per lifeguard; schedule.ts falls back to the facility default.
-- Part 2: ~10 weeks of historical audits so the analytics trends have shape,
--         including completed remediation arcs (fail → remediate → pass) that
--         power the remediation-impact and liability-projection panels.
--         All dates are NOW()-relative, same self-freshening style as 008.

-- ── Part 1: per-lifeguard cadence override ──────────────────────────────────
alter table user_profiles
  add column if not exists audit_cadence_override jsonb;

-- ── Part 2: historical audits ───────────────────────────────────────────────
do $$
declare
  v_facility     uuid := 'a1b2c3d4-0001-0001-0001-000000000001';
  v_supervisor   uuid;
  v_scanning     uuid;
  v_vat          uuid;
  v_cpr          uuid;
  v_dispatch     uuid;

  lg_brooks      uuid := 'b0000001-0000-0000-0000-000000000001';
  lg_winters     uuid := 'b0000001-0000-0000-0000-000000000003';
  lg_novak       uuid := 'b0000001-0000-0000-0000-000000000004';
  lg_williams    uuid := 'b0000001-0000-0000-0000-000000000005';
  lg_rodriguez   uuid := 'b0000001-0000-0000-0000-000000000006';
  lg_singh       uuid := 'b0000001-0000-0000-0000-000000000007';
  lg_park        uuid := 'b0000001-0000-0000-0000-000000000008';
  lg_osei        uuid := 'b0000001-0000-0000-0000-000000000009';
  lg_castellano  uuid := 'b0000001-0000-0000-0000-000000000010';
  lg_chen        uuid := 'b0000001-0000-0000-0000-000000000011';
  lg_turner      uuid := 'b0000001-0000-0000-0000-000000000013';
  lg_okafor      uuid := 'b0000001-0000-0000-0000-000000000014';

  v_already      int;
begin
  -- Idempotence guard: if historical rows exist (older than 44 days), skip.
  select count(*) into v_already
  from audits
  where facility_id = v_facility and submitted_at < now() - interval '44 days';
  if v_already > 0 then
    raise notice 'Historical audits already present (%) — skipping part 2.', v_already;
    return;
  end if;

  select id into v_supervisor
  from user_profiles
  where facility_id = v_facility and role in ('supervisor', 'director', 'super_admin')
  order by case role when 'supervisor' then 0 when 'director' then 1 else 2 end
  limit 1;

  select id into v_scanning from audit_types where name = 'scanning'   and cert_body = 'ellis';
  select id into v_vat      from audit_types where name = 'vat'        and cert_body = 'ellis';
  select id into v_cpr      from audit_types where name = 'cpr_skills' and cert_body = 'ellis';
  select id into v_dispatch from audit_types where name = 'dispatch'   and cert_body = 'ellis';

  insert into audits (facility_id, lifeguard_id, supervisor_id, audit_type_id, audit_type_name, status, score, passed, zone, submitted_at)
  values
    -- ═══ Completed improvement arcs (fail → remediated → later pass) ═══
    -- Brooks VAT: the 008 fail (2.4 @ -18d, remediated) resolves with a re-audit pass.
    (v_facility, lg_brooks, v_supervisor, v_vat, 'vat', 'completed', 4.0, true, 'Wave Pool', now() - interval '3 days'),
    -- Singh CPR: 008 fail (2.8 @ -8d, remediated) resolves.
    (v_facility, lg_singh, v_supervisor, v_cpr, 'cpr_skills', 'completed', 4.1, true, 'Main Pool', now() - interval '1 day'),
    -- Novak scanning: early fail, remediated, has passed ever since.
    (v_facility, lg_novak, v_supervisor, v_scanning, 'scanning', 'remediated', 2.6, false, 'Kiddie Pool', now() - interval '70 days'),
    (v_facility, lg_novak, v_supervisor, v_scanning, 'scanning', 'completed',  3.4, true,  'Kiddie Pool', now() - interval '58 days'),
    -- Osei dispatch: early fail, recovered.
    (v_facility, lg_osei, v_supervisor, v_dispatch, 'dispatch', 'remediated', 2.9, false, 'Lazy River', now() - interval '85 days'),
    (v_facility, lg_osei, v_supervisor, v_dispatch, 'dispatch', 'completed',  3.8, true,  'Lazy River', now() - interval '68 days'),

    -- ═══ Historical depth: team trending upward over ~10 weeks ═══
    -- Week -14..-13 (avg ~3.3)
    (v_facility, lg_park,       v_supervisor, v_scanning, 'scanning',   'completed', 3.9, true,  'Wave Pool',     now() - interval '97 days'),
    (v_facility, lg_chen,       v_supervisor, v_vat,      'vat',        'completed', 3.8, true,  'Wave Pool',     now() - interval '95 days'),
    (v_facility, lg_williams,   v_supervisor, v_cpr,      'cpr_skills', 'completed', 3.2, true,  'Main Pool',     now() - interval '93 days'),
    (v_facility, lg_turner,     v_supervisor, v_scanning, 'scanning',   'completed', 3.1, true,  'Main Pool',     now() - interval '92 days'),
    (v_facility, lg_castellano, v_supervisor, v_dispatch, 'dispatch',   'completed', 3.3, true,  'Activity Pool', now() - interval '90 days'),
    (v_facility, lg_okafor,     v_supervisor, v_vat,      'vat',        'completed', 3.0, true,  'Activity Pool', now() - interval '89 days'),

    -- Week -12..-11 (avg ~3.4, one fail)
    (v_facility, lg_winters,    v_supervisor, v_scanning, 'scanning',   'completed',  3.0, true,  'Wave Pool',     now() - interval '83 days'),
    (v_facility, lg_rodriguez,  v_supervisor, v_cpr,      'cpr_skills', 'completed',  3.5, true,  'Main Pool',     now() - interval '81 days'),
    (v_facility, lg_brooks,     v_supervisor, v_scanning, 'scanning',   'remediated', 2.5, false, 'Wave Pool',     now() - interval '80 days'),
    (v_facility, lg_park,       v_supervisor, v_cpr,      'cpr_skills', 'completed',  4.2, true,  'Main Pool',     now() - interval '78 days'),
    (v_facility, lg_chen,       v_supervisor, v_scanning, 'scanning',   'completed',  4.1, true,  'Wave Pool',     now() - interval '77 days'),

    -- Week -10..-9 (avg ~3.6)
    (v_facility, lg_brooks,     v_supervisor, v_scanning, 'scanning',   'completed', 3.5, true,  'Wave Pool',     now() - interval '72 days'),
    (v_facility, lg_williams,   v_supervisor, v_scanning, 'scanning',   'completed', 3.8, true,  'Main Pool',     now() - interval '69 days'),
    (v_facility, lg_turner,     v_supervisor, v_vat,      'vat',        'completed', 3.4, true,  'Main Pool',     now() - interval '66 days'),
    (v_facility, lg_okafor,     v_supervisor, v_scanning, 'scanning',   'completed', 3.7, true,  'Activity Pool', now() - interval '64 days'),
    (v_facility, lg_castellano, v_supervisor, v_cpr,      'cpr_skills', 'completed', 3.6, true,  'Main Pool',     now() - interval '63 days'),

    -- Week -8..-7 (avg ~3.8)
    (v_facility, lg_park,       v_supervisor, v_dispatch, 'dispatch',   'completed', 4.4, true,  'Wave Pool',     now() - interval '55 days'),
    (v_facility, lg_singh,      v_supervisor, v_scanning, 'scanning',   'completed', 3.6, true,  'Activity Pool', now() - interval '53 days'),
    (v_facility, lg_chen,       v_supervisor, v_cpr,      'cpr_skills', 'completed', 4.3, true,  'Main Pool',     now() - interval '52 days'),
    (v_facility, lg_novak,      v_supervisor, v_vat,      'vat',        'completed', 3.6, true,  'Kiddie Pool',   now() - interval '50 days'),
    (v_facility, lg_williams,   v_supervisor, v_dispatch, 'dispatch',   'completed', 3.7, true,  'Wave Pool',     now() - interval '49 days'),

    -- Week -7..-6 (avg ~3.9)
    (v_facility, lg_osei,       v_supervisor, v_scanning, 'scanning',   'completed', 4.0, true,  'Lazy River',    now() - interval '47 days'),
    (v_facility, lg_turner,     v_supervisor, v_cpr,      'cpr_skills', 'completed', 3.8, true,  'Main Pool',     now() - interval '46 days'),
    (v_facility, lg_rodriguez,  v_supervisor, v_scanning, 'scanning',   'completed', 3.9, true,  'Lazy River',    now() - interval '45 days');

  -- Criteria results for any audit that doesn't have them yet (the new rows)
  perform 1;
end $$;

-- Generate criteria results for newly-inserted audits only
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
      and not exists (select 1 from audit_criteria_results r where r.audit_id = au.id)
  loop
    focus := case a.type_name
      when 'scanning'   then array['scan_4', 'scan_6']
      when 'vat'        then array['vat_1', 'vat_4']
      when 'cpr_skills' then array['cpr_2', 'cpr_4']
      when 'dispatch'   then array['disp_1', 'disp_2']
      else array[]::text[]
    end;

    for crit in select * from jsonb_array_elements(a.criteria)
    loop
      cid := crit ->> 'id';
      insert into audit_criteria_results (audit_id, criterion_id, criterion_label, result, comment)
      values (
        a.id, cid, crit ->> 'label',
        case
          when not a.passed and cid = any(focus) then 'fail'::criterion_result
          when not a.passed and cid = (a.criteria -> 0 ->> 'id') then 'needs_attention'::criterion_result
          when a.passed and a.score < 4.0 and cid = focus[1] then 'needs_attention'::criterion_result
          else 'pass'::criterion_result
        end,
        case when not a.passed and cid = any(focus)
          then 'Observed during audit — remediation assigned.' end
      );
    end loop;
  end loop;
end $$;

-- ── Verify ──────────────────────────────────────────────────────────────────
-- Expect: total audits ~80, oldest ~97 days back, cadence column present
select
  (select count(*) from audits where facility_id = 'a1b2c3d4-0001-0001-0001-000000000001')                       as total_audits,
  (select round(extract(epoch from (now() - min(submitted_at))) / 86400) from audits
    where facility_id = 'a1b2c3d4-0001-0001-0001-000000000001' and submitted_at is not null)                     as oldest_audit_days_ago,
  (select count(*) from information_schema.columns
    where table_name = 'user_profiles' and column_name = 'audit_cadence_override')                               as cadence_column;
