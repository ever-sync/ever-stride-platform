import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { fetchWithRetry } from '../_shared/retry.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper function to normalize N8N URL
const normalizeN8nUrl = (url: string): string => {
  if (!url) return url;
  // Remove trailing slashes
  url = url.replace(/\/+$/, '');
  // Add https:// if no protocol is present
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    return `https://${url}`;
  }
  return url;
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const N8N_API_URL = normalizeN8nUrl(Deno.env.get('N8N_API_URL') || '');
    const N8N_API_KEY = Deno.env.get('N8N_API_KEY');
    const WAHA_API_URL = Deno.env.get('WAHA_API_URL');
    const WAHA_API_KEY = Deno.env.get('WAHA_API_KEY');
    const APP_URL = Deno.env.get('SUPABASE_URL');

    if (!N8N_API_URL || !N8N_API_KEY) {
      throw new Error('N8N API credentials not configured');
    }

    const { agentId, clientId, nome } = await req.json();
    
    console.log('Creating N8N workflow:', { agentId, clientId, nome });

    // Template do workflow
    const workflowTemplate = {
      name: `Agente-${nome}-${agentId.slice(0, 8)}`,
      nodes: [
        {
          name: 'Webhook',
          type: 'n8n-nodes-base.webhook',
          typeVersion: 1,
          position: [250, 300],
          webhookId: agentId,
          parameters: {
            path: `agente-${agentId}`,
            responseMode: 'lastNode',
            options: {}
          }
        },
        {
          name: 'Processar Mensagem',
          type: 'n8n-nodes-base.function',
          typeVersion: 1,
          position: [450, 300],
          parameters: {
            functionCode: `
              const message = items[0].json.payload.body;
              const from = items[0].json.payload.from;
              
              return [{
                json: {
                  agent_id: '${agentId}',
                  client_id: '${clientId}',
                  message: message,
                  from: from,
                  timestamp: new Date().toISOString()
                }
              }];
            `
          }
        },
        {
          name: 'Chamar API IA',
          type: 'n8n-nodes-base.httpRequest',
          typeVersion: 3,
          position: [650, 300],
          parameters: {
            method: 'POST',
            url: `${APP_URL}/functions/v1/ai-agent-chat`,
            sendBody: true,
            bodyParameters: {
              parameters: [
                { name: 'agent_id', value: '={{$json.agent_id}}' },
                { name: 'message', value: '={{$json.message}}' },
                { name: 'from', value: '={{$json.from}}' },
                { name: 'chat_id', value: '={{$json.chat_id}}' }
              ]
            }
          }
        },
        {
          name: 'Enviar Resposta WAHA',
          type: 'n8n-nodes-base.httpRequest',
          typeVersion: 3,
          position: [850, 300],
          parameters: {
            method: 'POST',
            url: `${WAHA_API_URL}/api/sendText`,
            sendHeaders: true,
            headerParameters: {
              parameters: [
                { name: 'X-Api-Key', value: WAHA_API_KEY }
              ]
            },
            sendBody: true,
            bodyParameters: {
              parameters: [
                { name: 'session', value: `cliente-${clientId}` },
                { name: 'chatId', value: '={{$node["Processar Mensagem"].json["from"]}}' },
                { name: 'text', value: '={{$node["Chamar API IA"].json["response"]}}' }
              ]
            }
          }
        }
      ],
      connections: {
        'Webhook': { main: [[{ node: 'Processar Mensagem', type: 'main', index: 0 }]] },
        'Processar Mensagem': { main: [[{ node: 'Chamar API IA', type: 'main', index: 0 }]] },
        'Chamar API IA': { main: [[{ node: 'Enviar Resposta WAHA', type: 'main', index: 0 }]] }
      },
      active: true,
      settings: {}
    };

    const response = await fetchWithRetry(
      `${N8N_API_URL}/api/v1/workflows`,
      {
        method: 'POST',
        headers: {
          'X-N8N-API-KEY': N8N_API_KEY,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(workflowTemplate)
      },
      3 // maxRetries
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('N8N API error:', response.status, errorText);
      throw new Error(`Failed to create workflow: ${response.statusText}`);
    }

    const data = await response.json();

    return new Response(
      JSON.stringify({
        workflow_id: data.id,
        webhook_url: `${N8N_API_URL}/webhook/agente-${agentId}`,
        webhook_test_url: `${N8N_API_URL}/webhook-test/agente-${agentId}`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in n8n-workflow-create:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
