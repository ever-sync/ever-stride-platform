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

    // Handle POST requests with action (e.g., reset)
    if (req.method === 'POST') {
      try {
        const body = await req.text();
        
        // If body is not empty, try to parse it for actions
        if (body && body.trim().length > 0) {
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
        }
        
        // If no action or empty body, fall through to return status
        // (Supabase client uses POST by default even for queries)
      } catch (parseError) {
        console.error('Error parsing POST request:', parseError);
        // If parsing fails, fall through to return status instead of erroring
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
