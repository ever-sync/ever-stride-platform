import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface HealthCheckResult {
  tenant_id: number;
  total_sessions: number;
  healthy_sessions: number;
  unhealthy_sessions: number;
  critical_issues: any[];
  average_response_time_ms: number | null;
  failed_sessions: any[];
  recommendations: string[];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const wahaUrl = Deno.env.get('WAHA_URL');
    const wahaApiKey = Deno.env.get('WAHA_API_KEY');

    if (!wahaUrl || !wahaApiKey) {
      throw new Error('WAHA configuration missing');
    }

    // Get all active sessions
    const { data: sessions, error: sessionsError } = await supabase
      .from('waha_sessions')
      .select('*')
      .not('status', 'in', '("disconnected","stopped")');

    if (sessionsError) throw sessionsError;

    if (!sessions || sessions.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No active sessions to monitor' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Group sessions by tenant
    const tenantMap = new Map<number, any[]>();
    sessions.forEach(session => {
      if (!tenantMap.has(session.tenant_id)) {
        tenantMap.set(session.tenant_id, []);
      }
      tenantMap.get(session.tenant_id)!.push(session);
    });

    const results: HealthCheckResult[] = [];

    // Check health for each tenant
    for (const [tenantId, tenantSessions] of tenantMap) {
      const healthCheck: HealthCheckResult = {
        tenant_id: tenantId,
        total_sessions: tenantSessions.length,
        healthy_sessions: 0,
        unhealthy_sessions: 0,
        critical_issues: [],
        average_response_time_ms: null,
        failed_sessions: [],
        recommendations: [],
      };

      const responseTimes: number[] = [];

      for (const session of tenantSessions) {
        const startTime = Date.now();
        
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 5000);

          const response = await fetch(`${wahaUrl}/api/sessions/${session.session_name}`, {
            headers: { 'X-Api-Key': wahaApiKey },
            signal: controller.signal,
          });

          clearTimeout(timeoutId);
          const responseTime = Date.now() - startTime;
          responseTimes.push(responseTime);

          if (response.ok) {
            const data = await response.json();
            
            // Check for issues
            if (responseTime > 3000) {
              healthCheck.unhealthy_sessions++;
              healthCheck.failed_sessions.push({
                session_id: session.id,
                session_name: session.session_name,
                error: 'Slow response time',
                response_time_ms: responseTime,
              });
            } else if (data.status !== session.status) {
              healthCheck.unhealthy_sessions++;
              healthCheck.failed_sessions.push({
                session_id: session.id,
                session_name: session.session_name,
                error: 'Status mismatch',
                status_mismatch: true,
              });
            } else if (session.reconnect_attempts > 3) {
              healthCheck.unhealthy_sessions++;
              healthCheck.failed_sessions.push({
                session_id: session.id,
                session_name: session.session_name,
                error: 'Multiple reconnect attempts',
              });
            } else {
              healthCheck.healthy_sessions++;
            }
          } else {
            healthCheck.unhealthy_sessions++;
            healthCheck.failed_sessions.push({
              session_id: session.id,
              session_name: session.session_name,
              error: `API returned ${response.status}`,
            });
          }
        } catch (error: any) {
          healthCheck.unhealthy_sessions++;
          healthCheck.failed_sessions.push({
            session_id: session.id,
            session_name: session.session_name,
            error: error.message || 'Request failed',
          });
        }
      }

      // Calculate average response time
      if (responseTimes.length > 0) {
        healthCheck.average_response_time_ms = Math.round(
          responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
        );
      }

      // Detect critical issues
      const unhealthyPercentage = (healthCheck.unhealthy_sessions / healthCheck.total_sessions) * 100;
      
      if (unhealthyPercentage > 30) {
        healthCheck.critical_issues.push({
          type: 'high_failure_rate',
          severity: 'critical',
          message: `${Math.round(unhealthyPercentage)}% of sessions are unhealthy`,
          affected_sessions: healthCheck.failed_sessions.map((s: any) => s.session_id),
          suggested_action: 'Run recovery wizard for affected sessions',
        });
      }

      if (healthCheck.average_response_time_ms && healthCheck.average_response_time_ms > 2000) {
        healthCheck.critical_issues.push({
          type: 'slow_response',
          severity: 'medium',
          message: 'WAHA API is responding slowly',
          affected_sessions: [],
          suggested_action: 'Check WAHA server resources',
        });
      }

      // Generate recommendations
      if (healthCheck.unhealthy_sessions > 0) {
        healthCheck.recommendations.push('Run recovery wizard to fix unhealthy sessions');
      }
      if (healthCheck.failed_sessions.length > 5) {
        healthCheck.recommendations.push('Check WAHA server status');
      }

      // Store health check in database
      await supabase.from('session_health_checks').insert({
        tenant_id: tenantId,
        check_timestamp: new Date().toISOString(),
        total_sessions: healthCheck.total_sessions,
        healthy_sessions: healthCheck.healthy_sessions,
        unhealthy_sessions: healthCheck.unhealthy_sessions,
        critical_issues: healthCheck.critical_issues,
        average_response_time_ms: healthCheck.average_response_time_ms,
        failed_sessions: healthCheck.failed_sessions,
        recommendations: healthCheck.recommendations,
      });

      results.push(healthCheck);
    }

    return new Response(
      JSON.stringify({ success: true, results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error in health monitor:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
