-- ─────────────────────────────────────────────────────────────────────────────
-- 012 — RLS role parity
--
-- Fixes two live RLS defects:
--
--   1. Every policy in 001 gated on get_my_role() in ('supervisor','director').
--      Migration 010 added 'manager' to the user_role enum and the Add-Person UI
--      offers it, but no policy was ever updated — so a manager account passes
--      the app's isManager() check, navigates in, and reads zero rows.
--      'super_admin' (added in 007) was likewise never added to any policy.
--
--   2. `certifications` had RLS ENABLED but NO POLICY AT ALL. In Postgres that
--      is deny-all: the Certifications section of the liability report has been
--      empty for every user, including directors, since launch.
--
-- Role checks now route through three named helpers so adding a role later means
-- editing one function instead of fifteen policies.
--
-- Idempotent: safe to re-run.
-- ─────────────────────────────────────────────────────────────────────────────

-- ─── Role helpers ────────────────────────────────────────────────────────────

-- Staff who may read facility-wide operational data.
create or replace function is_facility_staff()
returns boolean language sql stable as $$
  select get_my_role() in ('supervisor', 'manager', 'director')
$$;

-- Staff who may administer the facility (roster changes, config).
create or replace function is_facility_admin()
returns boolean language sql stable as $$
  select get_my_role() in ('manager', 'director')
$$;

-- Platform-wide readers, not scoped to one facility.
create or replace function is_platform_reader()
returns boolean language sql stable as $$
  select get_my_role() in ('corporate', 'super_admin')
$$;

-- ─── Facilities ──────────────────────────────────────────────────────────────

drop policy if exists "facility_select" on facilities;
create policy "facility_select" on facilities for select
  using (
    id = get_my_facility_id()
    or is_platform_reader()
  );

-- ─── User profiles ───────────────────────────────────────────────────────────

drop policy if exists "profiles_select" on user_profiles;
create policy "profiles_select" on user_profiles for select
  using (
    id = auth.uid()
    or (facility_id = get_my_facility_id() and is_facility_staff())
    or is_platform_reader()
  );

drop policy if exists "profiles_update" on user_profiles;
create policy "profiles_update" on user_profiles for update
  using (
    id = auth.uid()
    or (facility_id = get_my_facility_id() and is_facility_admin())
  );

-- ─── Certifications (previously had NO policy — deny-all) ────────────────────
-- Mirrors the exists-subquery precedent used by criteria_results_select.
-- Writes intentionally omitted: cert mutations go through service-role server
-- actions, the same pattern shift_assignments uses.

drop policy if exists "certifications_select" on certifications;
create policy "certifications_select" on certifications for select
  using (
    user_id = auth.uid()
    or (
      is_facility_staff()
      and exists (
        select 1 from user_profiles up
        where up.id = certifications.user_id
          and up.facility_id = get_my_facility_id()
      )
    )
    or is_platform_reader()
  );

-- ─── Audits ──────────────────────────────────────────────────────────────────

drop policy if exists "audits_select" on audits;
create policy "audits_select" on audits for select
  using (
    lifeguard_id = auth.uid()
    or (facility_id = get_my_facility_id() and is_facility_staff())
    or is_platform_reader()
  );

drop policy if exists "audits_insert" on audits;
create policy "audits_insert" on audits for insert
  with check (
    facility_id = get_my_facility_id()
    and is_facility_staff()
    and supervisor_id = auth.uid()
  );

drop policy if exists "audits_update" on audits;
create policy "audits_update" on audits for update
  using (
    facility_id = get_my_facility_id()
    and is_facility_staff()
    and status = 'in_progress'
  );

-- ─── Criteria results ────────────────────────────────────────────────────────

drop policy if exists "criteria_results_insert" on audit_criteria_results;
create policy "criteria_results_insert" on audit_criteria_results for insert
  with check (
    exists (
      select 1 from audits a
      where a.id = audit_id
        and a.facility_id = get_my_facility_id()
        and is_facility_staff()
    )
  );

-- ─── Remediation tasks ───────────────────────────────────────────────────────

drop policy if exists "remediation_select" on remediation_tasks;
create policy "remediation_select" on remediation_tasks for select
  using (
    lifeguard_id = auth.uid()
    or (facility_id = get_my_facility_id() and is_facility_staff())
    or is_platform_reader()
  );

drop policy if exists "remediation_insert" on remediation_tasks;
create policy "remediation_insert" on remediation_tasks for insert
  with check (
    facility_id = get_my_facility_id()
    and is_facility_staff()
  );

drop policy if exists "remediation_update" on remediation_tasks;
create policy "remediation_update" on remediation_tasks for update
  using (
    facility_id = get_my_facility_id()
    and is_facility_staff()
  );

-- ─── Training sessions ───────────────────────────────────────────────────────

drop policy if exists "training_sessions_select" on training_sessions;
create policy "training_sessions_select" on training_sessions for select
  using (
    facility_id = get_my_facility_id()
    or is_platform_reader()
  );

drop policy if exists "training_sessions_write" on training_sessions;
create policy "training_sessions_write" on training_sessions for all
  using (
    facility_id = get_my_facility_id()
    and is_facility_staff()
  );

-- ─── Audit log ───────────────────────────────────────────────────────────────
-- Parenthesised explicitly; the original relied on `and` binding tighter than `or`.

drop policy if exists "audit_log_select" on audit_log;
create policy "audit_log_select" on audit_log for select
  using (
    (facility_id = get_my_facility_id() and is_facility_staff())
    or is_platform_reader()
  );

-- ─── Verification ────────────────────────────────────────────────────────────

select
  (select count(*) from pg_policies
    where schemaname = 'public' and tablename = 'certifications') as certifications_policies,
  (select count(*) from pg_proc
    where proname in ('is_facility_staff', 'is_facility_admin', 'is_platform_reader')) as role_helpers,
  (select count(*) from pg_policies
    where schemaname = 'public'
      and qual::text like '%get_my_role() = ANY%'
      and qual::text not like '%is_facility%'
      and qual::text not like '%is_platform%') as policies_still_inlining_roles;
