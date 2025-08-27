-- Create test user in production database
-- Run this AFTER setting up the main database schema

-- 1. First, create an invitation for the test user
INSERT INTO pm_invitations (email, full_name, company, role, invite_status) 
VALUES ('jtrothman+jan@gmail.com', 'Jan Rothman', 'InfoWorks', 'admin', 'pending')
ON CONFLICT DO NOTHING;

-- 2. You'll need to manually create the auth user through Supabase Auth
-- Go to Authentication > Users > Add User in your Supabase dashboard:
-- Email: jtrothman+jan@gmail.com
-- Password: 999999
-- Confirm email: Yes

-- 3. After creating the auth user, the trigger will automatically create the pm_users record

-- Check if everything worked:
SELECT 'Setup complete! Check these queries:' as status;
SELECT 'Invitations:' as check1;
SELECT * FROM pm_invitations WHERE email = 'jtrothman+jan@gmail.com';
SELECT 'PM Users (run after creating auth user):' as check2;  
SELECT * FROM pm_users WHERE email = 'jtrothman+jan@gmail.com';