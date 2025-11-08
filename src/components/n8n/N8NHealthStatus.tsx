import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertCircle, CheckCircle2, Clock, RefreshCw, XCircle, Bell, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'down';
  healthy: boolean;
  responseTimeMs?: number;
  circuitBreaker?: {
    state: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
    failureCount: number;
  };
  timestamp: string;
  error?: string;
}

interface CircuitBreakerStatus {
  state: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
  failureCount: number;
  lastFailureTime: string | null;
  retryAfterSeconds: number | null;
  canRetry: boolean;
  message: string;
}

export function N8NHealthStatus() {
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [circuitStatus, setCircuitStatus] = useState<CircuitBreakerStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [testing, setTesting] = useState(false);
  const { toast } = useToast();

  const fetchHealthStatus = async () => {
    try {
      // Get latest health check from database
      const { data: healthChecks, error } = await supabase
        .from('n8n_health_checks')
        .select('*')
        .order('check_timestamp', { ascending: false })
        .limit(1)
        .single();

      if (!error && healthChecks) {
        setHealth({
          status: healthChecks.status as 'healthy' | 'degraded' | 'down',
          healthy: healthChecks.status === 'healthy',
          responseTimeMs: healthChecks.response_time_ms || undefined,
          circuitBreaker: healthChecks.circuit_breaker_state ? {
            state: healthChecks.circuit_breaker_state as 'CLOSED' | 'OPEN' | 'HALF_OPEN',
            failureCount: (healthChecks.metadata as any)?.failure_count || 0
          } : undefined,
          timestamp: healthChecks.check_timestamp,
          error: healthChecks.error_message || undefined
        });
      }

      // Get circuit breaker status
      const { data: cbData } = await supabase.functions.invoke('n8n-circuit-status');
      if (cbData) {
        setCircuitStatus(cbData);
      }
    } catch (error) {
      console.error('Failed to fetch health status:', error);
    } finally {
      setLoading(false);
    }
  };

  const performHealthCheck = async () => {
    setChecking(true);
    try {
      const { data, error } = await supabase.functions.invoke('n8n-health-check');
      
      if (error) throw error;

      setHealth(data);
      await fetchHealthStatus(); // Refresh circuit status

      toast({
        title: data.healthy ? 'Health check passed' : 'Health check failed',
        description: data.healthy 
          ? `N8N is responsive (${data.responseTimeMs}ms)` 
          : data.error || 'N8N is not responding',
        variant: data.healthy ? 'default' : 'destructive'
      });
    } catch (error) {
      console.error('Health check failed:', error);
      toast({
        title: 'Health check failed',
        description: 'Unable to check N8N status',
        variant: 'destructive'
      });
    } finally {
      setChecking(false);
    }
  };

  const resetCircuitBreaker = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('n8n-circuit-status', {
        body: { action: 'reset' }
      });

      if (error) throw error;

      toast({
        title: 'Circuit breaker reset',
        description: 'N8N connection will be attempted on next request'
      });

      await fetchHealthStatus();
    } catch (error) {
      console.error('Failed to reset circuit breaker:', error);
      toast({
        title: 'Reset failed',
        description: 'Unable to reset circuit breaker',
        variant: 'destructive'
      });
    }
  };

  const testNotification = async () => {
    setTesting(true);
    try {
      const { error } = await supabase.functions.invoke('send-n8n-alert', {
        body: {
          status: 'down',
          error: 'This is a test notification from the monitoring dashboard',
          responseTime: 5000,
          circuitBreakerState: 'OPEN',
          reason: 'Manual test triggered',
          isTest: true
        }
      });

      if (error) throw error;

      toast({
        title: 'Test alert sent',
        description: 'Check your email for the test notification'
      });
    } catch (error) {
      console.error('Failed to send test notification:', error);
      toast({
        title: 'Test failed',
        description: 'Unable to send test notification',
        variant: 'destructive'
      });
    } finally {
      setTesting(false);
    }
  };

  useEffect(() => {
    fetchHealthStatus();
    
    // Refresh every 30 seconds
    const interval = setInterval(fetchHealthStatus, 30000);
    
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 animate-spin" />
            Loading N8N Status...
          </CardTitle>
        </CardHeader>
      </Card>
    );
  }

  const getStatusIcon = () => {
    switch (health?.status) {
      case 'healthy':
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case 'degraded':
        return <AlertCircle className="h-5 w-5 text-yellow-500" />;
      case 'down':
        return <XCircle className="h-5 w-5 text-destructive" />;
      default:
        return <AlertCircle className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const getStatusBadge = () => {
    switch (health?.status) {
      case 'healthy':
        return <Badge variant="default" className="bg-green-500">Healthy</Badge>;
      case 'degraded':
        return <Badge variant="default" className="bg-yellow-500">Degraded</Badge>;
      case 'down':
        return <Badge variant="destructive">Down</Badge>;
      default:
        return <Badge variant="secondary">Unknown</Badge>;
    }
  };

  const getCircuitBreakerBadge = () => {
    if (!circuitStatus) return null;

    switch (circuitStatus.state) {
      case 'CLOSED':
        return <Badge variant="outline" className="text-green-500 border-green-500">Circuit Closed</Badge>;
      case 'HALF_OPEN':
        return <Badge variant="outline" className="text-yellow-500 border-yellow-500">Testing Recovery</Badge>;
      case 'OPEN':
        return <Badge variant="outline" className="text-destructive border-destructive">Circuit Open</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {getStatusIcon()}
            <CardTitle>N8N Integration Status</CardTitle>
          </div>
          {getStatusBadge()}
        </div>
        <CardDescription>
          {health?.timestamp && `Last checked ${formatDistanceToNow(new Date(health.timestamp), { addSuffix: true })}`}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Response Time */}
        {health?.responseTimeMs !== undefined && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Response Time:</span>
            <span className="font-mono">{health.responseTimeMs}ms</span>
          </div>
        )}

        {/* Circuit Breaker Status */}
        {circuitStatus && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Circuit Breaker:</span>
              {getCircuitBreakerBadge()}
            </div>
            
            {circuitStatus.failureCount > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Failure Count:</span>
                <span className="font-mono text-destructive">{circuitStatus.failureCount}</span>
              </div>
            )}

            {circuitStatus.retryAfterSeconds !== null && circuitStatus.retryAfterSeconds > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Retry In:</span>
                <span className="font-mono">{circuitStatus.retryAfterSeconds}s</span>
              </div>
            )}

            <p className="text-sm text-muted-foreground">{circuitStatus.message}</p>
          </div>
        )}

        {/* Error Message */}
        {health?.error && (
          <div className="rounded-md bg-destructive/10 p-3">
            <p className="text-sm text-destructive">{health.error}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={performHealthCheck}
            disabled={checking}
          >
            {checking ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            {checking ? 'Checking...' : 'Check Now'}
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={testNotification}
            disabled={testing}
          >
            {testing ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Bell className="h-4 w-4 mr-2" />
            )}
            {testing ? 'Sending...' : 'Test Alert'}
          </Button>

          {circuitStatus?.state === 'OPEN' && (
            <Button
              size="sm"
              variant="outline"
              onClick={resetCircuitBreaker}
            >
              Reset Circuit Breaker
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
