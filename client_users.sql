-- Client Users Table
CREATE TABLE client_users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT,
  role TEXT DEFAULT 'viewer', -- viewer, stakeholder, admin
  is_active BOOLEAN DEFAULT TRUE,
  email_notifications BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by TEXT
);

-- Enable RLS
ALTER TABLE client_users ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all operations
CREATE POLICY "Allow all operations on client_users" ON client_users FOR ALL USING (true);

-- Create unique constraint to prevent duplicate emails per project
CREATE UNIQUE INDEX client_users_project_email_unique ON client_users(project_id, email);