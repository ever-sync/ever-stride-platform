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
    const { tenantId, workflowId, timeRange = '24h' } = await req.json();

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Calculate time window
    const now = new Date();
    let startTime: Date;
    switch (timeRange) {
      case '7d':
        startTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startTime = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      default: // '24h'
        startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    }

    // Get workflows for tenant
    let workflowQuery = supabase
      .from('n8n_workflows')
      .select('*');

    if (tenantId) {
      workflowQuery = workflowQuery.eq('tenant_id', tenantId);
    }
    if (workflowId) {
      workflowQuery = workflowQuery.eq('workflow_id', workflowId);
    }

    const { data: workflows, error: workflowError } = await workflowQuery;

    if (workflowError) throw workflowError;

    // Get execution logs for the time range
    let logsQuery = supabase
      .from('n8n_execution_logs')
      .select('*')
      .gte('created_at', startTime.toISOString())
      .order('created_at', { ascending: false });

    if (tenantId) {
      logsQuery = logsQuery.eq('tenant_id', tenantId);
    }
    if (workflowId) {
      logsQuery = logsQuery.eq('workflow_id', workflowId);
    }

    const { data: logs, error: logsError } = await logsQuery;

    if (logsError) throw logsError;

    // Calculate statistics
    const totalExecutions = logs?.length || 0;
    const successfulExecutions = logs?.filter(log => log.execution_status === 'success').length || 0;
    const failedExecutions = logs?.filter(log => log.execution_status === 'failed' || log.execution_status === 'error').length || 0;
    const successRate = totalExecutions > 0 ? (successfulExecutions / totalExecutions) * 100 : 0;

    const executionTimes = logs?.map(log => log.execution_time_ms).filter(Boolean) || [];
    const avgExecutionTime = executionTimes.length > 0
      ? executionTimes.reduce((a, b) => a + b, 0) / executionTimes.length
      : 0;

    // Calculate trends (group by day)
    const trends: Record<string, { total: number; success: number; failed: number }> = {};
    logs?.forEach(log => {
      const date = new Date(log.created_at).toISOString().split('T')[0];
      if (!trends[date]) {
        trends[date] = { total: 0, success: 0, failed: 0 };
      }
      trends[date].total++;
      if (log.execution_status === 'success') {
        trends[date].success++;
      } else if (log.execution_status === 'failed' || log.execution_status === 'error') {
        trends[date].failed++;
      }
    });

    const trendArray = Object.entries(trends).map(([date, data]) => ({
      date,
      ...data
    })).sort((a, b) => a.date.localeCompare(b.date));

    // Find workflows with problems (>20% error rate or >5s avg time)
    const problematicWorkflows = workflows?.filter(workflow => {
      const workflowLogs = logs?.filter(log => log.workflow_id === workflow.workflow_id) || [];
      if (workflowLogs.length < 5) return false; // Need at least 5 executions to determine

      const workflowFailed = workflowLogs.filter(log => 
        log.execution_status === 'failed' || log.execution_status === 'error'
      ).length;
      const errorRate = workflowFailed / workflowLogs.length;

      const workflowTimes = workflowLogs.map(log => log.execution_time_ms).filter(Boolean);
      const avgTime = workflowTimes.length > 0
        ? workflowTimes.reduce((a, b) => a + b, 0) / workflowTimes.length
        : 0;

      return errorRate > 0.2 || avgTime > 5000;
    }) || [];

    // Get recent logs (last 10)
    const recentLogs = logs?.slice(0, 10) || [];

    return new Response(
      JSON.stringify({
        stats: {
          total_workflows: workflows?.length || 0,
          active_workflows: workflows?.filter(w => w.is_active).length || 0,
          total_executions: totalExecutions,
          successful_executions: successfulExecutions,
          failed_executions: failedExecutions,
          success_rate: Math.round(successRate * 10) / 10,
          avg_execution_time_ms: Math.round(avgExecutionTime),
          workflows_with_errors: problematicWorkflows.length
        },
        trends: trendArray,
        problematic_workflows: problematicWorkflows.map(w => ({
          workflow_id: w.workflow_id,
          workflow_name: w.workflow_name,
          total_executions: w.total_executions,
          failed_executions: w.failed_executions,
          error_rate: w.total_executions > 0 
            ? Math.round((w.failed_executions / w.total_executions) * 100 * 10) / 10
            : 0
        })),
        recent_logs: recentLogs
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in n8n-get-stats:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
