-- Create notification_logs table
CREATE TABLE IF NOT EXISTS public.notification_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_type TEXT NOT NULL CHECK (notification_type IN ('email', 'slack')),
  recipient TEXT NOT NULL,
  subject TEXT,
  message TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('sent', 'failed', 'pending')),
  error_message TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on notification_logs
ALTER TABLE public.notification_logs ENABLE ROW LEVEL SECURITY;

-- Super admins can view all notification logs
CREATE POLICY "Super admins can view notification logs"
  ON public.notification_logs FOR SELECT
  USING (is_super_admin(auth.uid()));

-- System can insert notification logs
CREATE POLICY "System can insert notification logs"
  ON public.notification_logs FOR INSERT
  WITH CHECK (true);

-- Create index for faster queries
CREATE INDEX idx_notification_logs_created_at ON public.notification_logs(created_at DESC);
CREATE INDEX idx_notification_logs_status ON public.notification_logs(status);

-- Create trigger function for N8N health notifications
CREATE OR REPLACE FUNCTION public.notify_n8n_critical_health()
RETURNS TRIGGER AS $$
DECLARE
  v_previous_status TEXT;
  v_previous_circuit_state TEXT;
  v_should_notify BOOLEAN := FALSE;
  v_notification_reason TEXT;
BEGIN
  -- Get previous status and circuit breaker state
  SELECT status, circuit_breaker_state INTO v_previous_status, v_previous_circuit_state
  FROM public.n8n_health_checks
  WHERE check_timestamp < NEW.check_timestamp
  ORDER BY check_timestamp DESC
  LIMIT 1;

  -- Determine if notification should be sent
  -- Case 1: Status changed from healthy/degraded to down
  IF NEW.status = 'down' AND (v_previous_status IS NULL OR v_previous_status IN ('healthy', 'degraded')) THEN
    v_should_notify := TRUE;
    v_notification_reason := 'N8N status changed to DOWN';
  END IF;

  -- Case 2: Circuit breaker just opened
  IF NEW.circuit_breaker_state = 'OPEN' AND 
     (v_previous_circuit_state IS NULL OR v_previous_circuit_state != 'OPEN') THEN
    v_should_notify := TRUE;
    v_notification_reason := 'N8N circuit breaker OPENED';
  END IF;

  -- Case 3: Status recovered (down -> healthy or circuit closed)
  IF (v_previous_status = 'down' AND NEW.status IN ('healthy', 'degraded')) OR
     (v_previous_circuit_state = 'OPEN' AND NEW.circuit_breaker_state = 'CLOSED') THEN
    v_should_notify := TRUE;
    v_notification_reason := 'N8N status RECOVERED';
  END IF;

  -- Send notification if needed
  IF v_should_notify THEN
    PERFORM net.http_post(
      url := 'https://dffhhforfwhgzdlrfzpc.supabase.co/functions/v1/send-n8n-alert',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRmZmhoZm9yZndoZ3pkbHJmenBjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTAzOTU3NCwiZXhwIjoyMDc2NjE1NTc0fQ.YLvyE5xB4aqSzCdSQz6p-2J5PpG7YjIr2kQEE5o6TcY'
      ),
      body := jsonb_build_object(
        'status', NEW.status,
        'previousStatus', v_previous_status,
        'error', NEW.error_message,
        'responseTime', NEW.response_time_ms,
        'circuitBreakerState', NEW.circuit_breaker_state,
        'reason', v_notification_reason,
        'isTest', false,
        'timestamp', NEW.check_timestamp
      ),
      timeout_milliseconds := 5000
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on n8n_health_checks
DROP TRIGGER IF EXISTS trigger_n8n_health_notification ON public.n8n_health_checks;
CREATE TRIGGER trigger_n8n_health_notification
  AFTER INSERT ON public.n8n_health_checks
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_n8n_critical_health();