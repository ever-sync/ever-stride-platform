-- Create table for N8N health check history
CREATE TABLE IF NOT EXISTS public.n8n_health_checks (
  id BIGSERIAL PRIMARY KEY,
  check_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status TEXT NOT NULL CHECK (status IN ('healthy', 'degraded', 'down')),
  response_time_ms INTEGER,
  circuit_breaker_state TEXT CHECK (circuit_breaker_state IN ('CLOSED', 'OPEN', 'HALF_OPEN')),
  error_message TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for efficient querying
CREATE INDEX IF NOT EXISTS idx_n8n_health_checks_timestamp ON public.n8n_health_checks(check_timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_n8n_health_checks_status ON public.n8n_health_checks(status);

-- RLS policies
ALTER TABLE public.n8n_health_checks ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read health checks
CREATE POLICY "Allow authenticated users to read health checks"
  ON public.n8n_health_checks
  FOR SELECT
  TO authenticated
  USING (true);

-- Allow service role to insert health checks
CREATE POLICY "Allow service role to insert health checks"
  ON public.n8n_health_checks
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Function to clean old health check records (keep last 7 days)
CREATE OR REPLACE FUNCTION public.cleanup_old_health_checks()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM public.n8n_health_checks
  WHERE created_at < NOW() - INTERVAL '7 days';
END;
$$;