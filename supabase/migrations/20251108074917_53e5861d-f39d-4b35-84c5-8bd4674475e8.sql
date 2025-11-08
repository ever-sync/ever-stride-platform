-- Create session_health_checks table for monitoring
CREATE TABLE IF NOT EXISTS public.session_health_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id BIGINT NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  check_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  total_sessions INT NOT NULL,
  healthy_sessions INT NOT NULL,
  unhealthy_sessions INT NOT NULL,
  critical_issues JSONB DEFAULT '[]'::jsonb,
  average_response_time_ms INT,
  failed_sessions JSONB DEFAULT '[]'::jsonb,
  recommendations TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_health_checks_tenant ON public.session_health_checks(tenant_id, check_timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_health_checks_timestamp ON public.session_health_checks(check_timestamp DESC);

-- Enable RLS
ALTER TABLE public.session_health_checks ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Tenants can view their health checks"
  ON public.session_health_checks
  FOR SELECT
  USING (tenant_id = get_user_tenant_id(auth.uid()) OR is_super_admin(auth.uid()));

CREATE POLICY "Super admins can manage all health checks"
  ON public.session_health_checks
  FOR ALL
  USING (is_super_admin(auth.uid()));

CREATE POLICY "System can insert health checks"
  ON public.session_health_checks
  FOR INSERT
  WITH CHECK (true);

-- Create user_preferences table
CREATE TABLE IF NOT EXISTS public.user_preferences (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  auto_open_recovery_wizard BOOLEAN DEFAULT false,
  health_check_interval_minutes INT DEFAULT 2,
  bulk_operation_batch_size INT DEFAULT 5,
  notification_preferences JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their own preferences"
  ON public.user_preferences
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own preferences"
  ON public.user_preferences
  FOR ALL
  USING (auth.uid() = user_id);

-- Create function to update updated_at
CREATE OR REPLACE FUNCTION update_user_preferences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER update_user_preferences_updated_at
  BEFORE UPDATE ON public.user_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_user_preferences_updated_at();