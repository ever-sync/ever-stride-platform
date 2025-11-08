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

    // Use the correct WAHA endpoint for QR code
    const response = await fetchWithRetry(`${normalizedUrl}/api/${sessionName}/auth/qr`, {
      headers: {
        'X-Api-Key': wahaApiKey
      }
    }, 2);

    if (!response.ok) {
      console.error(`WAHA QR API error: ${response.status} ${response.statusText}`);
      const errorText = await response.text().catch(() => 'Unable to read error');
      console.error('Error body:', errorText);
      return new Response(
        JSON.stringify({ qr: null, expiresAt: null }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    console.log('WAHA QR response:', JSON.stringify(data).substring(0, 200));
    
    // Extract QR code from multiple possible formats
    const qr = data.qr || data.value || data.code || data.data || data?.result?.qr || null;
    
    // Extract expiration with fallback (60 seconds if not provided)
    const expiresAt = data.expiresAt || data.expires_at || data.expire_at || 
                      (data.ttl ? new Date(Date.now() + data.ttl * 1000).toISOString() : 
                       new Date(Date.now() + 60000).toISOString());
    
    return new Response(
      JSON.stringify({ qr, expiresAt }),
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
