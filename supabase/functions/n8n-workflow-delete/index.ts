import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { fetchWithRetry } from '../_shared/retry.ts';
import { getCircuitBreaker } from '../_shared/circuit-breaker.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper function to normalize N8N URL
const normalizeN8nUrl = (url: string): string => {
  if (!url) return url;
  // Remove trailing slashes
  url = url.replace(/\/+$/, '');
  // Add https:// if no protocol is present
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    return `https://${url}`;
  }
  return url;
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const N8N_API_URL = normalizeN8nUrl(Deno.env.get('N8N_API_URL') || '');
    const N8N_API_KEY = Deno.env.get('N8N_API_KEY');

    if (!N8N_API_URL || !N8N_API_KEY) {
      throw new Error('N8N API credentials not configured');
    }

    const { workflowId } = await req.json();

    console.log(`Attempting to delete workflow ${workflowId}`);

    // Use circuit breaker for N8N API call
    const circuitBreaker = getCircuitBreaker('n8n-api', {
      failureThreshold: 3,
      successThreshold: 2,
      timeout: 30000
    });

    const response = await circuitBreaker.execute(async () => {
      return await fetchWithRetry(
        `${N8N_API_URL}/api/v1/workflows/${workflowId}`,
        {
          method: 'DELETE',
          headers: {
            'X-N8N-API-KEY': N8N_API_KEY
          }
        },
        3 // maxRetries
      );
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('N8N API error:', response.status, errorText);
      throw new Error(`Failed to delete workflow: ${response.statusText}`);
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in n8n-workflow-delete:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
