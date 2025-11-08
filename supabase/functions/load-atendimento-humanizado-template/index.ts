import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { templateJson } = await req.json();
    
    if (!templateJson) {
      throw new Error('templateJson is required');
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('Loading Atendimento Humanizado template with', templateJson.nodes?.length || 0, 'nodes');

    // Check if template already exists
    const { data: existing } = await supabase
      .from('n8n_workflow_templates')
      .select('id, name')
      .eq('name', 'Atendimento Humanizado')
      .single();

    let result;
    if (existing) {
      // Update existing template
      console.log('Template already exists, updating...');
      const { data, error } = await supabase
        .from('n8n_workflow_templates')
        .update({ 
          template_json: templateJson,
          description: 'Template completo de atendimento humanizado com IA, transferências inteligentes para vendedores/grupos, pausar IA e avaliação de atendimento. Ideal para empresas que buscam um atendimento personalizado com múltiplos fluxos.',
          updated_at: new Date().toISOString() 
        })
        .eq('id', existing.id)
        .select()
        .single();

      if (error) throw error;
      result = data;
      console.log('Template updated successfully:', data.name);
    } else {
      // Create new template
      const { data, error } = await supabase
        .from('n8n_workflow_templates')
        .insert({
          name: 'Atendimento Humanizado',
          description: 'Template completo de atendimento humanizado com IA, transferências inteligentes para vendedores/grupos, pausar IA e avaliação de atendimento. Ideal para empresas que buscam um atendimento personalizado com múltiplos fluxos.',
          category: 'atendimento',
          difficulty_level: 'avancado',
          icon: '🤝',
          template_json: templateJson,
          is_public: true,
          has_ai: true,
          has_knowledge_base: false,
          has_human_handoff: true,
          has_approval_flow: true,
          has_multi_channel: false,
          required_integrations: ['supabase', 'waha', 'openai'],
          configurable_params: {
            script_atendimento: {
              type: 'textarea',
              label: 'Script de Atendimento',
              description: 'Script personalizado para o atendimento',
              required: true
            },
            saudacao: {
              type: 'textarea',
              label: 'Saudação Inicial',
              description: 'Mensagem de saudação do agente',
              required: true
            },
            codigo_pausar_ia: {
              type: 'text',
              label: 'Código para Pausar IA',
              description: 'Código que o agente deve usar para pausar o atendimento automático',
              default: 'PAUSAR_ATENDIMENTO'
            },
            codigo_transferir_vendedor: {
              type: 'text',
              label: 'Código Transferir Vendedor',
              description: 'Código para transferir atendimento para vendedor humano',
              default: 'TRANSFERIR_VENDEDOR'
            },
            codigo_transferir_grupo: {
              type: 'text',
              label: 'Código Transferir Grupo',
              description: 'Código para transferir atendimento para grupo',
              default: 'TRANSFERIR_GRUPO'
            },
            codigo_avaliacao: {
              type: 'text',
              label: 'Código Avaliação',
              description: 'Código para iniciar avaliação de atendimento',
              default: 'AVALIACAO'
            }
          }
        })
        .select()
        .single();

      if (error) throw error;
      result = data;
      console.log('Template created successfully:', data.name);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: existing ? 'Template updated successfully' : 'Template created successfully',
        nodes_count: templateJson.nodes?.length || 0,
        template_id: result.id,
        action: existing ? 'updated' : 'created'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in load-atendimento-humanizado-template:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
