-- PoolControl.ai — Demo Seed Data
-- Run AFTER 001 and 002. Safe to re-run (uses explicit UUIDs + ON CONFLICT).
-- Remove this file / truncate the tables before going to production.

DO $$
DECLARE
  v_facility_id   uuid := 'a1b2c3d4-0001-0001-0001-000000000001'::uuid;
  v_supervisor_id uuid;

  v_scanning_id   uuid;
  v_vat_id        uuid;
  v_cpr_id        uuid;
  v_dispatch_id   uuid;

  -- Stable lifeguard UUIDs
  lg_brooks       uuid := 'b0000001-0000-0000-0000-000000000001'::uuid;
  lg_webb         uuid := 'b0000001-0000-0000-0000-000000000002'::uuid;
  lg_winters      uuid := 'b0000001-0000-0000-0000-000000000003'::uuid;
  lg_novak        uuid := 'b0000001-0000-0000-0000-000000000004'::uuid;
  lg_williams     uuid := 'b0000001-0000-0000-0000-000000000005'::uuid;
  lg_rodriguez    uuid := 'b0000001-0000-0000-0000-000000000006'::uuid;
  lg_singh        uuid := 'b0000001-0000-0000-0000-000000000007'::uuid;
  lg_park         uuid := 'b0000001-0000-0000-0000-000000000008'::uuid;
  lg_osei         uuid := 'b0000001-0000-0000-0000-000000000009'::uuid;
  lg_castellano   uuid := 'b0000001-0000-0000-0000-000000000010'::uuid;
  lg_chen         uuid := 'b0000001-0000-0000-0000-000000000011'::uuid;
  lg_kowalski     uuid := 'b0000001-0000-0000-0000-000000000012'::uuid;
  lg_turner       uuid := 'b0000001-0000-0000-0000-000000000013'::uuid;
  lg_okafor       uuid := 'b0000001-0000-0000-0000-000000000014'::uuid;

BEGIN
  -- ── 1. Resolve supervisor (first auth user = you) ─────────────────────────
  SELECT id INTO v_supervisor_id FROM auth.users ORDER BY created_at LIMIT 1;

  -- ── 2. Facility ───────────────────────────────────────────────────────────
  INSERT INTO facilities (id, name, cert_body, timezone, config)
  VALUES (
    v_facility_id,
    'Coral Bay Aquatic Center',
    'ellis',
    'America/Chicago',
    '{
      "remediation_deadline_hours": 48,
      "audit_cadence": {
        "scanning": 7, "vat": 30, "cpr_skills": 30, "dispatch": 30,
        "supervisor_eavs": 30, "guest_service": 14, "cleaning": 7
      },
      "zones": ["Main Pool", "Wave Pool", "Lazy River", "Activity Pool", "Kiddie Pool"]
    }'::jsonb
  )
  ON CONFLICT (id) DO NOTHING;

  -- ── 3. Supervisor profile (update your existing profile) ──────────────────
  INSERT INTO user_profiles (id, facility_id, role, name, email, avatar_color)
  VALUES (v_supervisor_id, v_facility_id, 'director', 'You (Director)', 'director@demo.com', '#6366f1')
  ON CONFLICT (id) DO UPDATE SET facility_id = v_facility_id, role = 'director';

  -- ── 4. Audit type IDs ─────────────────────────────────────────────────────
  SELECT id INTO v_scanning_id  FROM audit_types WHERE name = 'scanning'   AND cert_body = 'ellis';
  SELECT id INTO v_vat_id       FROM audit_types WHERE name = 'vat'        AND cert_body = 'ellis';
  SELECT id INTO v_cpr_id       FROM audit_types WHERE name = 'cpr_skills' AND cert_body = 'ellis';
  SELECT id INTO v_dispatch_id  FROM audit_types WHERE name = 'dispatch'   AND cert_body = 'ellis';

  -- ── 5. Fake auth.users entries for demo lifeguards ────────────────────────
  -- We insert directly into auth.users so the FK from user_profiles is satisfied.
  INSERT INTO auth.users (
    id, instance_id, email, encrypted_password, email_confirmed_at,
    created_at, updated_at, raw_app_meta_data, raw_user_meta_data,
    is_super_admin, role, aud
  ) VALUES
    (lg_brooks,     '00000000-0000-0000-0000-000000000000', 'i.brooks@demo.com',     '', now(), now(), now(), '{"provider":"email","providers":["email"]}', '{}', false, 'authenticated', 'authenticated'),
    (lg_webb,       '00000000-0000-0000-0000-000000000000', 'm.webb@demo.com',       '', now(), now(), now(), '{"provider":"email","providers":["email"]}', '{}', false, 'authenticated', 'authenticated'),
    (lg_winters,    '00000000-0000-0000-0000-000000000000', 'c.winters@demo.com',    '', now(), now(), now(), '{"provider":"email","providers":["email"]}', '{}', false, 'authenticated', 'authenticated'),
    (lg_novak,      '00000000-0000-0000-0000-000000000000', 't.novak@demo.com',      '', now(), now(), now(), '{"provider":"email","providers":["email"]}', '{}', false, 'authenticated', 'authenticated'),
    (lg_williams,   '00000000-0000-0000-0000-000000000000', 'j.williams@demo.com',   '', now(), now(), now(), '{"provider":"email","providers":["email"]}', '{}', false, 'authenticated', 'authenticated'),
    (lg_rodriguez,  '00000000-0000-0000-0000-000000000000', 'd.rodriguez@demo.com',  '', now(), now(), now(), '{"provider":"email","providers":["email"]}', '{}', false, 'authenticated', 'authenticated'),
    (lg_singh,      '00000000-0000-0000-0000-000000000000', 'a.singh@demo.com',      '', now(), now(), now(), '{"provider":"email","providers":["email"]}', '{}', false, 'authenticated', 'authenticated'),
    (lg_park,       '00000000-0000-0000-0000-000000000000', 'j.park@demo.com',       '', now(), now(), now(), '{"provider":"email","providers":["email"]}', '{}', false, 'authenticated', 'authenticated'),
    (lg_osei,       '00000000-0000-0000-0000-000000000000', 'b.osei@demo.com',       '', now(), now(), now(), '{"provider":"email","providers":["email"]}', '{}', false, 'authenticated', 'authenticated'),
    (lg_castellano, '00000000-0000-0000-0000-000000000000', 'r.castellano@demo.com', '', now(), now(), now(), '{"provider":"email","providers":["email"]}', '{}', false, 'authenticated', 'authenticated'),
    (lg_chen,       '00000000-0000-0000-0000-000000000000', 'd.chen@demo.com',       '', now(), now(), now(), '{"provider":"email","providers":["email"]}', '{}', false, 'authenticated', 'authenticated'),
    (lg_kowalski,   '00000000-0000-0000-0000-000000000000', 'l.kowalski@demo.com',   '', now(), now(), now(), '{"provider":"email","providers":["email"]}', '{}', false, 'authenticated', 'authenticated'),
    (lg_turner,     '00000000-0000-0000-0000-000000000000', 'k.turner@demo.com',     '', now(), now(), now(), '{"provider":"email","providers":["email"]}', '{}', false, 'authenticated', 'authenticated'),
    (lg_okafor,     '00000000-0000-0000-0000-000000000000', 's.okafor@demo.com',     '', now(), now(), now(), '{"provider":"email","providers":["email"]}', '{}', false, 'authenticated', 'authenticated')
  ON CONFLICT (id) DO NOTHING;

  -- ── 6. Lifeguard profiles ─────────────────────────────────────────────────
  INSERT INTO user_profiles (id, facility_id, role, name, email, hire_date, avatar_color, employee_id)
  VALUES
    -- HIGH priority (will sort to top)
    (lg_brooks,     v_facility_id, 'lifeguard', 'Isaiah Brooks',     'i.brooks@demo.com',     '2023-03-15', '#ef4444', 'LG-001'),
    (lg_webb,       v_facility_id, 'lifeguard', 'Marcus Webb',       'm.webb@demo.com',       '2026-01-20', '#f97316', 'LG-002'),
    (lg_winters,    v_facility_id, 'lifeguard', 'Caleb Winters',     'c.winters@demo.com',    '2024-06-01', '#fbbf24', 'LG-003'),
    -- MED priority
    (lg_novak,      v_facility_id, 'lifeguard', 'Tyler Novak',       't.novak@demo.com',      '2025-08-15', '#ec4899', 'LG-004'),
    (lg_williams,   v_facility_id, 'lifeguard', 'Jade Williams',     'j.williams@demo.com',   '2024-03-08', '#a855f7', 'LG-005'),
    (lg_rodriguez,  v_facility_id, 'lifeguard', 'Destiny Rodriguez', 'd.rodriguez@demo.com',  '2024-09-12', '#f59e0b', 'LG-006'),
    (lg_singh,      v_facility_id, 'lifeguard', 'Amara Singh',       'a.singh@demo.com',      '2025-05-20', '#3b82f6', 'LG-007'),
    -- ON TRACK
    (lg_park,       v_facility_id, 'lifeguard', 'Jordan Park',       'j.park@demo.com',       '2022-05-10', '#14b8a6', 'LG-008'),
    (lg_osei,       v_facility_id, 'lifeguard', 'Brianna Osei',      'b.osei@demo.com',       '2023-11-01', '#10b981', 'LG-009'),
    (lg_castellano, v_facility_id, 'lifeguard', 'Ryan Castellano',   'r.castellano@demo.com', '2023-06-20', '#22c55e', 'LG-010'),
    (lg_chen,       v_facility_id, 'lifeguard', 'Devon Chen',        'd.chen@demo.com',       '2021-04-05', '#6366f1', 'LG-011'),
    (lg_kowalski,   v_facility_id, 'lifeguard', 'Lily Kowalski',     'l.kowalski@demo.com',   '2025-11-30', '#d946ef', 'LG-012'),
    (lg_turner,     v_facility_id, 'lifeguard', 'Kezia Turner',      'k.turner@demo.com',     '2024-01-15', '#0ea5e9', 'LG-013'),
    (lg_okafor,     v_facility_id, 'lifeguard', 'Sam Okafor',        's.okafor@demo.com',     '2023-08-22', '#84cc16', 'LG-014')
  ON CONFLICT (id) DO NOTHING;

  -- ── 7. Audit history ──────────────────────────────────────────────────────
  -- Scanning cadence=7d: overdue if >7d or null, due_today if 6–7d, ok if <6d
  -- VAT/CPR/Dispatch cadence=30d: overdue if >30d or null, due_today if 29–30d

  -- Isaiah Brooks — HIGH (scanning null→overdue, dispatch null→overdue, VAT failed)
  INSERT INTO audits (facility_id, lifeguard_id, supervisor_id, audit_type_id, audit_type_name, status, score, passed, zone, submitted_at) VALUES
    (v_facility_id, lg_brooks, v_supervisor_id, v_vat_id, 'vat',        'remediated', 2.4, false, 'Wave Pool', NOW() - INTERVAL '18 days'),
    (v_facility_id, lg_brooks, v_supervisor_id, v_cpr_id, 'cpr_skills', 'completed',  3.2, true,  'Main Pool', NOW() - INTERVAL '12 days')
  ON CONFLICT DO NOTHING;
  -- scanning + dispatch intentionally missing → null → overdue

  -- Marcus Webb — HIGH (brand-new hire, only CPR on record)
  INSERT INTO audits (facility_id, lifeguard_id, supervisor_id, audit_type_id, audit_type_name, status, score, passed, zone, submitted_at) VALUES
    (v_facility_id, lg_webb, v_supervisor_id, v_cpr_id, 'cpr_skills', 'completed', 3.8, true, 'Kiddie Pool', NOW() - INTERVAL '5 days')
  ON CONFLICT DO NOTHING;

  -- Caleb Winters — HIGH (scanning 10d→overdue, VAT 38d→overdue)
  INSERT INTO audits (facility_id, lifeguard_id, supervisor_id, audit_type_id, audit_type_name, status, score, passed, zone, submitted_at) VALUES
    (v_facility_id, lg_winters, v_supervisor_id, v_scanning_id, 'scanning',   'completed', 3.3, true, 'Wave Pool',     NOW() - INTERVAL '10 days'),
    (v_facility_id, lg_winters, v_supervisor_id, v_vat_id,      'vat',        'completed', 3.0, true, 'Wave Pool',     NOW() - INTERVAL '38 days'),
    (v_facility_id, lg_winters, v_supervisor_id, v_cpr_id,      'cpr_skills', 'completed', 3.6, true, 'Activity Pool', NOW() - INTERVAL '15 days'),
    (v_facility_id, lg_winters, v_supervisor_id, v_dispatch_id, 'dispatch',   'completed', 3.8, true, 'Wave Pool',     NOW() - INTERVAL '20 days')
  ON CONFLICT DO NOTHING;

  -- Tyler Novak — MED (scanning 8d→overdue, overdueCount=1)
  INSERT INTO audits (facility_id, lifeguard_id, supervisor_id, audit_type_id, audit_type_name, status, score, passed, zone, submitted_at) VALUES
    (v_facility_id, lg_novak, v_supervisor_id, v_scanning_id, 'scanning',   'completed', 3.1, true, 'Kiddie Pool', NOW() - INTERVAL '8 days'),
    (v_facility_id, lg_novak, v_supervisor_id, v_vat_id,      'vat',        'completed', 3.4, true, 'Kiddie Pool', NOW() - INTERVAL '20 days'),
    (v_facility_id, lg_novak, v_supervisor_id, v_cpr_id,      'cpr_skills', 'completed', 3.8, true, 'Main Pool',   NOW() - INTERVAL '11 days'),
    (v_facility_id, lg_novak, v_supervisor_id, v_dispatch_id, 'dispatch',   'completed', 3.5, true, 'Kiddie Pool', NOW() - INTERVAL '25 days')
  ON CONFLICT DO NOTHING;

  -- Jade Williams — MED (dispatch 33d→overdue, overdueCount=1)
  INSERT INTO audits (facility_id, lifeguard_id, supervisor_id, audit_type_id, audit_type_name, status, score, passed, zone, submitted_at) VALUES
    (v_facility_id, lg_williams, v_supervisor_id, v_scanning_id, 'scanning',   'completed', 4.5, true, 'Main Pool', NOW() - INTERVAL '3 days'),
    (v_facility_id, lg_williams, v_supervisor_id, v_vat_id,      'vat',        'completed', 4.2, true, 'Main Pool', NOW() - INTERVAL '11 days'),
    (v_facility_id, lg_williams, v_supervisor_id, v_cpr_id,      'cpr_skills', 'completed', 4.0, true, 'Main Pool', NOW() - INTERVAL '14 days'),
    (v_facility_id, lg_williams, v_supervisor_id, v_dispatch_id, 'dispatch',   'completed', 3.9, true, 'Wave Pool', NOW() - INTERVAL '33 days')
  ON CONFLICT DO NOTHING;

  -- Destiny Rodriguez — MED (VAT failed 5d ago, recentFails=1)
  INSERT INTO audits (facility_id, lifeguard_id, supervisor_id, audit_type_id, audit_type_name, status, score, passed, zone, submitted_at) VALUES
    (v_facility_id, lg_rodriguez, v_supervisor_id, v_scanning_id, 'scanning',   'completed',  4.2, true,  'Lazy River', NOW() - INTERVAL '4 days'),
    (v_facility_id, lg_rodriguez, v_supervisor_id, v_vat_id,      'vat',        'remediated', 2.2, false, 'Lazy River', NOW() - INTERVAL '5 days'),
    (v_facility_id, lg_rodriguez, v_supervisor_id, v_cpr_id,      'cpr_skills', 'completed',  4.1, true,  'Main Pool',  NOW() - INTERVAL '11 days'),
    (v_facility_id, lg_rodriguez, v_supervisor_id, v_dispatch_id, 'dispatch',   'completed',  4.4, true,  'Lazy River', NOW() - INTERVAL '8 days')
  ON CONFLICT DO NOTHING;

  -- Amara Singh — MED (CPR failed 8d ago, recentFails=1; scanning due_today)
  INSERT INTO audits (facility_id, lifeguard_id, supervisor_id, audit_type_id, audit_type_name, status, score, passed, zone, submitted_at) VALUES
    (v_facility_id, lg_singh, v_supervisor_id, v_scanning_id, 'scanning',   'completed',  3.9, true,  'Activity Pool', NOW() - INTERVAL '6 days'),
    (v_facility_id, lg_singh, v_supervisor_id, v_vat_id,      'vat',        'completed',  3.5, true,  'Activity Pool', NOW() - INTERVAL '14 days'),
    (v_facility_id, lg_singh, v_supervisor_id, v_cpr_id,      'cpr_skills', 'remediated', 2.6, false, 'Main Pool',     NOW() - INTERVAL '8 days'),
    (v_facility_id, lg_singh, v_supervisor_id, v_dispatch_id, 'dispatch',   'completed',  3.7, true,  'Activity Pool', NOW() - INTERVAL '18 days')
  ON CONFLICT DO NOTHING;

  -- Jordan Park — ON TRACK (top performer; VAT 29d→due_today)
  INSERT INTO audits (facility_id, lifeguard_id, supervisor_id, audit_type_id, audit_type_name, status, score, passed, zone, submitted_at) VALUES
    (v_facility_id, lg_park, v_supervisor_id, v_scanning_id, 'scanning',   'completed', 4.9, true, 'Wave Pool', NOW() - INTERVAL '2 days'),
    (v_facility_id, lg_park, v_supervisor_id, v_vat_id,      'vat',        'completed', 5.0, true, 'Wave Pool', NOW() - INTERVAL '29 days'),
    (v_facility_id, lg_park, v_supervisor_id, v_cpr_id,      'cpr_skills', 'completed', 4.8, true, 'Main Pool', NOW() - INTERVAL '9 days'),
    (v_facility_id, lg_park, v_supervisor_id, v_dispatch_id, 'dispatch',   'completed', 4.9, true, 'Wave Pool', NOW() - INTERVAL '13 days')
  ON CONFLICT DO NOTHING;

  -- Brianna Osei — ON TRACK (scanning done this morning)
  INSERT INTO audits (facility_id, lifeguard_id, supervisor_id, audit_type_id, audit_type_name, status, score, passed, zone, submitted_at) VALUES
    (v_facility_id, lg_osei, v_supervisor_id, v_scanning_id, 'scanning',   'completed', 4.4, true, 'Lazy River', NOW() - INTERVAL '2 hours'),
    (v_facility_id, lg_osei, v_supervisor_id, v_vat_id,      'vat',        'completed', 4.6, true, 'Lazy River', NOW() - INTERVAL '4 days'),
    (v_facility_id, lg_osei, v_supervisor_id, v_cpr_id,      'cpr_skills', 'completed', 4.2, true, 'Main Pool',  NOW() - INTERVAL '10 days'),
    (v_facility_id, lg_osei, v_supervisor_id, v_dispatch_id, 'dispatch',   'completed', 4.5, true, 'Lazy River', NOW() - INTERVAL '14 days')
  ON CONFLICT DO NOTHING;

  -- Ryan Castellano — ON TRACK (steady 3-year guard)
  INSERT INTO audits (facility_id, lifeguard_id, supervisor_id, audit_type_id, audit_type_name, status, score, passed, zone, submitted_at) VALUES
    (v_facility_id, lg_castellano, v_supervisor_id, v_scanning_id, 'scanning',   'completed', 4.1, true, 'Activity Pool', NOW() - INTERVAL '4 days'),
    (v_facility_id, lg_castellano, v_supervisor_id, v_vat_id,      'vat',        'completed', 3.9, true, 'Activity Pool', NOW() - INTERVAL '12 days'),
    (v_facility_id, lg_castellano, v_supervisor_id, v_cpr_id,      'cpr_skills', 'completed', 4.3, true, 'Main Pool',     NOW() - INTERVAL '19 days'),
    (v_facility_id, lg_castellano, v_supervisor_id, v_dispatch_id, 'dispatch',   'completed', 4.0, true, 'Activity Pool', NOW() - INTERVAL '23 days')
  ON CONFLICT DO NOTHING;

  -- Devon Chen — ON TRACK (5-year veteran, exemplary)
  INSERT INTO audits (facility_id, lifeguard_id, supervisor_id, audit_type_id, audit_type_name, status, score, passed, zone, submitted_at) VALUES
    (v_facility_id, lg_chen, v_supervisor_id, v_scanning_id, 'scanning',   'completed', 4.7, true, 'Wave Pool', NOW() - INTERVAL '1 day'),
    (v_facility_id, lg_chen, v_supervisor_id, v_vat_id,      'vat',        'completed', 4.8, true, 'Wave Pool', NOW() - INTERVAL '7 days'),
    (v_facility_id, lg_chen, v_supervisor_id, v_cpr_id,      'cpr_skills', 'completed', 4.9, true, 'Main Pool', NOW() - INTERVAL '14 days'),
    (v_facility_id, lg_chen, v_supervisor_id, v_dispatch_id, 'dispatch',   'completed', 4.7, true, 'Wave Pool', NOW() - INTERVAL '21 days')
  ON CONFLICT DO NOTHING;

  -- Lily Kowalski — ON TRACK (newest guard; scanning 6d→due_today)
  INSERT INTO audits (facility_id, lifeguard_id, supervisor_id, audit_type_id, audit_type_name, status, score, passed, zone, submitted_at) VALUES
    (v_facility_id, lg_kowalski, v_supervisor_id, v_scanning_id, 'scanning',   'completed', 3.8, true, 'Kiddie Pool', NOW() - INTERVAL '6 days'),
    (v_facility_id, lg_kowalski, v_supervisor_id, v_vat_id,      'vat',        'completed', 3.6, true, 'Kiddie Pool', NOW() - INTERVAL '9 days'),
    (v_facility_id, lg_kowalski, v_supervisor_id, v_cpr_id,      'cpr_skills', 'completed', 4.2, true, 'Main Pool',   NOW() - INTERVAL '15 days'),
    (v_facility_id, lg_kowalski, v_supervisor_id, v_dispatch_id, 'dispatch',   'completed', 3.9, true, 'Kiddie Pool', NOW() - INTERVAL '11 days')
  ON CONFLICT DO NOTHING;

  -- Kezia Turner — ON TRACK (VAT 29d→due_today)
  INSERT INTO audits (facility_id, lifeguard_id, supervisor_id, audit_type_id, audit_type_name, status, score, passed, zone, submitted_at) VALUES
    (v_facility_id, lg_turner, v_supervisor_id, v_scanning_id, 'scanning',   'completed', 4.0, true, 'Main Pool',  NOW() - INTERVAL '5 days'),
    (v_facility_id, lg_turner, v_supervisor_id, v_vat_id,      'vat',        'completed', 3.8, true, 'Main Pool',  NOW() - INTERVAL '29 days'),
    (v_facility_id, lg_turner, v_supervisor_id, v_cpr_id,      'cpr_skills', 'completed', 4.1, true, 'Main Pool',  NOW() - INTERVAL '22 days'),
    (v_facility_id, lg_turner, v_supervisor_id, v_dispatch_id, 'dispatch',   'completed', 3.9, true, 'Lazy River', NOW() - INTERVAL '17 days')
  ON CONFLICT DO NOTHING;

  -- Sam Okafor — ON TRACK (consistent, no drama)
  INSERT INTO audits (facility_id, lifeguard_id, supervisor_id, audit_type_id, audit_type_name, status, score, passed, zone, submitted_at) VALUES
    (v_facility_id, lg_okafor, v_supervisor_id, v_scanning_id, 'scanning',   'completed', 4.3, true, 'Activity Pool', NOW() - INTERVAL '4 days'),
    (v_facility_id, lg_okafor, v_supervisor_id, v_vat_id,      'vat',        'completed', 4.1, true, 'Activity Pool', NOW() - INTERVAL '11 days'),
    (v_facility_id, lg_okafor, v_supervisor_id, v_cpr_id,      'cpr_skills', 'completed', 4.4, true, 'Main Pool',     NOW() - INTERVAL '19 days'),
    (v_facility_id, lg_okafor, v_supervisor_id, v_dispatch_id, 'dispatch',   'completed', 4.2, true, 'Activity Pool', NOW() - INTERVAL '24 days')
  ON CONFLICT DO NOTHING;

END;
$$;
