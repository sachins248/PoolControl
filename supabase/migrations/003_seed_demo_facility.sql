-- PoolControl.ai — Demo Seed: Great Wolf Lodge Grapevine facility + 8 lifeguards
-- NOTE: Run AFTER creating real auth.users via Supabase Auth console or invitation
-- This seeds the user_profiles table assuming the auth users exist.
-- Replace UUIDs with actual auth.users IDs from your Supabase project.

-- Demo facility
insert into facilities (id, name, cert_body, timezone, config) values (
  'f1000000-0000-0000-0000-000000000001',
  'GV Aquatics — Great Wolf Lodge Grapevine',
  'ellis',
  'America/Chicago',
  '{
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
    "zones": ["Main Pool", "Wave Pool", "Lazy River", "Activity Pool", "Kiddie Pool", "Main Pool Deck"]
  }'::jsonb
) on conflict do nothing;

-- Demo users (supervisor + lifeguards)
-- In production: create via Supabase Auth invite, then insert profiles
-- For dev: you can temporarily disable RLS and insert directly

/*
insert into user_profiles (id, facility_id, role, name, employee_id, hire_date, email, avatar_color) values
  ('00000000-0000-0000-0000-000000000001', 'f1000000-0000-0000-0000-000000000001', 'supervisor', 'Nate Rusch', 'EMP-001', '2023-05-01', 'nate@poolcontrol.ai', '#6366f1'),
  ('00000000-0000-0000-0000-000000000002', 'f1000000-0000-0000-0000-000000000001', 'lifeguard', 'Nathan Rusch', 'EMP-101', '2024-06-01', 'nathan.r@gwl.com', '#3b82f6'),
  ('00000000-0000-0000-0000-000000000003', 'f1000000-0000-0000-0000-000000000001', 'lifeguard', 'Maria Santos', 'EMP-102', '2024-05-15', 'maria.s@gwl.com', '#8b5cf6'),
  ('00000000-0000-0000-0000-000000000004', 'f1000000-0000-0000-0000-000000000001', 'lifeguard', 'Jake Williams', 'EMP-103', '2024-06-10', 'jake.w@gwl.com', '#10b981'),
  ('00000000-0000-0000-0000-000000000005', 'f1000000-0000-0000-0000-000000000001', 'lifeguard', 'Aisha Thompson', 'EMP-104', '2024-04-20', 'aisha.t@gwl.com', '#f59e0b'),
  ('00000000-0000-0000-0000-000000000006', 'f1000000-0000-0000-0000-000000000001', 'lifeguard', 'Carlos Rivera', 'EMP-105', '2023-07-01', 'carlos.r@gwl.com', '#ef4444'),
  ('00000000-0000-0000-0000-000000000007', 'f1000000-0000-0000-0000-000000000001', 'lifeguard', 'Priya Patel', 'EMP-106', '2024-03-15', 'priya.p@gwl.com', '#ec4899'),
  ('00000000-0000-0000-0000-000000000008', 'f1000000-0000-0000-0000-000000000001', 'lifeguard', 'Derek Moss', 'EMP-107', '2024-07-01', 'derek.m@gwl.com', '#14b8a6'),
  ('00000000-0000-0000-0000-000000000009', 'f1000000-0000-0000-0000-000000000001', 'lifeguard', 'Sofia Brennan', 'EMP-108', '2024-06-20', 'sofia.b@gwl.com', '#f97316')
on conflict do nothing;
*/
