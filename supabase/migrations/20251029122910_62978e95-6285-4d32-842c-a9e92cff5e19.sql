-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  company_name TEXT NOT NULL,
  email TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view own profile"
  ON public.profiles
  FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Trigger to update updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Function to create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, company_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'company_name', ''),
    NEW.email
  );
  RETURN NEW;
END;
$$;

-- Trigger to create profile automatically
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Update sessions table to ensure user_id exists and update RLS
ALTER TABLE public.sessions 
  ALTER COLUMN user_id DROP DEFAULT;

-- Update RLS policies for sessions (remove anonymous, add authenticated)
DROP POLICY IF EXISTS "Allow anonymous session creation" ON public.sessions;
DROP POLICY IF EXISTS "Allow anonymous session read via token" ON public.sessions;
DROP POLICY IF EXISTS "Allow anonymous session update via token" ON public.sessions;

CREATE POLICY "Authenticated users can create own sessions"
  ON public.sessions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Authenticated users can view own sessions"
  ON public.sessions
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Authenticated users can update own sessions"
  ON public.sessions
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Update RLS policies for responses (remove anonymous policies)
DROP POLICY IF EXISTS "Allow anonymous response creation" ON public.responses;
DROP POLICY IF EXISTS "Allow anonymous response read" ON public.responses;
DROP POLICY IF EXISTS "Allow anonymous response update" ON public.responses;

-- Update RLS policies for analyses (remove anonymous policies)
DROP POLICY IF EXISTS "Allow anonymous analysis creation" ON public.analyses;
DROP POLICY IF EXISTS "Allow anonymous analysis read" ON public.analyses;