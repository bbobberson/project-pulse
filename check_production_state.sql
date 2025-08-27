-- Check current production database state
-- Run this in your project-pulse-prod SQL Editor

SELECT 'Current tables:' as check;
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;

SELECT 'Projects table structure:' as check;
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'projects' 
ORDER BY ordinal_position;