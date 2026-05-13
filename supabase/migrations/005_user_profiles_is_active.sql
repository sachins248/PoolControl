-- Add is_active flag to user_profiles
-- Allows deactivating users without deleting rows (preserves audit history / FK integrity)
alter table user_profiles add column if not exists is_active boolean not null default true;
