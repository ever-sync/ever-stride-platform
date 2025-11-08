import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface CronJob {
  jobname: string | null;
  schedule: string | null;
  active: boolean | null;
  start_time: string | null;
  end_time: string | null;
  status: string | null;
  return_message: string | null;
  execution_seconds: number | null;
}

export function useCronJobMonitoring() {
  const [jobs, setJobs] = useState<CronJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchJobs = async () => {
    try {
      setError(null);
      const { data, error: fetchError } = await supabase
        .from('cron_job_monitoring')
        .select('*')
        .order('start_time', { ascending: false })
        .limit(50);

      if (fetchError) throw fetchError;

      setJobs(data || []);
    } catch (err) {
      console.error('Error fetching cron jobs:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch cron jobs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();

    // Refresh every 30 seconds
    const interval = setInterval(fetchJobs, 30000);

    return () => clearInterval(interval);
  }, []);

  return { jobs, loading, error, refetch: fetchJobs };
}