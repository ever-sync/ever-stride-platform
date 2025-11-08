import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
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
    const circuitBreaker = getCircuitBreaker('n8n-api');
    const state = await circuitBreaker.getState();

    // Calculate next retry time if circuit is OPEN
    let retryAfterSeconds: number | null = null;
    if (state.state === 'OPEN' && state.last_failure_time) {
      const lastFailure = new Date(state.last_failure_time).getTime();
      const timeout = 30000; // 30 seconds default timeout
      const retryTime = lastFailure + timeout;
      const now = Date.now();
      retryAfterSeconds = Math.max(0, Math.ceil((retryTime - now) / 1000));
    }

    // If POST request with action=reset, attempt to reset circuit breaker
    if (req.method === 'POST') {
      try {
        const body = await req.text();
        if (!body) {
          throw new Error('Empty request body');
        }
        
        const { action } = JSON.parse(body);
        
        if (action === 'reset') {
          await circuitBreaker.updateState('CLOSED', 0);
          
          return new Response(
            JSON.stringify({
              success: true,
              message: 'Circuit breaker has been reset',
              state: 'CLOSED'
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      } catch (parseError) {
        console.error('Error parsing POST request:', parseError);
        return new Response(
          JSON.stringify({ 
            error: 'Invalid request body',
            details: parseError instanceof Error ? parseError.message : 'Unknown error'
          }),
          { 
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }
    }

    return new Response(
      JSON.stringify({
        state: state.state,
        failureCount: state.failure_count,
        lastFailureTime: state.last_failure_time,
        retryAfterSeconds,
        canRetry: state.state !== 'OPEN' || retryAfterSeconds === 0,
        message: getStateMessage(state.state, retryAfterSeconds)
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in n8n-circuit-status:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        state: 'UNKNOWN'
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

function getStateMessage(state: string, retryAfter: number | null): string {
  switch (state) {
    case 'CLOSED':
      return 'N8N service is operating normally';
    case 'HALF_OPEN':
      return 'Testing N8N service recovery';
    case 'OPEN':
      return retryAfter && retryAfter > 0
        ? `N8N service is temporarily unavailable. Retry in ${retryAfter}s`
        : 'N8N service is temporarily unavailable';
    default:
      return 'Circuit breaker state unknown';
  }
}
