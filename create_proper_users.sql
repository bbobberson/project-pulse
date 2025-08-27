-- Create proper user records in production
-- Run this AFTER running the schema fix and creating auth users

-- 1. Create both users in pm_invitations first
INSERT INTO pm_invitations (email, full_name, company, role, invite_status) 
VALUES 
  ('josh.rothman@infoworks-tn.com', 'Josh Rothman', 'InfoWorks', 'admin', 'accepted'),
  ('jtrothman+jan@gmail.com', 'Jan Russell', 'InfoWorks', 'pm', 'accepted')
ON CONFLICT (email) DO UPDATE SET 
  full_name = EXCLUDED.full_name,
  role = EXCLUDED.role,
  invite_status = EXCLUDED.invite_status;

-- 2. After creating auth users in Supabase UI, run this to create pm_users records:
-- (Replace the UUIDs with actual ones from auth.users table)

-- First check what auth users exist:
-- SELECT id, email FROM auth.users WHERE email IN ('josh.rothman@infoworks-tn.com', 'jtrothman+jan@gmail.com');

-- Then insert pm_users records (update the UUIDs):
-- INSERT INTO pm_users (id, email, full_name, company, role, invite_status)
-- VALUES 
--   ('YOUR_JOSH_UUID_HERE', 'josh.rothman@infoworks-tn.com', 'Josh Rothman', 'InfoWorks', 'admin', 'accepted'),
--   ('YOUR_JAN_UUID_HERE', 'jtrothman+jan@gmail.com', 'Jan Russell', 'InfoWorks', 'pm', 'accepted')
-- ON CONFLICT (id) DO UPDATE SET
--   full_name = EXCLUDED.full_name,
--   role = EXCLUDED.role,
--   invite_status = EXCLUDED.invite_status;

SELECT 'Invitations created. Create auth users, then run the commented SQL above.' as next_step;