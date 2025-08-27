-- Fix production database to match dev schema exactly (v3 - fixed data types)
-- Run this in your project-pulse-prod Supabase SQL Editor

-- First drop the incomplete setup if it exists
DROP TABLE IF EXISTS pulse_updates CASCADE;
DROP TABLE IF EXISTS roadmap_tasks CASCADE;

-- 1. Fix projects table - keep id as uuid to match dev
-- First check what type projects.id currently is
DO $$
BEGIN
  -- If projects.id is text, we need to convert it
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'projects' AND column_name = 'id' AND data_type = 'text'
  ) THEN
    -- Drop foreign key constraints first
    ALTER TABLE client_access_tokens DROP CONSTRAINT IF EXISTS client_access_tokens_project_id_fkey;
    ALTER TABLE client_users DROP CONSTRAINT IF EXISTS client_users_project_id_fkey;
    
    -- Convert projects.id from text to uuid
    ALTER TABLE projects ALTER COLUMN id TYPE uuid USING id::uuid;
    
    -- Re-add foreign keys
    ALTER TABLE client_access_tokens ADD CONSTRAINT client_access_tokens_project_id_fkey 
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;
    ALTER TABLE client_users ADD CONSTRAINT client_users_project_id_fkey 
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Add missing columns to projects
ALTER TABLE projects 
  ADD COLUMN IF NOT EXISTS pm_assigned character varying(255) DEFAULT 'TBD',
  ADD COLUMN IF NOT EXISTS team_members text[],
  ADD COLUMN IF NOT EXISTS onedrive_link text,
  ADD COLUMN IF NOT EXISTS project_status text DEFAULT 'active'::text;

-- Update column types and defaults
ALTER TABLE projects 
  ALTER COLUMN name TYPE character varying(255),
  ALTER COLUMN client_name TYPE character varying(255),
  ALTER COLUMN overall_status TYPE character varying(50),
  ALTER COLUMN overall_status SET DEFAULT 'on-track'::character varying,
  ALTER COLUMN created_at SET DEFAULT timezone('utc'::text, now()),
  ALTER COLUMN updated_at SET DEFAULT timezone('utc'::text, now());

-- 2. Fix pm_invitations table - add missing columns
ALTER TABLE pm_invitations
  ADD COLUMN IF NOT EXISTS expires_at timestamp with time zone DEFAULT (now() + '7 days'::interval);

-- 3. Create missing tables

-- App Users table
CREATE TABLE IF NOT EXISTS app_users (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  email text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Client Access table  
CREATE TABLE IF NOT EXISTS client_access (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
  user_id uuid,
  access_granted_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  last_accessed timestamp with time zone
);

-- Project Roadmap table
CREATE TABLE IF NOT EXISTS project_roadmap (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
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
  email character varying(255) NOT NULL UNIQUE,
  name character varying(255) NOT NULL,
  role character varying(50) NOT NULL DEFAULT 'client'::character varying,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  email_notifications boolean DEFAULT true,
  welcome_modal_dismissed boolean DEFAULT false
);

-- Weekly Snapshots table
CREATE TABLE IF NOT EXISTS weekly_snapshots (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
  week_number integer NOT NULL,
  week_start_date date NOT NULL,
  tasks_data jsonb NOT NULL,
  overall_status character varying(50) NOT NULL,
  overall_summary text
);

-- Add foreign key to project_roadmap task_template_id (separate to avoid issues)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'project_roadmap_task_template_id_fkey'
  ) THEN
    ALTER TABLE project_roadmap 
    ADD CONSTRAINT project_roadmap_task_template_id_fkey 
    FOREIGN KEY (task_template_id) REFERENCES task_templates(id);
  END IF;
END $$;

-- 4. Enable RLS on new tables
ALTER TABLE app_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_roadmap ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_snapshots ENABLE ROW LEVEL SECURITY;

-- 5. Add permissive policies for new tables
CREATE POLICY "Allow all for authenticated users" ON app_users FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "Allow all for authenticated users" ON client_access FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "Allow all for authenticated users" ON project_roadmap FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "Allow all for authenticated users" ON task_templates FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "Allow all for authenticated users" ON users FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "Allow all for authenticated users" ON weekly_snapshots FOR ALL USING (auth.uid() IS NOT NULL);

-- Allow public read for client portals
CREATE POLICY "Allow public read" ON project_roadmap FOR SELECT USING (true);
CREATE POLICY "Allow public read" ON weekly_snapshots FOR SELECT USING (true);

-- 6. Create indexes
CREATE INDEX IF NOT EXISTS app_users_email_idx ON app_users(email);
CREATE INDEX IF NOT EXISTS client_access_project_id_idx ON client_access(project_id);
CREATE INDEX IF NOT EXISTS project_roadmap_project_id_idx ON project_roadmap(project_id);
CREATE INDEX IF NOT EXISTS weekly_snapshots_project_id_idx ON weekly_snapshots(project_id);

SELECT 'Production database schema updated to match dev!' as status;