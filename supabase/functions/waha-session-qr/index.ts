import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { fetchWithRetry } from "../_shared/retry.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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
        JSON.stringify({ qr: null }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Normaliza a URL do WAHA - adiciona https:// se não tiver protocolo
    let normalizedUrl = wahaApiUrl;
    if (!wahaApiUrl.startsWith('http://') && !wahaApiUrl.startsWith('https://')) {
      normalizedUrl = `https://${wahaApiUrl}`;
    }

    const response = await fetchWithRetry(`${normalizedUrl}/api/sessions/${sessionName}/qr`, {
      headers: {
        'X-Api-Key': wahaApiKey
      }
    }, 2);

    if (!response.ok) {
      return new Response(
        JSON.stringify({ qr: null }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    
    return new Response(
      JSON.stringify({ qr: data.qr || null }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in waha-session-qr:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
