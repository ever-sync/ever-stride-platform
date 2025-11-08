import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { SessionHealthCheck, HealthSummary, HealthStatus } from '@/types/health-monitoring';
import { toast } from '@/hooks/use-toast';

export function useSessionHealthMonitor(intervalMinutes: number = 2) {
  const [healthChecks, setHealthChecks] = useState<SessionHealthCheck[]>([]);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [lastCheck, setLastCheck] = useState<Date | null>(null);
  const [summary, setSummary] = useState<HealthSummary>({
    status: 'healthy',
    healthy_percentage: 100,
    trend: 'stable',
    last_check: null,
    critical_count: 0,
  });

  const runHealthCheck = useCallback(async () => {
    setIsMonitoring(true);
    try {
      const { data, error } = await supabase.functions.invoke('waha-health-monitor');

      if (error) throw error;

      if (data?.results) {
        // Fetch recent health checks from DB
        const { data: checks, error: fetchError } = await supabase
          .from('session_health_checks')
          .select('*')
          .order('check_timestamp', { ascending: false })
          .limit(10);

        if (!fetchError && checks) {
          const typedChecks = checks.map(check => ({
            ...check,
            critical_issues: (check.critical_issues || []) as any,
            failed_sessions: (check.failed_sessions || []) as any,
          })) as SessionHealthCheck[];
          setHealthChecks(typedChecks);
          calculateSummary(typedChecks);
        }
      }

      setLastCheck(new Date());
      
    } catch (error: any) {
      console.error('Health check failed:', error);
      toast({
        title: 'Erro na verificação de saúde',
        description: 'Não foi possível verificar o status das sessões.',
        variant: 'destructive',
      });
    } finally {
      setIsMonitoring(false);
    }
  }, []);

  const calculateSummary = (checks: SessionHealthCheck[]) => {
    if (checks.length === 0) return;

    const latest = checks[0];
    const healthyPercentage = (latest.healthy_sessions / latest.total_sessions) * 100;

    let status: HealthStatus = 'healthy';
    if (healthyPercentage < 70) status = 'critical';
    else if (healthyPercentage < 90) status = 'degraded';

    let trend: 'improving' | 'stable' | 'degrading' = 'stable';
    if (checks.length > 1) {
      const previous = checks[1];
      const previousPercentage = (previous.healthy_sessions / previous.total_sessions) * 100;
      const diff = healthyPercentage - previousPercentage;
      
      if (diff > 5) trend = 'improving';
      else if (diff < -5) trend = 'degrading';
    }

    setSummary({
      status,
      healthy_percentage: healthyPercentage,
      trend,
      last_check: new Date(latest.check_timestamp),
      critical_count: latest.critical_issues.length,
    });

    // Show notification for critical issues
    if (status === 'critical' && latest.critical_issues.length > 0) {
      toast({
        title: '⚠️ Problemas Críticos Detectados',
        description: `${latest.unhealthy_sessions} sessões não estão saudáveis. Verifique o painel de saúde.`,
        variant: 'destructive',
        duration: 10000,
      });
    }
  };

  useEffect(() => {
    // Initial check
    runHealthCheck();

    // Set up interval
    const interval = setInterval(() => {
      runHealthCheck();
    }, intervalMinutes * 60 * 1000);

    return () => clearInterval(interval);
  }, [intervalMinutes, runHealthCheck]);

  return {
    healthChecks,
    isMonitoring,
    lastCheck,
    summary,
    runHealthCheck,
  };
}
