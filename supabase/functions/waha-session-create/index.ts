import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { fetchWithRetry } from "../_shared/retry.ts";
import { getCircuitBreaker } from "../_shared/circuit-breaker.ts";
import { trackExecution } from "../_shared/metrics.ts";

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

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  const startTime = Date.now();
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { clientId, webhookUrl } = await req.json();

    if (!clientId || !webhookUrl) {
      return new Response(
        JSON.stringify({ error: 'clientId e webhookUrl são obrigatórios' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const wahaApiUrl = Deno.env.get('WAHA_API_URL');
    const wahaApiKey = Deno.env.get('WAHA_API_KEY');

    console.log('WAHA Config:', {
      apiUrl: wahaApiUrl ? 'configurado' : 'FALTANDO',
      apiKey: wahaApiKey ? 'configurado' : 'FALTANDO'
    });

    if (!wahaApiUrl || !wahaApiKey) {
      return new Response(
        JSON.stringify({ error: 'Configuração WAHA não encontrada' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const sessionName = `cliente-${clientId}`;
    
    // Normaliza a URL do WAHA - adiciona https:// se não tiver protocolo
    let normalizedUrl = wahaApiUrl;
    if (!wahaApiUrl.startsWith('http://') && !wahaApiUrl.startsWith('https://')) {
      normalizedUrl = `https://${wahaApiUrl}`;
      console.log('Protocolo adicionado à URL:', normalizedUrl);
    }
    
    const base = new URL(normalizedUrl);
    const requestUrl = new URL('/api/sessions/start', `${base.protocol}//${base.host}`).toString();

    console.log('Criando sessão WAHA:', {
      sessionName,
      requestUrl,
      webhookUrl
    });

    const circuitBreaker = getCircuitBreaker('waha-api');
    
    let response = await circuitBreaker.execute(() => 
      trackExecution('waha-session-create', () =>
        fetchWithRetry(requestUrl, {
          method: 'POST',
          headers: {
            'X-Api-Key': wahaApiKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: sessionName,
            config: {
              webhooks: [{
                url: webhookUrl,
                events: ['message', 'session.status']
              }]
            }
          })
        }, 3)
      )
    );

    console.log('WAHA API Response:', {
      status: response.status,
      statusText: response.statusText
    });

    // Se a sessão já existe (422), tentar parar e recriar
    if (response.status === 422) {
      const errorText = await response.text();
      console.log('Sessão já existe, tentando parar e recriar...', errorText);
      
      // Tentar parar a sessão existente
      const stopUrl = new URL(`/api/sessions/${sessionName}/stop`, `${base.protocol}//${base.host}`).toString();
      try {
        const stopResponse = await fetchWithRetry(stopUrl, {
          method: 'POST',
          headers: {
            'X-Api-Key': wahaApiKey,
            'Content-Type': 'application/json',
          }
        }, 2);
        
        console.log('Sessão parada:', stopResponse.status);
        
        // Aguardar um pouco antes de recriar
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Tentar criar novamente
        response = await circuitBreaker.execute(() => 
          trackExecution('waha-session-create-retry', () =>
            fetchWithRetry(requestUrl, {
              method: 'POST',
              headers: {
                'X-Api-Key': wahaApiKey,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                name: sessionName,
                config: {
                  webhooks: [{
                    url: webhookUrl,
                    events: ['message', 'session.status']
                  }]
                }
              })
            }, 2)
          )
        );
        
        console.log('WAHA API Response (retry):', {
          status: response.status,
          statusText: response.statusText
        });
      } catch (stopError) {
        console.error('Erro ao parar sessão existente:', stopError);
      }
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Erro detalhado WAHA API:', {
        status: response.status,
        statusText: response.statusText,
        body: errorText
      });
      return new Response(
        JSON.stringify({ 
          error: `Erro ao criar sessão: ${response.statusText}`,
          details: errorText || 'Sem detalhes do servidor',
          status: response.status
        }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();

    return new Response(
      JSON.stringify({
        session_name: data.name,
        status: mapWahaStatusToDb(data.status),
        qr: data.qr
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in waha-session-create:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
