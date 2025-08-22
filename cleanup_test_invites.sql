-- Clean up test invitation data
-- Run this in your Supabase SQL Editor (Dev project)

-- 1. Delete any test projects linked to test users
DELETE FROM public.projects
WHERE pm_user_id IN (
  SELECT id FROM public.pm_users
  WHERE email LIKE 'jtrothman+%@gmail.com'
     OR email LIKE '%+test%@gmail.com'
     OR full_name = ''
     OR full_name IS NULL
);

-- 2. Delete test invitations
DELETE FROM public.pm_invitations
WHERE email LIKE 'jtrothman+%@gmail.com'
   OR email LIKE '%+test%@gmail.com';

-- 3. Delete incomplete/test PM users (unnamed, pending, or test emails)
DELETE FROM public.pm_users
WHERE email LIKE 'jtrothman+%@gmail.com'
   OR email LIKE '%+test%@gmail.com'
   OR full_name = ''
   OR full_name IS NULL
   OR invite_status != 'accepted';

-- 4. Show remaining PM users (should only be real, accepted ones)
SELECT email, full_name, invite_status, is_active, created_at
FROM public.pm_users
ORDER BY created_at DESC;