-- Create sessions table
CREATE TABLE public.sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  session_token TEXT UNIQUE,
  stage INT NOT NULL DEFAULT 1 CHECK (stage >= 1 AND stage <= 10),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT user_or_token CHECK (
    (user_id IS NOT NULL AND session_token IS NULL) OR
    (user_id IS NULL AND session_token IS NOT NULL)
  )
);

-- Create responses table
CREATE TABLE public.responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  question_number INT NOT NULL CHECK (question_number >= 1 AND question_number <= 10),
  answer_text TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (session_id, question_number)
);

-- Create analyses table
CREATE TABLE public.analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  vision_inspirational TEXT NOT NULL,
  vision_measurable TEXT NOT NULL,
  meta JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analyses ENABLE ROW LEVEL SECURITY;

-- RLS Policies for sessions (authenticated users)
CREATE POLICY "Users can view own sessions"
  ON public.sessions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own sessions"
  ON public.sessions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sessions"
  ON public.sessions FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for responses (authenticated users)
CREATE POLICY "Users can view own responses"
  ON public.responses FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.sessions
      WHERE sessions.id = responses.session_id
      AND sessions.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create own responses"
  ON public.responses FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.sessions
      WHERE sessions.id = responses.session_id
      AND sessions.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own responses"
  ON public.responses FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.sessions
      WHERE sessions.id = responses.session_id
      AND sessions.user_id = auth.uid()
    )
  );

-- RLS Policies for analyses (authenticated users)
CREATE POLICY "Users can view own analyses"
  ON public.analyses FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.sessions
      WHERE sessions.id = analyses.session_id
      AND sessions.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create own analyses"
  ON public.analyses FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.sessions
      WHERE sessions.id = analyses.session_id
      AND sessions.user_id = auth.uid()
    )
  );

-- Create indexes for performance
CREATE INDEX idx_sessions_user_id ON public.sessions(user_id);
CREATE INDEX idx_sessions_token ON public.sessions(session_token) WHERE session_token IS NOT NULL;
CREATE INDEX idx_responses_session_id ON public.responses(session_id);
CREATE INDEX idx_analyses_session_id ON public.analyses(session_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_sessions_updated_at
  BEFORE UPDATE ON public.sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_responses_updated_at
  BEFORE UPDATE ON public.responses
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();