-- Enable required extensions for scheduled jobs
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA cron TO postgres;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA cron TO postgres;

-- Store service role key in app settings (replace with your actual service role key)
-- This should be set securely - you'll need to update this with your actual key
-- ALTER DATABASE postgres SET app.settings.service_role_key = 'your-service-role-key-here';

-- Schedule N8N health check every 2 minutes
SELECT cron.schedule(
  'n8n-health-check-monitor',
  '*/2 * * * *', -- Every 2 minutes
  $$
  SELECT net.http_post(
    url := 'https://dffhhforfwhgzdlrfzpc.supabase.co/functions/v1/n8n-health-check',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRmZmhoZm9yZndoZ3pkbHJmenBjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTAzOTU3NCwiZXhwIjoyMDc2NjE1NTc0fQ.YLvyE5xB4aqSzCdSQz6p-2J5PpG7YjIr2kQEE5o6TcY'
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 10000
  );
  $$
);

-- Schedule cleanup job to remove old health check records (daily at 2 AM)
SELECT cron.schedule(
  'n8n-health-check-cleanup',
  '0 2 * * *', -- Daily at 2 AM
  $$
  SELECT public.cleanup_old_health_checks();
  $$
);

-- Function to view all active cron jobs
CREATE OR REPLACE FUNCTION public.get_cron_jobs()
RETURNS TABLE (
  jobid BIGINT,
  schedule TEXT,
  command TEXT,
  nodename TEXT,
  nodeport INT,
  database TEXT,
  username TEXT,
  active BOOLEAN,
  jobname TEXT
)
LANGUAGE SQL
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT * FROM cron.job ORDER BY jobid;
$$;

-- Function to manually trigger health check (for testing)
CREATE OR REPLACE FUNCTION public.trigger_n8n_health_check()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_result TEXT;
BEGIN
  SELECT net.http_post(
    url := 'https://dffhhforfwhgzdlrfzpc.supabase.co/functions/v1/n8n-health-check',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRmZmhoZm9yZndoZ3pkbHJmenBjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTAzOTU3NCwiZXhwIjoyMDc2NjE1NTc0fQ.YLvyE5xB4aqSzCdSQz6p-2J5PpG7YjIr2kQEE5o6TcY'
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 10000
  ) INTO v_result;
  
  RETURN 'Health check triggered successfully';
END;
$$;

-- View to monitor cron job execution history
CREATE OR REPLACE VIEW public.cron_job_monitoring AS
SELECT 
  j.jobname,
  j.schedule,
  j.active,
  r.start_time,
  r.end_time,
  r.status,
  r.return_message,
  EXTRACT(EPOCH FROM (r.end_time - r.start_time)) as execution_seconds
FROM cron.job j
LEFT JOIN cron.job_run_details r ON j.jobid = r.jobid
WHERE r.start_time > NOW() - INTERVAL '1 day'
ORDER BY r.start_time DESC;