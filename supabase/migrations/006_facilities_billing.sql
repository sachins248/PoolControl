-- Add billing/trial tracking to facilities
alter table facilities
  add column if not exists plan text not null default 'trial',
  add column if not exists billing_status text not null default 'active',
  add column if not exists trial_ends_at timestamptz not null default (now() + interval '14 days');
