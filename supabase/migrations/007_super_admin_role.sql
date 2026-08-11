-- Add super_admin to the user_role enum
-- After running this, manually set your own user_profiles.role = 'super_admin' via Supabase SQL editor:
--   UPDATE user_profiles SET role = 'super_admin' WHERE email = 'your@email.com';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'super_admin';
