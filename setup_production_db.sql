-- Project Pulse Production Database Setup
-- Run this in your project-pulse-prod Supabase SQL Editor

-- 1. Create PM Users Table with role system
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

-- 2. Create PM Invitations Table
CREATE TABLE pm_invitations (
  id SERIAL PRIMARY KEY,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  company TEXT DEFAULT 'InfoWorks',
  role TEXT DEFAULT 'pm',
  invite_status TEXT DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Create Projects Table
CREATE TABLE projects (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  name TEXT NOT NULL,
  client_name TEXT NOT NULL,
  start_date TIMESTAMP WITH TIME ZONE NOT NULL,
  end_date TIMESTAMP WITH TIME ZONE,
  pm_user_id UUID REFERENCES pm_users(id),
  created_by UUID REFERENCES pm_users(id),
  overall_status TEXT DEFAULT 'on-track',
  overall_summary TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Create Pulse Updates Table
CREATE TABLE pulse_updates (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  project_id TEXT REFERENCES projects(id) ON DELETE CASCADE,
  week_ending TIMESTAMP WITH TIME ZONE NOT NULL,
  overall_status TEXT NOT NULL,
  executive_summary TEXT,
  deliverables_summary TEXT,
  timeline_summary TEXT,
  roadmap_summary TEXT,
  next_week_focus TEXT,
  blockers TEXT,
  budget_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Create Roadmap Tasks Table
CREATE TABLE roadmap_tasks (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  project_id TEXT REFERENCES projects(id) ON DELETE CASCADE,
  task_name TEXT NOT NULL,
  task_description TEXT,
  week_number INTEGER NOT NULL,
  year INTEGER NOT NULL,
  status TEXT DEFAULT 'not-started',
  is_milestone BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Create Client Users Table
CREATE TABLE client_users (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  project_id TEXT REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  role TEXT DEFAULT 'viewer',
  is_active BOOLEAN DEFAULT TRUE,
  email_notifications BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by TEXT
);

-- 7. Create Client Access Tokens Table
CREATE TABLE client_access_tokens (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  project_id TEXT REFERENCES projects(id) ON DELETE CASCADE,
  token TEXT UNIQUE NOT NULL,
  client_name TEXT NOT NULL,
  client_email TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE,
  last_accessed TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES pm_users(id),
  is_active BOOLEAN DEFAULT TRUE
);

-- 8. Enable RLS on all tables
ALTER TABLE pm_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE pm_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE pulse_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE roadmap_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_access_tokens ENABLE ROW LEVEL SECURITY;

-- 9. Create RLS Policies
-- PM Users policies
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

-- Allow trigger to write (for webhook)
CREATE POLICY "pm_users_trigger_writer" ON pm_users
  FOR ALL
  TO postgres
  USING (true)
  WITH CHECK (true);

-- Projects policies
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

-- Allow public read access for client portal
CREATE POLICY "Allow public read for client portal" ON projects 
  FOR SELECT USING (true);

-- Allow all operations on other tables for authenticated users
CREATE POLICY "Allow all for auth users" ON pm_invitations FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "Allow all for auth users" ON pulse_updates FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "Allow all for auth users" ON roadmap_tasks FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "Allow all for auth users" ON client_users FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "Allow all for auth users" ON client_access_tokens FOR ALL USING (auth.uid() IS NOT NULL);

-- Allow public access for client portals
CREATE POLICY "Allow public read" ON pulse_updates FOR SELECT USING (true);
CREATE POLICY "Allow public read" ON roadmap_tasks FOR SELECT USING (true);
CREATE POLICY "Allow public read" ON client_users FOR SELECT USING (true);
CREATE POLICY "Allow public read" ON client_access_tokens FOR SELECT USING (true);

-- 10. Create indexes for better performance
CREATE INDEX pm_users_email_idx ON pm_users(email);
CREATE INDEX pm_users_role_idx ON pm_users(role);
CREATE INDEX projects_pm_user_idx ON projects(pm_user_id);
CREATE INDEX projects_created_by_idx ON projects(created_by);
CREATE INDEX pulse_updates_project_idx ON pulse_updates(project_id);
CREATE INDEX roadmap_tasks_project_idx ON roadmap_tasks(project_id);
CREATE INDEX client_users_project_idx ON client_users(project_id);
CREATE INDEX client_access_tokens_token_idx ON client_access_tokens(token);
CREATE INDEX client_access_tokens_project_idx ON client_access_tokens(project_id);

-- 11. Create unique constraints
CREATE UNIQUE INDEX client_users_project_email_unique ON client_users(project_id, email);

-- 12. Create functions for token management
CREATE OR REPLACE FUNCTION generate_client_access_token()
RETURNS TEXT AS $$
BEGIN
  RETURN encode(gen_random_bytes(32), 'base64url');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION create_client_access_token(
  p_project_id TEXT,
  p_client_email TEXT,
  p_client_name TEXT,
  p_created_by UUID,
  p_expires_in_days INTEGER DEFAULT 30
)
RETURNS TEXT AS $$
DECLARE
  new_token TEXT;
  token_id TEXT;
BEGIN
  -- Generate unique token
  new_token := generate_client_access_token();
  
  -- Insert token record
  INSERT INTO client_access_tokens (
    token,
    project_id,
    client_email,
    client_name,
    expires_at,
    created_by
  ) VALUES (
    new_token,
    p_project_id,
    p_client_email,
    p_client_name,
    NOW() + (p_expires_in_days || ' days')::INTERVAL,
    p_created_by
  ) RETURNING id INTO token_id;
  
  RETURN new_token;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION validate_client_token(p_token TEXT)
RETURNS TABLE(
  project_id TEXT,
  client_email TEXT,
  expires_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  -- Update last_accessed and return token info
  RETURN QUERY
  UPDATE client_access_tokens 
  SET last_accessed = NOW()
  WHERE token = p_token 
    AND is_active = TRUE 
    AND (expires_at IS NULL OR expires_at > NOW())
  RETURNING 
    client_access_tokens.project_id,
    client_access_tokens.client_email,
    client_access_tokens.expires_at;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 13. Function to handle new PM user registration
CREATE OR REPLACE FUNCTION handle_new_pm_user() 
RETURNS TRIGGER AS $$
BEGIN
  -- Only create pm_users record if user was invited (exists in pm_invitations table)
  IF EXISTS (SELECT 1 FROM pm_invitations WHERE email = NEW.email) THEN
    INSERT INTO pm_users (id, email, full_name, role, invite_status)
    SELECT NEW.id, NEW.email, 
           COALESCE(NEW.user_metadata->>'full_name', inv.full_name),
           inv.role, 'accepted'
    FROM pm_invitations inv 
    WHERE inv.email = NEW.email
    ON CONFLICT (id) DO UPDATE SET 
      invite_status = 'accepted',
      full_name = EXCLUDED.full_name;
    
    -- Mark invitation as accepted
    UPDATE pm_invitations 
    SET invite_status = 'accepted'
    WHERE email = NEW.email;
    
    RETURN NEW;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 14. Create trigger to update PM user record when auth user is created
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE handle_new_pm_user();

-- 15. Create updated_at triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_pulse_updates_updated_at BEFORE UPDATE ON pulse_updates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_roadmap_tasks_updated_at BEFORE UPDATE ON roadmap_tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_client_users_updated_at BEFORE UPDATE ON client_users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Success message
SELECT 'Project Pulse production database setup completed successfully!' as status;