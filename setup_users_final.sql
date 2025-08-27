-- Setup users in production (final version)
-- Run this in your project-pulse-prod SQL Editor

-- 1. Remove the broken trigger first
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- 2. Create invitations for both users
INSERT INTO pm_invitations (email, full_name, company, role, invite_status) 
VALUES 
  ('josh.rothman@infoworks-tn.com', 'Josh Rothman', 'InfoWorks', 'admin', 'accepted'),
  ('jtrothman+jan@gmail.com', 'Jan Russell', 'InfoWorks', 'pm', 'accepted')
ON CONFLICT (email) DO UPDATE SET 
  full_name = EXCLUDED.full_name,
  role = EXCLUDED.role,
  invite_status = EXCLUDED.invite_status;

-- 3. Check current auth users
SELECT 'Current auth users:' as status;
SELECT id, email FROM auth.users WHERE email IN ('josh.rothman@infoworks-tn.com', 'jtrothman+jan@gmail.com');

SELECT 'Next: Create auth users in Supabase UI, then run the INSERT statements below' as next_step;