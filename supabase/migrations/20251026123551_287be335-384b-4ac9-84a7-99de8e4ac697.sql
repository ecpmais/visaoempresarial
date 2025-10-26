-- Create user_profiles table
CREATE TABLE public.user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL UNIQUE REFERENCES public.sessions(id) ON DELETE CASCADE,
  user_name TEXT NOT NULL,
  company_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Allow anonymous insert via Edge Function (service role)
CREATE POLICY "Allow anonymous insert via service role"
  ON public.user_profiles
  FOR INSERT
  WITH CHECK (true);

-- Allow read via session_token
CREATE POLICY "Users can view own profile via session"
  ON public.user_profiles
  FOR SELECT
  USING (
    session_id IN (
      SELECT id FROM sessions WHERE session_token IS NOT NULL
    )
  );

-- Create index for performance
CREATE INDEX idx_user_profiles_session_id ON public.user_profiles(session_id);

-- Add policies for anonymous sessions
CREATE POLICY "Allow anonymous session creation"
  ON public.sessions
  FOR INSERT
  WITH CHECK (user_id IS NULL AND session_token IS NOT NULL);

CREATE POLICY "Allow anonymous session read via token"
  ON public.sessions
  FOR SELECT
  USING (session_token IS NOT NULL);

CREATE POLICY "Allow anonymous session update via token"
  ON public.sessions
  FOR UPDATE
  USING (session_token IS NOT NULL);

-- Add policies for anonymous responses
CREATE POLICY "Allow anonymous response creation"
  ON public.responses
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM sessions 
      WHERE sessions.id = responses.session_id 
      AND sessions.session_token IS NOT NULL
    )
  );

CREATE POLICY "Allow anonymous response read"
  ON public.responses
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM sessions 
      WHERE sessions.id = responses.session_id 
      AND sessions.session_token IS NOT NULL
    )
  );

CREATE POLICY "Allow anonymous response update"
  ON public.responses
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM sessions 
      WHERE sessions.id = responses.session_id 
      AND sessions.session_token IS NOT NULL
    )
  );

-- Add policies for anonymous analyses
CREATE POLICY "Allow anonymous analysis creation"
  ON public.analyses
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM sessions 
      WHERE sessions.id = analyses.session_id 
      AND sessions.session_token IS NOT NULL
    )
  );

CREATE POLICY "Allow anonymous analysis read"
  ON public.analyses
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM sessions 
      WHERE sessions.id = analyses.session_id 
      AND sessions.session_token IS NOT NULL
    )
  );