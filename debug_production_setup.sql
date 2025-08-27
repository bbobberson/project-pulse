-- Debug production database setup
-- Run this in your project-pulse-prod SQL Editor to check what's working

-- 1. Check if tables exist
SELECT 'Tables check:' as status;
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- 2. Check if functions exist
SELECT 'Functions check:' as status;
SELECT routine_name FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_type = 'FUNCTION';

-- 3. Check if triggers exist
SELECT 'Triggers check:' as status;
SELECT trigger_name, event_object_table 
FROM information_schema.triggers 
WHERE trigger_schema = 'public';

-- 4. Check pm_invitations table
SELECT 'PM Invitations check:' as status;
SELECT * FROM pm_invitations;

-- 5. Try a simple test of the trigger function
SELECT 'Testing trigger function:' as status;
SELECT handle_new_pm_user();