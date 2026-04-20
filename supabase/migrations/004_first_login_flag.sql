-- PoolControl.ai — Add first-login flag to user_profiles
-- Allows the auth callback to detect a brand-new user and show the welcome screen

alter table user_profiles
  add column if not exists is_first_login boolean not null default false;
