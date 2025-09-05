-- Fix dev database schema to match current production requirements
-- Add missing client_name column to client_access_tokens table

-- Add the missing client_name column
ALTER TABLE client_access_tokens 
ADD COLUMN IF NOT EXISTS client_name TEXT;

-- Update existing records to have client_name if they don't
UPDATE client_access_tokens 
SET client_name = 'Client User' 
WHERE client_name IS NULL;

-- Check the current structure
SELECT 'Current client_access_tokens columns:' as info;
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'client_access_tokens' 
ORDER BY ordinal_position;

SELECT 'Fix dev database schema completed!' as status;