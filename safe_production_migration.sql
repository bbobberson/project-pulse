-- Safe production migration - handles existing text-based project IDs
-- Run this in your production Supabase SQL Editor

-- First, let's see what we're working with
DO $$
DECLARE
    projects_id_type text;
BEGIN
    SELECT data_type INTO projects_id_type 
    FROM information_schema.columns 
    WHERE table_name = 'projects' AND column_name = 'id';
    
    RAISE NOTICE 'Current projects.id type: %', projects_id_type;
END $$;

-- 1. Create missing tables that don't depend on projects.id type

-- App Users table
CREATE TABLE IF NOT EXISTS app_users (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  email text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
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

-- 2. Create tables that reference projects with TEXT id (matching current production)
-- We'll keep projects.id as TEXT to avoid data conversion issues

-- Client Users table (with text project_id to match production)
CREATE TABLE IF NOT EXISTS client_users (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id text REFERENCES projects(id) ON DELETE CASCADE,
  email text NOT NULL,
  name text,
  role text DEFAULT 'viewer',
  is_active boolean DEFAULT true,
  email_notifications boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  created_by text
);

-- Project Roadmap table (with text project_id)
CREATE TABLE IF NOT EXISTS project_roadmap (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id text REFERENCES projects(id) ON DELETE CASCADE,
  task_template_id uuid REFERENCES task_templates(id),
  custom_task_name text,
  planned_start_week integer NOT NULL,
  planned_end_week integer NOT NULL,
  actual_start_date date,
  actual_end_date date,
  status text NOT NULL DEFAULT 'not-started',
  assigned_to text,
  notes text,
  estimated_hours integer,
  actual_hours integer,
  is_milestone boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now()
);

-- Weekly Snapshots table (with text project_id)
CREATE TABLE IF NOT EXISTS weekly_snapshots (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id text REFERENCES projects(id) ON DELETE CASCADE,
  week_number integer NOT NULL,
  week_start_date date NOT NULL,
  tasks_data jsonb NOT NULL,
  overall_status character varying(50) NOT NULL,
  overall_summary text,
  status character varying(50),
  created_by text,
  created_at timestamp with time zone DEFAULT now()
);

-- 3. Add missing columns to existing tables

-- Add missing columns to projects
ALTER TABLE projects 
  ADD COLUMN IF NOT EXISTS pm_assigned character varying(255) DEFAULT 'TBD',
  ADD COLUMN IF NOT EXISTS team_members text[],
  ADD COLUMN IF NOT EXISTS onedrive_link text,
  ADD COLUMN IF NOT EXISTS project_status text DEFAULT 'active';

-- Update existing columns in projects
ALTER TABLE projects 
  ALTER COLUMN overall_status SET DEFAULT 'on-track',
  ALTER COLUMN created_at SET DEFAULT timezone('utc', now()),
  ALTER COLUMN updated_at SET DEFAULT timezone('utc', now());

-- Add missing columns to pm_invitations
ALTER TABLE pm_invitations
  ADD COLUMN IF NOT EXISTS expires_at timestamp with time zone DEFAULT (now() + '7 days'::interval);

-- 4. Fix client_access_tokens to use text project_id if needed
DO $$
BEGIN
  -- Check if client_access_tokens.project_id is uuid and projects.id is text
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'client_access_tokens' AND column_name = 'project_id' AND data_type = 'uuid'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'projects' AND column_name = 'id' AND data_type = 'text'
  ) THEN
    -- Drop foreign key constraint first
    ALTER TABLE client_access_tokens DROP CONSTRAINT IF EXISTS client_access_tokens_project_id_fkey;
    
    -- Convert client_access_tokens.project_id to text
    ALTER TABLE client_access_tokens ALTER COLUMN project_id TYPE text;
    
    -- Re-add foreign key
    ALTER TABLE client_access_tokens ADD CONSTRAINT client_access_tokens_project_id_fkey 
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;
  END IF;
END $$;

-- 5. Enable RLS on new tables
ALTER TABLE app_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_roadmap ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_snapshots ENABLE ROW LEVEL SECURITY;

-- 6. Create permissive policies (for development/testing)
-- Note: You should make these more restrictive in production

-- Policies for app_users
DROP POLICY IF EXISTS "Allow all operations on app_users" ON app_users;
CREATE POLICY "Allow all operations on app_users" ON app_users FOR ALL USING (true);

-- Policies for task_templates  
DROP POLICY IF EXISTS "Allow all operations on task_templates" ON task_templates;
CREATE POLICY "Allow all operations on task_templates" ON task_templates FOR ALL USING (true);

-- Policies for client_users
DROP POLICY IF EXISTS "Allow all operations on client_users" ON client_users;
CREATE POLICY "Allow all operations on client_users" ON client_users FOR ALL USING (true);

-- Policies for project_roadmap
DROP POLICY IF EXISTS "Allow all operations on project_roadmap" ON project_roadmap;
CREATE POLICY "Allow all operations on project_roadmap" ON project_roadmap FOR ALL USING (true);

-- Policies for weekly_snapshots
DROP POLICY IF EXISTS "Allow all operations on weekly_snapshots" ON weekly_snapshots;
CREATE POLICY "Allow all operations on weekly_snapshots" ON weekly_snapshots FOR ALL USING (true);

-- 7. Create indexes for performance
CREATE INDEX IF NOT EXISTS app_users_email_idx ON app_users(email);
CREATE INDEX IF NOT EXISTS client_users_project_id_idx ON client_users(project_id);
CREATE INDEX IF NOT EXISTS client_users_project_email_unique ON client_users(project_id, email);
CREATE INDEX IF NOT EXISTS project_roadmap_project_id_idx ON project_roadmap(project_id);
CREATE INDEX IF NOT EXISTS weekly_snapshots_project_id_idx ON weekly_snapshots(project_id);

-- 8. Insert some default task templates if they don't exist
INSERT INTO task_templates (name, category, estimated_hours, description) VALUES 
  ('Requirements Gathering', 'Planning', 8, 'Gather and document project requirements'),
  ('System Design', 'Architecture', 16, 'Design system architecture and database schema'),
  ('Frontend Development', 'Development', 40, 'Implement user interface components'),
  ('Backend Development', 'Development', 32, 'Implement server-side logic and APIs'),
  ('Testing', 'QA', 16, 'Write and execute test cases'),
  ('Deployment', 'DevOps', 8, 'Deploy application to production environment')
ON CONFLICT DO NOTHING;

SELECT 'Safe production migration completed successfully!' as status;