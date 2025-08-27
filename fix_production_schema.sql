-- Fix production database to match dev schema exactly
-- Run this in your project-pulse-prod Supabase SQL Editor

-- First drop the incomplete setup if it exists
DROP TABLE IF EXISTS pulse_updates CASCADE;
DROP TABLE IF EXISTS roadmap_tasks CASCADE;

-- 1. Fix projects table - add missing columns
ALTER TABLE projects 
  DROP COLUMN IF EXISTS id,
  ADD COLUMN IF NOT EXISTS id uuid DEFAULT gen_random_uuid() PRIMARY KEY;

ALTER TABLE projects 
  ALTER COLUMN name TYPE character varying(255),
  ALTER COLUMN client_name TYPE character varying(255),
  ADD COLUMN IF NOT EXISTS pm_assigned character varying(255) NOT NULL DEFAULT 'TBD',
  ADD COLUMN IF NOT EXISTS team_members text[],
  ADD COLUMN IF NOT EXISTS onedrive_link text,
  ALTER COLUMN overall_status TYPE character varying(50),
  ALTER COLUMN overall_status SET DEFAULT 'on-track'::character varying,
  ADD COLUMN IF NOT EXISTS project_status text DEFAULT 'active'::text,
  ALTER COLUMN created_at SET DEFAULT timezone('utc'::text, now()),
  ALTER COLUMN updated_at SET DEFAULT timezone('utc'::text, now());

-- 2. Fix pm_invitations table - change id to uuid and add missing columns
ALTER TABLE pm_invitations 
  DROP COLUMN IF EXISTS id CASCADE,
  ADD COLUMN id uuid DEFAULT gen_random_uuid() PRIMARY KEY;

ALTER TABLE pm_invitations
  ADD COLUMN IF NOT EXISTS expires_at timestamp with time zone DEFAULT (now() + '7 days'::interval);

-- 3. Create missing tables

-- App Users table
CREATE TABLE IF NOT EXISTS app_users (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  email text NOT NULL,
  password_hash text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Client Access table  
CREATE TABLE IF NOT EXISTS client_access (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id uuid,
  user_id uuid,
  access_granted_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  last_accessed timestamp with time zone
);

-- Project Roadmap table
CREATE TABLE IF NOT EXISTS project_roadmap (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id uuid,
  task_template_id uuid,
  custom_task_name text,
  planned_start_week integer NOT NULL,
  planned_end_week integer NOT NULL,
  actual_start_date date,
  actual_end_date date,
  status text NOT NULL DEFAULT 'not-started'::text,
  assigned_to text,
  notes text,
  estimated_hours integer,
  actual_hours integer,
  is_milestone boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now()
);

-- Task Templates table
CREATE TABLE IF NOT EXISTS task_templates (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  category text NOT NULL,
  estimated_hours integer,
  description text,
  is_custom boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  created_by text
);

-- Users table (different from pm_users)
CREATE TABLE IF NOT EXISTS users (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  email character varying(255) NOT NULL,
  name character varying(255) NOT NULL,
  role character varying(50) NOT NULL DEFAULT 'client'::character varying,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  email_notifications boolean DEFAULT true,
  welcome_modal_dismissed boolean DEFAULT false
);

-- Weekly Snapshots table
CREATE TABLE IF NOT EXISTS weekly_snapshots (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id uuid,
  week_number integer NOT NULL,
  week_start_date date NOT NULL,
  tasks_data jsonb NOT NULL,
  overall_status character varying(50) NOT NULL,
  overall_summary text
);

-- 4. Add foreign key constraints
ALTER TABLE client_access 
  ADD CONSTRAINT IF NOT EXISTS client_access_project_id_fkey 
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;

ALTER TABLE project_roadmap 
  ADD CONSTRAINT IF NOT EXISTS project_roadmap_project_id_fkey 
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;

ALTER TABLE project_roadmap 
  ADD CONSTRAINT IF NOT EXISTS project_roadmap_task_template_id_fkey 
  FOREIGN KEY (task_template_id) REFERENCES task_templates(id);

ALTER TABLE weekly_snapshots 
  ADD CONSTRAINT IF NOT EXISTS weekly_snapshots_project_id_fkey 
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;

-- 5. Enable RLS on new tables
ALTER TABLE app_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_roadmap ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_snapshots ENABLE ROW LEVEL SECURITY;

-- 6. Add permissive policies for new tables (can be tightened later)
CREATE POLICY "Allow all for authenticated users" ON app_users FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "Allow all for authenticated users" ON client_access FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "Allow all for authenticated users" ON project_roadmap FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "Allow all for authenticated users" ON task_templates FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "Allow all for authenticated users" ON users FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "Allow all for authenticated users" ON weekly_snapshots FOR ALL USING (auth.uid() IS NOT NULL);

-- Allow public read for client portals
CREATE POLICY "Allow public read" ON project_roadmap FOR SELECT USING (true);
CREATE POLICY "Allow public read" ON weekly_snapshots FOR SELECT USING (true);

-- 7. Create indexes
CREATE INDEX IF NOT EXISTS client_access_project_id_idx ON client_access(project_id);
CREATE INDEX IF NOT EXISTS project_roadmap_project_id_idx ON project_roadmap(project_id);
CREATE INDEX IF NOT EXISTS weekly_snapshots_project_id_idx ON weekly_snapshots(project_id);

-- 8. Create unique constraints where needed
CREATE UNIQUE INDEX IF NOT EXISTS app_users_email_unique ON app_users(email);
CREATE UNIQUE INDEX IF NOT EXISTS users_email_unique ON users(email);

SELECT 'Production database schema updated to match dev!' as status;