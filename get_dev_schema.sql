-- Get actual dev database schema
-- Run this in your project-pulse (dev) Supabase SQL Editor

-- Get all table structures
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable,
    column_default,
    character_maximum_length
FROM information_schema.columns 
WHERE table_schema = 'public' 
ORDER BY table_name, ordinal_position;