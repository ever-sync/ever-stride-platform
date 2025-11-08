import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface N8NCallbackPayload {
  executionId: string;
  workflowId: string;
  status: 'success' | 'failed' | 'error';
  mode: string;
  startedAt: string;
  stoppedAt?: string;
  data?: {
    resultData?: any;
    executionData?: any;
  };
  error?: {
    message: string;
    stack?: string;
    node?: string;
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const payload: N8NCallbackPayload = await req.json();
    console.log('Received N8N callback:', { executionId: payload.executionId, status: payload.status });

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get workflow details to extract tenant_id and agent_id
    const { data: workflow, error: workflowError } = await supabase
      .from('n8n_workflows')
      .select('tenant_id, agent_id')
      .eq('workflow_id', payload.workflowId)
      .single();

    if (workflowError || !workflow) {
      console.error('Workflow not found:', payload.workflowId, workflowError);
      return new Response(
        JSON.stringify({ error: 'Workflow not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Calculate execution time
    const startedAt = new Date(payload.startedAt);
    const stoppedAt = payload.stoppedAt ? new Date(payload.stoppedAt) : new Date();
    const executionTimeMs = stoppedAt.getTime() - startedAt.getTime();

    // Insert execution log
    const { error: logError } = await supabase
      .from('n8n_execution_logs')
      .insert({
        tenant_id: workflow.tenant_id,
        workflow_id: payload.workflowId,
        agent_id: workflow.agent_id,
        execution_id: payload.executionId,
        execution_status: payload.status,
        execution_mode: payload.mode,
        started_at: payload.startedAt,
        finished_at: payload.stoppedAt,
        execution_time_ms: executionTimeMs,
        input_data: payload.data?.executionData,
        output_data: payload.data?.resultData,
        error_message: payload.error?.message,
        error_stack: payload.error?.stack,
        failed_node: payload.error?.node,
      });

    if (logError) {
      console.error('Error inserting execution log:', logError);
    }

    // Update workflow statistics
    const { error: statsError } = await supabase.rpc('update_n8n_workflow_stats', {
      p_workflow_id: payload.workflowId,
      p_execution_status: payload.status,
      p_execution_time_ms: executionTimeMs,
    });

    if (statsError) {
      console.error('Error updating workflow stats:', statsError);
    }

    // Check for high error rate and create alert if needed
    if (payload.status === 'failed' || payload.status === 'error') {
      const { data: recentLogs } = await supabase
        .from('n8n_execution_logs')
        .select('execution_status')
        .eq('workflow_id', payload.workflowId)
        .order('created_at', { ascending: false })
        .limit(10);

      if (recentLogs) {
        const errorCount = recentLogs.filter(log => 
          log.execution_status === 'failed' || log.execution_status === 'error'
        ).length;
        const errorRate = errorCount / recentLogs.length;

        if (errorRate > 0.3) {
          console.warn(`⚠️ High error rate detected for workflow ${payload.workflowId}: ${(errorRate * 100).toFixed(1)}%`);
          // Future: Create alert notification
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Callback processed' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in n8n-webhook-callback:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
