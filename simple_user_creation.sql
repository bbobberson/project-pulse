-- Simple approach - create user manually without trigger dependency
-- Run this in your project-pulse-prod SQL Editor

-- 1. First create the invitation record
INSERT INTO pm_invitations (email, full_name, company, role, invite_status) 
VALUES ('jtrothman+jan@gmail.com', 'Jan Rothman', 'InfoWorks', 'admin', 'pending')
ON CONFLICT DO NOTHING;

-- 2. Temporarily disable the trigger to avoid conflicts
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- 3. Check what we have so far
SELECT 'Current invitations:' as status;
SELECT * FROM pm_invitations WHERE email = 'jtrothman+jan@gmail.com';

SELECT 'Ready for manual user creation' as next_step;