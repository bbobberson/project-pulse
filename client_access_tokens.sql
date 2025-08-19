-- Client Access Tokens Table for Secure Token-Based Authentication
-- This allows clients to access their project updates via secure token links without passwords

CREATE TABLE client_access_tokens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  token TEXT UNIQUE NOT NULL,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  client_email TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_used_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT TRUE,
  created_by UUID REFERENCES pm_users(id) -- Which PM created this token
);

-- Create index for faster token lookups
CREATE INDEX idx_client_access_tokens_token ON client_access_tokens(token);
CREATE INDEX idx_client_access_tokens_project ON client_access_tokens(project_id);
CREATE INDEX idx_client_access_tokens_email ON client_access_tokens(client_email);

-- Enable RLS for security
ALTER TABLE client_access_tokens ENABLE ROW LEVEL SECURITY;

-- Policy: Allow authenticated PM users to manage tokens for their projects
CREATE POLICY "PM users can manage tokens for their projects" ON client_access_tokens
FOR ALL USING (
  auth.uid() IN (
    SELECT pm_user_id FROM projects WHERE id = project_id
  )
);

-- Policy: Allow token-based access (for client portal)
CREATE POLICY "Allow token-based access" ON client_access_tokens
FOR SELECT USING (
  is_active = TRUE AND 
  expires_at > NOW()
);

-- Function to generate secure tokens
CREATE OR REPLACE FUNCTION generate_client_access_token()
RETURNS TEXT AS $$
BEGIN
  RETURN encode(gen_random_bytes(32), 'base64url');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create token for client user
CREATE OR REPLACE FUNCTION create_client_access_token(
  p_project_id UUID,
  p_client_email TEXT,
  p_created_by UUID,
  p_expires_in_days INTEGER DEFAULT 30
)
RETURNS TEXT AS $$
DECLARE
  new_token TEXT;
  token_id UUID;
BEGIN
  -- Generate unique token
  new_token := generate_client_access_token();
  
  -- Insert token record
  INSERT INTO client_access_tokens (
    token,
    project_id,
    client_email,
    expires_at,
    created_by
  ) VALUES (
    new_token,
    p_project_id,
    p_client_email,
    NOW() + (p_expires_in_days || ' days')::INTERVAL,
    p_created_by
  ) RETURNING id INTO token_id;
  
  RETURN new_token;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to validate and use token
CREATE OR REPLACE FUNCTION validate_client_token(p_token TEXT)
RETURNS TABLE(
  project_id UUID,
  client_email TEXT,
  expires_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  -- Update last_used_at and return token info
  RETURN QUERY
  UPDATE client_access_tokens 
  SET last_used_at = NOW()
  WHERE token = p_token 
    AND is_active = TRUE 
    AND expires_at > NOW()
  RETURNING 
    client_access_tokens.project_id,
    client_access_tokens.client_email,
    client_access_tokens.expires_at;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;