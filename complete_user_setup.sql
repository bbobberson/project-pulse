-- Complete user setup after creating auth users
-- Run this AFTER creating both auth users in Supabase Auth UI

-- This script will manually create the pm_users records since the trigger is disabled

-- First, let's see what auth users exist (you'll need to replace the UUIDs with actual ones)
-- SELECT id, email FROM auth.users WHERE email IN ('josh.rothman@infoworks-tn.com', 'jtrothman+jan@gmail.com');

-- Then manually create pm_users records (replace the UUIDs below with actual ones from above query)
-- Example - you'll need to update these UUIDs:

-- INSERT INTO pm_users (id, email, full_name, company, role, invite_status)
-- VALUES 
--   ('JOSH_AUTH_UUID_HERE', 'josh.rothman@infoworks-tn.com', 'Josh Rothman', 'InfoWorks', 'admin', 'accepted'),
--   ('JAN_AUTH_UUID_HERE', 'jtrothman+jan@gmail.com', 'Jan Russell', 'InfoWorks', 'pm', 'accepted');

-- Update invitations to accepted
-- UPDATE pm_invitations 
-- SET invite_status = 'accepted' 
-- WHERE email IN ('josh.rothman@infoworks-tn.com', 'jtrothman+jan@gmail.com');

-- Check results
-- SELECT 'Setup complete!' as status;
-- SELECT id, email, full_name, role FROM pm_users;

SELECT 'Follow the steps in comments above after creating auth users' as instructions;