import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { createN8NClient } from '../_shared/n8n-client.ts';
import { getCircuitBreaker } from '../_shared/circuit-breaker.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const n8nClient = createN8NClient();
    const circuitBreaker = getCircuitBreaker('n8n-api');

    // Validate N8N configuration
    const configValidation = n8nClient.validateConfig();
    if (!configValidation.valid) {
      console.error('N8N configuration errors:', configValidation.errors);
      
      // Store unhealthy status
      await supabase.from('n8n_health_checks').insert({
        status: 'down',
        error_message: configValidation.errors.join(', '),
        circuit_breaker_state: 'OPEN',
        metadata: { errors: configValidation.errors }
      });

      return new Response(
        JSON.stringify({
          status: 'down',
          healthy: false,
          error: 'N8N not configured',
          details: configValidation.errors
        }),
        { 
          status: 503,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Get circuit breaker state
    const cbState = await circuitBreaker.getState();
    
    // Perform health check
    const startTime = Date.now();
    let status: 'healthy' | 'degraded' | 'down' = 'down';
    let errorMessage: string | null = null;
    let responseTime = 0;

    try {
      const healthResult = await circuitBreaker.execute(async () => {
        return await n8nClient.checkHealth();
      });

      responseTime = healthResult.responseTime;

      if (healthResult.healthy) {
        // Determine if degraded based on response time
        if (responseTime > 5000) {
          status = 'degraded';
        } else {
          status = 'healthy';
        }
      } else {
        status = 'down';
      }
    } catch (error) {
      status = 'down';
      errorMessage = error instanceof Error ? error.message : 'Health check failed';
      responseTime = Date.now() - startTime;
      console.error('N8N health check failed:', error);
    }

    // Store health check result
    const { error: insertError } = await supabase
      .from('n8n_health_checks')
      .insert({
        status,
        response_time_ms: responseTime,
        circuit_breaker_state: cbState.state,
        error_message: errorMessage,
        metadata: {
          failure_count: cbState.failure_count,
          last_failure_time: cbState.last_failure_time
        }
      });

    if (insertError) {
      console.error('Failed to store health check:', insertError);
    }

    return new Response(
      JSON.stringify({
        status,
        healthy: status === 'healthy',
        responseTimeMs: responseTime,
        circuitBreaker: {
          state: cbState.state,
          failureCount: cbState.failure_count
        },
        timestamp: new Date().toISOString(),
        error: errorMessage
      }),
      { 
        status: status === 'healthy' ? 200 : 503,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Error in n8n-health-check:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        status: 'down',
        healthy: false
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
