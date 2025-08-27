-- Create both users in production database
-- Run this in your project-pulse-prod SQL Editor

-- 1. Disable the problematic trigger temporarily
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- 2. Create invitation records for both users
INSERT INTO pm_invitations (email, full_name, company, role, invite_status) 
VALUES 
  ('josh.rothman@infoworks-tn.com', 'Josh Rothman', 'InfoWorks', 'admin', 'pending'),
  ('jtrothman+jan@gmail.com', 'Jan Russell', 'InfoWorks', 'pm', 'pending')
ON CONFLICT DO NOTHING;

-- 3. Check our setup
SELECT 'Invitations created. Now create auth users manually then run the next script.' as status;
SELECT email, full_name, role FROM pm_invitations 
WHERE email IN ('josh.rothman@infoworks-tn.com', 'jtrothman+jan@gmail.com');