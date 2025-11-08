import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { n8nClient } from '@/lib/n8n-client';
import { toast } from 'sonner';
import type { N8NWorkflow, N8NWorkflowTemplate } from '@/types/n8n';

export function useN8NWorkflows() {
  const [workflows, setWorkflows] = useState<N8NWorkflow[]>([]);
  const [templates, setTemplates] = useState<N8NWorkflowTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [operationLoading, setOperationLoading] = useState(false);

  const loadWorkflows = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('n8n_workflows')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Calculate computed fields
      const workflowsWithStats = data?.map(workflow => ({
        ...workflow,
        error_rate: workflow.total_executions > 0
          ? (workflow.failed_executions / workflow.total_executions) * 100
          : 0,
        success_rate: workflow.total_executions > 0
          ? ((workflow.total_executions - workflow.failed_executions) / workflow.total_executions) * 100
          : 100
      })) || [];

      setWorkflows(workflowsWithStats);
    } catch (error) {
      console.error('Error loading workflows:', error);
      toast.error('Erro ao carregar workflows');
    } finally {
      setLoading(false);
    }
  };

  const loadTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from('n8n_workflow_templates')
        .select('*')
        .eq('is_public', true)
        .order('usage_count', { ascending: false });

      if (error) throw error;
      setTemplates((data as any) || []);
    } catch (error) {
      console.error('Error loading templates:', error);
    }
  };

  const createFromTemplate = async (
    templateId: string,
    agentId: string,
    clientId: string,
    tenantId: number,
    nome: string,
    customizations?: Record<string, any>
  ) => {
    try {
      setOperationLoading(true);
      const { data, error } = await supabase.functions.invoke('n8n-workflow-from-template', {
        body: {
          templateId,
          agentId,
          clientId,
          tenantId,
          nome,
          customizations
        }
      });

      if (error) throw error;

      toast.success('Workflow criado com sucesso!');
      await loadWorkflows();
      return data;
    } catch (error) {
      console.error('Error creating workflow from template:', error);
      toast.error('Erro ao criar workflow');
      throw error;
    } finally {
      setOperationLoading(false);
    }
  };

  const toggleActive = async (workflowId: string, active: boolean) => {
    try {
      setOperationLoading(true);
      await n8nClient.activateWorkflow(workflowId, active);
      
      // Update local state
      setWorkflows(prev =>
        prev.map(w =>
          w.workflow_id === workflowId ? { ...w, is_active: active } : w
        )
      );

      toast.success(active ? 'Workflow ativado' : 'Workflow desativado');
    } catch (error) {
      console.error('Error toggling workflow:', error);
      toast.error('Erro ao alterar status do workflow');
      throw error;
    } finally {
      setOperationLoading(false);
    }
  };

  const deleteWorkflow = async (id: string, workflowId: string) => {
    try {
      setOperationLoading(true);
      
      // Delete from N8N
      await n8nClient.deleteWorkflow(workflowId);

      // Delete from database
      const { error } = await supabase
        .from('n8n_workflows')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setWorkflows(prev => prev.filter(w => w.id !== id));
      toast.success('Workflow excluído com sucesso');
    } catch (error) {
      console.error('Error deleting workflow:', error);
      toast.error('Erro ao excluir workflow');
      throw error;
    } finally {
      setOperationLoading(false);
    }
  };

  const testWebhook = async (webhookUrl: string, payload: any) => {
    try {
      setOperationLoading(true);
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      toast.success('Webhook testado com sucesso!');
      return result;
    } catch (error) {
      console.error('Error testing webhook:', error);
      toast.error('Erro ao testar webhook');
      throw error;
    } finally {
      setOperationLoading(false);
    }
  };

  useEffect(() => {
    loadWorkflows();
    loadTemplates();

    // Set up real-time subscription
    const channel = supabase
      .channel('n8n_workflows_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'n8n_workflows'
        },
        () => {
          loadWorkflows();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return {
    workflows,
    templates,
    loading,
    operationLoading,
    createFromTemplate,
    toggleActive,
    deleteWorkflow,
    testWebhook,
    reload: loadWorkflows
  };
}
