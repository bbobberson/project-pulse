-- Updated PM Users Table with role system
DROP TABLE IF EXISTS pm_users;

CREATE TABLE pm_users (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  company TEXT,
  role TEXT DEFAULT 'pm', -- 'admin', 'pm'
  is_active BOOLEAN DEFAULT TRUE,
  invite_status TEXT DEFAULT 'pending', -- pending, accepted, expired
  invited_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  invited_by UUID REFERENCES pm_users(id),
  last_login TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE pm_users ENABLE ROW LEVEL SECURITY;

-- Policies for pm_users table
CREATE POLICY "Admins can view all users" ON pm_users 
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM pm_users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Users can view own record" ON pm_users 
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Admins can insert users" ON pm_users 
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM pm_users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can update all users" ON pm_users 
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM pm_users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Users can update own record" ON pm_users 
  FOR UPDATE USING (auth.uid() = id);

-- Update projects table
ALTER TABLE projects DROP COLUMN IF EXISTS pm_user_id;
ALTER TABLE projects DROP COLUMN IF EXISTS pm_email;
ALTER TABLE projects ADD COLUMN pm_user_id UUID REFERENCES pm_users(id);
ALTER TABLE projects ADD COLUMN created_by UUID REFERENCES pm_users(id);

-- Policies for projects table
DROP POLICY IF EXISTS "PM users can view their projects" ON projects;
DROP POLICY IF EXISTS "PM users can update their projects" ON projects;
DROP POLICY IF EXISTS "PM users can insert projects" ON projects;

CREATE POLICY "Admins can view all projects" ON projects 
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM pm_users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "PMs can view their projects" ON projects 
  FOR SELECT USING (auth.uid() = pm_user_id);

CREATE POLICY "PMs can update their projects" ON projects 
  FOR UPDATE USING (auth.uid() = pm_user_id);

CREATE POLICY "PMs can insert projects" ON projects 
  FOR INSERT WITH CHECK (auth.uid() = pm_user_id);

-- Allow public read access for client portal (temporary - will be improved later)
CREATE POLICY "Allow public read for client portal" ON projects 
  FOR SELECT USING (true);

-- Create an initial admin user (you'll need to update this with a real user ID after signup)
-- INSERT INTO pm_users (id, email, full_name, role, invite_status) 
-- VALUES ('YOUR_AUTH_USER_ID', 'admin@yourcompany.com', 'System Admin', 'admin', 'accepted');

-- Function to handle new PM user registration
CREATE OR REPLACE FUNCTION handle_new_pm_user() 
RETURNS TRIGGER AS $$
BEGIN
  -- Only create pm_users record if user was invited (exists in pm_users table)
  IF EXISTS (SELECT 1 FROM pm_users WHERE email = NEW.email) THEN
    UPDATE pm_users 
    SET id = NEW.id, invite_status = 'accepted'
    WHERE email = NEW.email;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to update PM user record when auth user is created
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE handle_new_pm_user();

-- Create indexes
CREATE INDEX pm_users_email_idx ON pm_users(email);
CREATE INDEX pm_users_role_idx ON pm_users(role);
CREATE INDEX projects_pm_user_idx ON projects(pm_user_id);
CREATE INDEX projects_created_by_idx ON projects(created_by);