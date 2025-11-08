import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface ChatOptions {
  model: string;
  temperature?: number;
  max_tokens?: number;
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

async function chatOpenAI(messages: ChatMessage[], options: ChatOptions) {
  const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
  if (!OPENAI_API_KEY) throw new Error('OpenAI API key not configured');

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: options.model,
      messages: messages,
      temperature: options.temperature || 0.7,
      max_tokens: options.max_tokens || 800
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('OpenAI API error:', response.status, errorText);
    throw new Error(`OpenAI API error: ${response.statusText}`);
  }

  const data = await response.json();
  const usage = data.usage;
  const custos = CUSTOS[options.model as keyof typeof CUSTOS];
  
  const custoInput = usage.prompt_tokens * custos.input;
  const custoOutput = usage.completion_tokens * custos.output;
  const custoTotalUsd = custoInput + custoOutput;

  return {
    content: data.choices[0].message.content || '',
    tokens_input: usage.prompt_tokens,
    tokens_output: usage.completion_tokens,
    tokens_total: usage.total_tokens,
    custo_usd: custoTotalUsd,
    custo_brl: custoTotalUsd * USD_TO_BRL,
    modelo: options.model,
    latencia_ms: 0,
    provider: 'openai' as const
  };
}

async function chatAnthropic(messages: ChatMessage[], options: ChatOptions) {
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
      model: options.model,
      system: systemMessage?.content || '',
      messages: chatMessages.map(m => ({
        role: m.role,
        content: m.content
      })),
      temperature: options.temperature || 0.7,
      max_tokens: options.max_tokens || 800
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Anthropic API error:', response.status, errorText);
    throw new Error(`Anthropic API error: ${response.statusText}`);
  }

  const data = await response.json();
  const usage = data.usage;
  const custos = CUSTOS[options.model as keyof typeof CUSTOS];
  
  const custoInput = usage.input_tokens * custos.input;
  const custoOutput = usage.output_tokens * custos.output;
  const custoTotalUsd = custoInput + custoOutput;

  return {
    content: data.content[0].type === 'text' ? data.content[0].text : '',
    tokens_input: usage.input_tokens,
    tokens_output: usage.output_tokens,
    tokens_total: usage.input_tokens + usage.output_tokens,
    custo_usd: custoTotalUsd,
    custo_brl: custoTotalUsd * USD_TO_BRL,
    modelo: options.model,
    latencia_ms: 0,
    provider: 'anthropic' as const
  };
}

function detectProvider(model: string): 'openai' | 'anthropic' {
  if (model.startsWith('gpt-')) return 'openai';
  if (model.startsWith('claude-')) return 'anthropic';
  return 'openai';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const startTime = Date.now();
    const { messages, options } = await req.json();

    const provider = detectProvider(options.model);
    
    let result;
    if (provider === 'openai') {
      result = await chatOpenAI(messages, options);
    } else {
      result = await chatAnthropic(messages, options);
    }

    result.latencia_ms = Date.now() - startTime;

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in ai-chat:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
