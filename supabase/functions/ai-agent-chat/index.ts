import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

const CUSTOS = {
  'gpt-4o': { input: 0.00250 / 1000, output: 0.01000 / 1000 },
  'gpt-4o-mini': { input: 0.00015 / 1000, output: 0.00060 / 1000 },
  'gpt-4-turbo': { input: 0.01000 / 1000, output: 0.03000 / 1000 },
  'claude-sonnet-4': { input: 0.00300 / 1000, output: 0.01500 / 1000 },
  'claude-opus-4': { input: 0.01500 / 1000, output: 0.07500 / 1000 },
  'claude-haiku-4': { input: 0.00025 / 1000, output: 0.00125 / 1000 }
};

const USD_TO_BRL = 5.80;

async function callAI(messages: ChatMessage[], model: string, temperature: number, maxTokens: number, provider: 'openai' | 'anthropic') {
  const startTime = Date.now();

  if (provider === 'openai') {
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    if (!OPENAI_API_KEY) throw new Error('OpenAI API key not configured');

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages,
        temperature,
        max_tokens: maxTokens
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', response.status, errorText);
      throw new Error(`OpenAI API error: ${response.statusText}`);
    }

    const data = await response.json();
    const usage = data.usage;
    const custos = CUSTOS[model as keyof typeof CUSTOS];
    
    const custoInput = usage.prompt_tokens * custos.input;
    const custoOutput = usage.completion_tokens * custos.output;
    const custoTotalUsd = custoInput + custoOutput;

    return {
      content: data.choices[0].message.content || '',
      tokens_input: usage.prompt_tokens,
      tokens_output: usage.completion_tokens,
      tokens_total: usage.total_tokens,
      custo_input_usd: custoInput,
      custo_output_usd: custoOutput,
      custo_total_usd: custoTotalUsd,
      custo_total_brl: custoTotalUsd * USD_TO_BRL,
      modelo: model,
      latencia_ms: Date.now() - startTime,
      provider: 'openai' as const
    };
  } else {
    // Anthropic
    const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY');
    if (!ANTHROPIC_API_KEY) throw new Error('Anthropic API key not configured');

    const systemMessage = messages.find(m => m.role === 'system');
    const chatMessages = messages.filter(m => m.role !== 'system');

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        system: systemMessage?.content || '',
        messages: chatMessages,
        temperature,
        max_tokens: maxTokens
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Anthropic API error:', response.status, errorText);
      throw new Error(`Anthropic API error: ${response.statusText}`);
    }

    const data = await response.json();
    const usage = data.usage;
    const custos = CUSTOS[model as keyof typeof CUSTOS];
    
    const custoInput = usage.input_tokens * custos.input;
    const custoOutput = usage.output_tokens * custos.output;
    const custoTotalUsd = custoInput + custoOutput;

    return {
      content: data.content[0].type === 'text' ? data.content[0].text : '',
      tokens_input: usage.input_tokens,
      tokens_output: usage.output_tokens,
      tokens_total: usage.input_tokens + usage.output_tokens,
      custo_input_usd: custoInput,
      custo_output_usd: custoOutput,
      custo_total_usd: custoTotalUsd,
      custo_total_brl: custoTotalUsd * USD_TO_BRL,
      modelo: model,
      latencia_ms: Date.now() - startTime,
      provider: 'anthropic' as const
    };
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase credentials not configured');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    
    const {
      agent_id,
      message,
      from,
      chat_id,
      test_mode = false
    } = await req.json();

    if (!agent_id || !message) {
      return new Response(
        JSON.stringify({ error: 'agent_id and message are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Processing chat for agent:', agent_id);

    // 1. Buscar agente com client
    const { data: agent, error: agentError } = await supabase
      .from('agents')
      .select(`
        *,
        whatsapp_clients(id, status_pagamento, tenant_id, nome_empresa)
      `)
      .eq('id', agent_id)
      .single();

    if (agentError || !agent) {
      console.error('Agent not found:', agentError);
      return new Response(
        JSON.stringify({ error: 'Agent not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. Verificar status de pagamento
    if (!test_mode && agent.whatsapp_clients?.status_pagamento !== 'ativo') {
      return new Response(
        JSON.stringify({ 
          error: 'Client payment is not active',
          status: agent.whatsapp_clients?.status_pagamento 
        }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 3. Verificar limite de mensagens do agente
    if (!test_mode) {
      if (agent.mensagens_usadas_mes >= agent.limite_mensagens_mes) {
        return new Response(
          JSON.stringify({ 
            error: 'Agent message limit reached',
            used: agent.mensagens_usadas_mes,
            limit: agent.limite_mensagens_mes
          }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // 4. Buscar histórico do chat (últimas 10 mensagens)
    let historico: any[] = [];
    if (chat_id) {
      const { data: messages } = await supabase
        .from('chat_messages')
        .select('user_message, bot_message')
        .eq('chat_id', chat_id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (messages) {
        historico = messages.reverse().flatMap(msg => [
          ...(msg.user_message ? [{ role: 'user' as const, content: msg.user_message }] : []),
          ...(msg.bot_message ? [{ role: 'assistant' as const, content: msg.bot_message }] : [])
        ]);
      }
    }

    // 5. Montar prompt com contexto
    const systemPrompt = agent.prompt_sistema || agent.script_atendimento || 'Você é um assistente prestativo.';
    const greetingContext = agent.saudacao_inicial ? `\nGreeting message: ${agent.saudacao_inicial}` : '';
    
    const messages: ChatMessage[] = [
      {
        role: 'system',
        content: systemPrompt + greetingContext
      },
      ...historico,
      {
        role: 'user',
        content: message
      }
    ];

    console.log(`Calling AI with ${messages.length} messages, model: ${agent.modelo_ia}`);

    // 6. Detectar provider
    const provider = agent.modelo_ia.startsWith('gpt-') ? 'openai' : 'anthropic';

    // 7. Chamar IA
    const response = await callAI(
      messages,
      agent.modelo_ia,
      agent.temperatura || 0.7,
      agent.max_tokens || 800,
      provider
    );

    console.log(`AI response received: ${response.tokens_total} tokens, ${response.latencia_ms}ms`);

    // 8. Salvar uso de tokens (se não for teste)
    if (!test_mode) {
      await supabase
        .from('token_usage')
        .insert({
          tenant_id: agent.whatsapp_clients?.tenant_id,
          client_id: agent.whatsapp_clients?.id,
          agent_id: agent.id,
          chat_id: chat_id,
          modelo: response.modelo,
          provider: response.provider,
          tokens_input: response.tokens_input,
          tokens_output: response.tokens_output,
          tokens_cache_read: 0,
          tokens_total: response.tokens_total,
          custo_input_usd: response.custo_input_usd,
          custo_output_usd: response.custo_output_usd,
          custo_cache_usd: 0,
          custo_total_usd: response.custo_total_usd,
          cotacao_usd_brl: USD_TO_BRL,
          custo_total_brl: response.custo_total_brl,
          latencia_ms: response.latencia_ms,
          sucesso: true,
          prompt_length: message.length,
          response_length: response.content.length
        });

      // 9. Incrementar contador de mensagens do agente
      await supabase
        .from('agents')
        .update({
          mensagens_usadas_mes: agent.mensagens_usadas_mes + 1
        })
        .eq('id', agent_id);

      // 10. Incrementar limites do cliente (se houver)
      if (agent.whatsapp_clients?.id) {
        await supabase.rpc('incrementar_uso_tokens', {
          p_client_id: agent.whatsapp_clients.id,
          p_tokens: response.tokens_total,
          p_custo_brl: response.custo_total_brl
        });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        response: response.content,
        tokens_used: response.tokens_total,
        custo_brl: response.custo_total_brl,
        modelo: response.modelo,
        provider: response.provider,
        test_mode: test_mode
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in ai-agent-chat:', error);
    
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        success: false
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
