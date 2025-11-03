import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query_text, query_embedding, api_key, match_count = 5 } = await req.json();

    if (!api_key) {
      console.error('API key missing');
      return new Response(
        JSON.stringify({ error: 'API key obrigatória' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // 1. Buscar tenant_id pela API key do whatsapp_clients
    console.log('Validating API key...');
    const { data: client, error: clientError } = await supabase
      .from('whatsapp_clients')
      .select('tenant_id')
      .eq('api_key', api_key)
      .single();

    if (clientError || !client) {
      console.error('Invalid API key:', clientError);
      return new Response(
        JSON.stringify({ error: 'API key inválida' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Tenant ID: ${client.tenant_id}`);

    // 2. Executar busca híbrida com tenant_id
    const { data, error } = await supabase.rpc('hybrid_search', {
      p_tenant_id: client.tenant_id,
      query_text: query_text || '',
      query_embedding: query_embedding,
      match_count: match_count,
    });

    if (error) {
      console.error('Search error:', error);
      throw error;
    }

    console.log(`Found ${data?.length || 0} results`);

    return new Response(
      JSON.stringify({ results: data }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Erro na busca:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
