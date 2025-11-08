import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { N8NMonitoringData } from '@/types/n8n';

export function useN8NMonitoring(timeRange: '24h' | '7d' | '30d' = '24h') {
  const [data, setData] = useState<N8NMonitoringData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: statsData, error: statsError } = await supabase.functions.invoke('n8n-get-stats', {
        body: { timeRange }
      });

      if (statsError) throw statsError;

      setData(statsData);
    } catch (err) {
      console.error('Error fetching N8N stats:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch stats');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();

    // Set up real-time subscription for execution logs
    const channel = supabase
      .channel('n8n_execution_logs_changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'n8n_execution_logs'
        },
        () => {
          // Refetch stats when new execution log is added
          fetchStats();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [timeRange]);

  return {
    data,
    loading,
    error,
    refetch: fetchStats
  };
}
