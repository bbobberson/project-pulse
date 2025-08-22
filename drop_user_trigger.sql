-- Drop the "new user → pm_users" trigger that's causing RLS conflicts
-- Run this in your Supabase SQL Editor

-- 1. Find and display existing triggers on auth.users
SELECT tg.tgname as trigger_name, p.proname as function_name
FROM pg_trigger tg
JOIN pg_class c ON c.oid = tg.tgrelid
JOIN pg_namespace n ON c.relnamespace = n.oid
JOIN pg_proc p ON p.oid = tg.tgfoid
WHERE n.nspname = 'auth' AND c.relname = 'users'
  AND NOT tg.tgisinternal;

-- 2. Drop the most common trigger names (adjust based on step 1 results)
DROP TRIGGER IF EXISTS t_auth_profile ON auth.users;
DROP TRIGGER IF EXISTS t_auth_profile_confirm ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS handle_new_user ON auth.users;

-- 3. Drop the associated functions (adjust names based on your setup)
DROP FUNCTION IF EXISTS public.sync_profile();
DROP FUNCTION IF EXISTS public.sync_profile_on_confirm();
DROP FUNCTION IF EXISTS public.handle_new_user();

-- 4. Verify all triggers are removed
SELECT tg.tgname as remaining_triggers
FROM pg_trigger tg
JOIN pg_class c ON c.oid = tg.tgrelid
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE n.nspname = 'auth' AND c.relname = 'users'
  AND NOT tg.tgisinternal;