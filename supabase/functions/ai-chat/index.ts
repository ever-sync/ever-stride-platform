import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const CUSTOS = {
  'gpt-4o-mini': { input: 0.00015 / 1000, output: 0.00060 / 1000 },
  'gpt-4o': { input: 0.00250 / 1000, output: 0.01000 / 1000 },
  'claude-sonnet-4': { input: 0.00300 / 1000, output: 0.01500 / 1000 }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Authenticate user
    const authHeader = req.headers.get('authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized - Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser()
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized - Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { agent_id, message, test_mode = false } = await req.json()

    console.log('ai-chat called:', { agent_id, message: message?.substring(0, 50), test_mode })

    if (!agent_id || !message) {
      return new Response(
        JSON.stringify({ error: 'agent_id e message são obrigatórios' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Buscar agente
    const { data: agent, error: agentError } = await supabase
      .from('agents')
      .select(`
        *,
        whatsapp_clients!inner(id, status_pagamento, tenant_id)
      `)
      .eq('id', agent_id)
      .single()

    if (agentError || !agent) {
      console.error('Erro ao buscar agente:', agentError)
      throw new Error('Agente não encontrado')
    }

    console.log('Agente encontrado:', { 
      id: agent.id, 
      modelo: agent.modelo_ia,
      client_id: agent.whatsapp_clients.id 
    })

    // Verificar se cliente está ativo
    if (!test_mode && agent.whatsapp_clients.status_pagamento !== 'ativo') {
      throw new Error('Cliente com pagamento pendente')
    }

    // Montar mensagens
    const messages = [
      {
        role: 'system',
        content: agent.prompt_sistema || agent.script_atendimento
      },
      {
        role: 'user',
        content: message
      }
    ]

    // Chamar OpenAI
    const startTime = Date.now()
    
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: agent.modelo_ia || 'gpt-4o-mini',
        messages: messages,
        temperature: agent.temperatura || 0.7,
        max_tokens: agent.max_tokens || 800
      })
    })

    if (!openaiResponse.ok) {
      const errorText = await openaiResponse.text()
      console.error('Erro OpenAI detalhado:', {
        status: openaiResponse.status,
        statusText: openaiResponse.statusText,
        body: errorText
      })

      // Tratamento específico de erros
      if (openaiResponse.status === 429) {
        throw new Error('Rate limit da OpenAI excedido. Verifique se: 1) A conta tem créditos 2) Não está excedendo o limite de requisições. Aguarde alguns segundos e tente novamente.')
      } else if (openaiResponse.status === 401) {
        throw new Error('API key da OpenAI inválida ou sem permissão')
      } else if (openaiResponse.status === 400) {
        throw new Error(`Requisição inválida: ${errorText}`)
      }
      
      throw new Error(`Erro OpenAI ${openaiResponse.status}: ${errorText}`)
    }

    const openaiData = await openaiResponse.json()
    const latencia = Date.now() - startTime

    const tokens_input = openaiData.usage.prompt_tokens
    const tokens_output = openaiData.usage.completion_tokens
    const tokens_total = openaiData.usage.total_tokens

    const custos = CUSTOS[agent.modelo_ia as keyof typeof CUSTOS] || CUSTOS['gpt-4o-mini']
    const custo_usd = (tokens_input * custos.input) + (tokens_output * custos.output)
    const custo_brl = custo_usd * 5.80

    console.log('Resposta gerada:', {
      tokens_total,
      custo_brl: custo_brl.toFixed(4),
      latencia
    })

    // Salvar uso (se não for teste)
    if (!test_mode) {
      const { error: usageError } = await supabase.from('token_usage').insert({
        tenant_id: agent.whatsapp_clients.tenant_id,
        client_id: agent.whatsapp_clients.id,
        agent_id: agent.id,
        modelo: agent.modelo_ia,
        provider: 'openai',
        tokens_input: tokens_input,
        tokens_output: tokens_output,
        custo_input_usd: tokens_input * custos.input,
        custo_output_usd: tokens_output * custos.output,
        cotacao_usd_brl: 5.80,
        custo_total_brl: custo_brl,
        latencia_ms: latencia,
        sucesso: true
      })

      if (usageError) {
        console.error('Erro ao salvar token_usage:', usageError)
      }

      // Incrementar contador
      const { error: rpcError } = await supabase.rpc('incrementar_uso_tokens', {
        p_client_id: agent.whatsapp_clients.id,
        p_tokens: tokens_total,
        p_custo_brl: custo_brl
      })

      if (rpcError) {
        console.error('Erro ao incrementar tokens:', rpcError)
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        response: openaiData.choices[0].message.content,
        tokens_used: tokens_total,
        custo_brl: Number(custo_brl.toFixed(4)),
        modelo: agent.modelo_ia,
        test_mode: test_mode
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Erro na ai-chat:', error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Erro desconhecido' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})