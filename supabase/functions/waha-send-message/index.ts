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
    const { sessionName, chatId, text } = await req.json();

    if (!sessionName || !chatId || !text) {
      return new Response(
        JSON.stringify({ error: 'sessionName, chatId e text são obrigatórios' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const wahaApiUrl = Deno.env.get('WAHA_API_URL');
    const wahaApiKey = Deno.env.get('WAHA_API_KEY');

    if (!wahaApiUrl || !wahaApiKey) {
      return new Response(
        JSON.stringify({ error: 'Configuração WAHA não encontrada' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const response = await fetch(`${wahaApiUrl}/api/sendText`, {
      method: 'POST',
      headers: {
        'X-Api-Key': wahaApiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        session: sessionName,
        chatId: chatId,
        text: text
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Erro ao enviar mensagem WAHA:', errorText);
      return new Response(
        JSON.stringify({ error: `Erro ao enviar mensagem: ${response.statusText}` }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();

    return new Response(
      JSON.stringify({ success: true, data }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in waha-send-message:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
