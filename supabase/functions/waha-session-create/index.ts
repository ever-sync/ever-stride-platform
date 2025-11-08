import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
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
    const requestUrl = `${wahaApiUrl}/api/sessions/start`;

    console.log('Criando sessão WAHA:', {
      sessionName,
      requestUrl,
      webhookUrl
    });

    const response = await fetch(requestUrl, {
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
    });

    console.log('WAHA API Response:', {
      status: response.status,
      statusText: response.statusText
    });

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
        status: data.status,
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
