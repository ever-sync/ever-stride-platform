import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CreateFromTemplateParams {
  templateId: string;
  agentId: string;
  clientId: string;
  tenantId: number;
  nome: string;
  customizations?: Record<string, any>;
}

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
    const params: CreateFromTemplateParams = await req.json();
    console.log('Creating workflow from template:', params.templateId);

    const N8N_API_URL = normalizeN8nUrl(Deno.env.get('N8N_API_URL') || '');
    const N8N_API_KEY = Deno.env.get('N8N_API_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');

    if (!N8N_API_URL || !N8N_API_KEY) {
      throw new Error('N8N API credentials not configured');
    }

    console.log('Using N8N API URL:', N8N_API_URL);
    console.log('N8N_API_KEY is set:', !!N8N_API_KEY);
    console.log('N8N_API_KEY length:', N8N_API_KEY?.length || 0);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get template
    const { data: template, error: templateError } = await supabase
      .from('n8n_workflow_templates')
      .select('*')
      .eq('id', params.templateId)
      .single();

    if (templateError || !template) {
      throw new Error('Template not found');
    }

    // Get agent details for AI configuration
    const { data: agent } = await supabase
      .from('agents')
      .select('*')
      .eq('id', params.agentId)
      .single();

    // Build workflow based on template
    const callbackUrl = `${SUPABASE_URL}/functions/v1/n8n-webhook-callback`;
    
    const workflowTemplate = {
      name: params.nome,
      nodes: [
        {
          parameters: {
            httpMethod: 'POST',
            path: `webhook-${params.agentId}`,
            responseMode: 'responseNode',
            options: {}
          },
          name: 'Webhook',
          type: 'n8n-nodes-base.webhook',
          typeVersion: 1,
          position: [250, 300]
        },
        {
          parameters: {
            jsCode: `
const phone = $json.body.payload.from;
const message = $json.body.payload.body;
const sessionId = $json.body.session;

return {
  phone,
  message,
  sessionId,
  timestamp: new Date().toISOString()
};`
          },
          name: 'Processar Mensagem',
          type: 'n8n-nodes-base.code',
          typeVersion: 2,
          position: [450, 300]
        },
        // Add template-specific nodes based on template type
        ...(template.has_knowledge_base ? [{
          parameters: {
            url: `${SUPABASE_URL}/functions/v1/search-knowledge`,
            method: 'POST',
            jsonParameters: true,
            options: {},
            bodyParametersJson: `{
  "agentId": "${params.agentId}",
  "query": "{{ $json.message }}"
}`
          },
          name: 'Buscar Knowledge Base',
          type: 'n8n-nodes-base.httpRequest',
          typeVersion: 4,
          position: [650, 300]
        }] : []),
        {
          parameters: {
            url: `${SUPABASE_URL}/functions/v1/ai-agent-chat`,
            method: 'POST',
            jsonParameters: true,
            options: {},
            bodyParametersJson: `{
  "agentId": "${params.agentId}",
  "message": "{{ $json.message }}",
  "sessionId": "{{ $json.sessionId }}"${template.has_knowledge_base ? ',\n  "context": "{{ $json.results }}"' : ''}
}`
          },
          name: 'Chamar IA',
          type: 'n8n-nodes-base.httpRequest',
          typeVersion: 4,
          position: [850, 300]
        },
        {
          parameters: {
            url: `${SUPABASE_URL}/functions/v1/waha-send-message`,
            method: 'POST',
            jsonParameters: true,
            options: {},
            bodyParametersJson: `{
  "sessionId": "{{ $json.sessionId }}",
  "chatId": "{{ $json.phone }}",
  "text": "{{ $json.response }}"
}`
          },
          name: 'Enviar Resposta WAHA',
          type: 'n8n-nodes-base.httpRequest',
          typeVersion: 4,
          position: [1050, 300]
        },
        {
          parameters: {
            url: callbackUrl,
            method: 'POST',
            jsonParameters: true,
            options: {},
            bodyParametersJson: `{
  "executionId": "{{ $execution.id }}",
  "workflowId": "{{ $workflow.id }}",
  "status": "success",
  "mode": "{{ $execution.mode }}",
  "startedAt": "{{ $execution.startTime }}",
  "stoppedAt": "{{ $now }}"
}`
          },
          name: 'Callback Success',
          type: 'n8n-nodes-base.httpRequest',
          typeVersion: 4,
          position: [1250, 300]
        },
        {
          parameters: {
            url: callbackUrl,
            method: 'POST',
            jsonParameters: true,
            options: {},
            bodyParametersJson: `{
  "executionId": "{{ $execution.id }}",
  "workflowId": "{{ $workflow.id }}",
  "status": "failed",
  "mode": "{{ $execution.mode }}",
  "startedAt": "{{ $execution.startTime }}",
  "stoppedAt": "{{ $now }}",
  "error": {
    "message": "{{ $json.error.message }}",
    "node": "{{ $json.error.node.name }}"
  }
}`
          },
          name: 'Callback Error',
          type: 'n8n-nodes-base.httpRequest',
          typeVersion: 4,
          position: [1250, 500]
        }
      ],
      connections: {},
      settings: {
        executionOrder: 'v1'
      },
      active: true
    };

    // Create workflow in N8N
    const response = await fetch(`${N8N_API_URL}/api/v1/workflows`, {
      method: 'POST',
      headers: {
        'X-N8N-API-KEY': N8N_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(workflowTemplate)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('N8N API error:', response.status, errorText);
      console.error('Request URL:', `${N8N_API_URL}/api/v1/workflows`);
      console.error('Request headers:', {
        'X-N8N-API-KEY': N8N_API_KEY ? `${N8N_API_KEY.substring(0, 4)}...` : 'NOT SET',
        'Content-Type': 'application/json'
      });
      
      if (response.status === 401) {
        throw new Error(
          `N8N API authentication failed. Please verify:\n` +
          `1. N8N_API_KEY secret is correct\n` +
          `2. API key has permission to create workflows\n` +
          `3. N8N instance URL is correct: ${N8N_API_URL}\n` +
          `Error details: ${errorText}`
        );
      }
      
      throw new Error(`Failed to create workflow: ${response.statusText} - ${errorText}`);
    }

    const workflowData = await response.json();
    const webhookUrl = `${N8N_API_URL}/webhook/${workflowTemplate.nodes[0].parameters.path}`;

    // Save to database
    const { data: dbWorkflow, error: dbError } = await supabase
      .from('n8n_workflows')
      .insert({
        tenant_id: params.tenantId,
        agent_id: params.agentId,
        workflow_id: workflowData.id,
        workflow_name: params.nome,
        webhook_url: webhookUrl,
        webhook_test_url: `${webhookUrl}/test`,
        is_active: true
      })
      .select()
      .single();

    if (dbError) {
      console.error('Error saving to database:', dbError);
      // Try to delete the N8N workflow
      await fetch(`${N8N_API_URL}/api/v1/workflows/${workflowData.id}`, {
        method: 'DELETE',
        headers: { 'X-N8N-API-KEY': N8N_API_KEY }
      });
      throw dbError;
    }

    // Update template usage count
    await supabase.rpc('increment', {
      table_name: 'n8n_workflow_templates',
      row_id: params.templateId,
      column_name: 'usage_count'
    });

    return new Response(
      JSON.stringify({
        workflow_id: workflowData.id,
        webhook_url: webhookUrl,
        webhook_test_url: `${webhookUrl}/test`,
        db_id: dbWorkflow.id
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in n8n-workflow-from-template:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
