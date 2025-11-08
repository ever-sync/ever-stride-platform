import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const payload = await req.json()
    
    console.log('N8N Webhook received:', {
      workflow_id: payload.workflow_id,
      execution_id: payload.execution_id,
      status: payload.status
    })
    
    // Extrair dados essenciais
    const {
      workflow_id,
      execution_id,
      status, // success, error
      started_at,
      finished_at,
      error_message,
      input_data,
      output_data,
      agent_id, // Deve vir do workflow
      tokens_used,
      custo_brl
    } = payload

    if (!agent_id || !workflow_id || !execution_id) {
      console.error('Missing required fields:', { agent_id, workflow_id, execution_id })
      return new Response(
        JSON.stringify({ error: 'Missing required fields: agent_id, workflow_id, execution_id' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    const duration_ms = started_at && finished_at 
      ? new Date(finished_at).getTime() - new Date(started_at).getTime()
      : null

    // 1. Registrar execução
    const { data: execution, error: execError } = await supabase
      .from('n8n_executions')
      .insert({
        agent_id: agent_id,
        n8n_execution_id: execution_id,
        n8n_workflow_id: workflow_id,
        status: status,
        started_at: started_at,
        finished_at: finished_at,
        duration_ms: duration_ms,
        input_summary: input_data ? { 
          message: input_data.message?.substring(0, 200) 
        } : null,
        output_summary: output_data ? {
          response: output_data.response?.substring(0, 200)
        } : null,
        error_message: error_message,
        tokens_used: tokens_used,
        custo_brl: custo_brl
      })
      .select()
      .single()

    if (execError) {
      console.error('Erro ao salvar execução:', execError)
      throw execError
    }

    console.log('Execution saved:', execution.id)

    // 2. Registrar evento correspondente
    const eventType = status === 'success' ? 'workflow_executed' : 'error'
    const severity = status === 'success' ? 'info' : 'error'

    const { error: eventError } = await supabase.rpc('log_agent_event', {
      p_agent_id: agent_id,
      p_event_type: eventType,
      p_severity: severity,
      p_event_data: {
        execution_id: execution_id,
        workflow_id: workflow_id,
        duration_ms: duration_ms
      },
      p_tokens_used: tokens_used,
      p_custo_brl: custo_brl,
      p_latencia_ms: duration_ms,
      p_error_message: error_message
    })

    if (eventError) {
      console.error('Erro ao registrar evento:', eventError)
    }

    console.log('Event logged successfully')

    // 3. Se erro crítico, logar para notificação futura
    if (status === 'error') {
      console.error('❌ Workflow falhou:', {
        agent_id,
        execution_id,
        error: error_message
      })
      // TODO: Enviar notificação (email/slack)
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        execution_id: execution?.id,
        event_logged: !eventError
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error: any) {
    console.error('❌ Erro no webhook handler:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
