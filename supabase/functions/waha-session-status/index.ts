import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { fetchWithRetry } from "../_shared/retry.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Status mapping utility
const WAHA_TO_DB_STATUS_MAP: Record<string, string> = {
  'STARTING': 'connecting',
  'SCAN_QR_CODE': 'qr_code',
  'WORKING': 'connected',
  'STOPPED': 'stopped',
  'FAILED': 'failed',
  'disconnected': 'disconnected',
  'connecting': 'connecting',
  'qr_code': 'qr_code',
  'connected': 'connected',
  'stopped': 'stopped',
  'failed': 'failed',
  'working': 'connected',
};

function mapWahaStatusToDb(wahaStatus: string): string {
  return WAHA_TO_DB_STATUS_MAP[wahaStatus] || 'disconnected';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { sessionName } = await req.json();

    if (!sessionName) {
      return new Response(
        JSON.stringify({ error: 'sessionName é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const wahaApiUrl = Deno.env.get('WAHA_API_URL');
    const wahaApiKey = Deno.env.get('WAHA_API_KEY');

    if (!wahaApiUrl || !wahaApiKey) {
      return new Response(
        JSON.stringify({ status: 'disconnected' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Normaliza a URL do WAHA - adiciona https:// se não tiver protocolo
    let normalizedUrl = wahaApiUrl;
    if (!wahaApiUrl.startsWith('http://') && !wahaApiUrl.startsWith('https://')) {
      normalizedUrl = `https://${wahaApiUrl}`;
    }

    const response = await fetchWithRetry(`${normalizedUrl}/api/sessions/${sessionName}`, {
      headers: {
        'X-Api-Key': wahaApiKey
      }
    }, 2);

    if (!response.ok) {
      return new Response(
        JSON.stringify({ status: 'disconnected' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    const mappedStatus = mapWahaStatusToDb(data.status || 'disconnected');
    
    return new Response(
      JSON.stringify({ status: mappedStatus }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in waha-session-status:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
