-- Setup users in production (simple version)
-- Run this in your project-pulse-prod SQL Editor

-- 1. Remove the broken trigger first
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- 2. Add unique constraint to pm_invitations if it doesn't exist
CREATE UNIQUE INDEX IF NOT EXISTS pm_invitations_email_unique ON pm_invitations(email);

-- 3. Create invitations for both users (simple insert)
DELETE FROM pm_invitations WHERE email IN ('josh.rothman@infoworks-tn.com', 'jtrothman+jan@gmail.com');

INSERT INTO pm_invitations (email, full_name, company, role, invite_status) 
VALUES 
  ('josh.rothman@infoworks-tn.com', 'Josh Rothman', 'InfoWorks', 'admin', 'accepted'),
  ('jtrothman+jan@gmail.com', 'Jan Russell', 'InfoWorks', 'pm', 'accepted');

-- 4. Check what we have
SELECT 'Invitations created:' as status;
SELECT email, full_name, role FROM pm_invitations WHERE email IN ('josh.rothman@infoworks-tn.com', 'jtrothman+jan@gmail.com');

SELECT 'Ready to create auth users in Supabase UI' as next_step;