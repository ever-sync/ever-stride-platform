import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { n8nClient } from '@/lib/n8n-client';
import { Agent } from '@/types/database';

export interface AgentStats {
  total: number;
  ativos: number;
  inativos: number;
  totalMensagens: number;
}

export function useAgents() {
  const [agentes, setAgentes] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<AgentStats>({
    total: 0,
    ativos: 0,
    inativos: 0,
    totalMensagens: 0,
  });

  const carregarAgentes = async () => {
    try {
      const { data, error } = await supabase
        .from('agents')
        .select('*, whatsapp_clients(nome_empresa), n8n_workflows(workflow_id, webhook_url, is_active)')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setAgentes((data || []) as Agent[]);
      
      const total = data?.length || 0;
      const ativos = data?.filter(a => a.ativo).length || 0;
      const inativos = total - ativos;
      const totalMensagens = data?.reduce((acc, a) => acc + (a.mensagens_usadas_mes || 0), 0) || 0;
      
      setStats({ total, ativos, inativos, totalMensagens });
    } catch (error) {
      console.error('Error loading agents:', error);
      toast({
        title: 'Erro ao carregar agentes',
        description: 'Não foi possível carregar a lista de agentes.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const criarAgente = async (dados: Partial<Agent>) => {
    try {
      // 1. Criar agente no banco
      const { data: agente, error } = await supabase
        .from('agents')
        .insert([dados as any])
        .select()
        .single();

      if (error) throw error;

      // 2. Criar workflow N8N (opcional)
      if (agente.client_id && agente.nome_agente) {
        try {
          const workflowData = await n8nClient.createWorkflow({
            agentId: agente.id,
            clientId: agente.client_id,
            nome: agente.nome_agente
          });

          // 3. Registrar workflow no banco
          await supabase
            .from('n8n_workflows')
            .insert({
              agent_id: agente.id,
              tenant_id: agente.tenant_id,
              workflow_id: workflowData.workflow_id,
              workflow_name: `Agente-${agente.nome_agente}`,
              webhook_url: workflowData.webhook_url,
              webhook_test_url: workflowData.webhook_test_url,
              is_active: true
            });

          // 4. Atualizar agente com workflow ID
          await supabase
            .from('agents')
            .update({
              n8n_workflow_id: workflowData.workflow_id,
              webhook_url: workflowData.webhook_url
            })
            .eq('id', agente.id);
        } catch (workflowError) {
          console.error('Erro ao criar workflow N8N:', workflowError);
          toast({
            title: 'Agente criado, workflow falhou',
            description: 'O agente foi criado mas o workflow N8N não pôde ser configurado.',
            variant: 'destructive',
          });
        }
      }

      await carregarAgentes();
      
      toast({
        title: 'Agente criado com sucesso!',
        description: `Agente ${dados.nome_agente} foi adicionado.`,
      });
      
      return agente;
    } catch (error: any) {
      console.error('Error creating agent:', error);
      toast({
        title: 'Erro ao criar agente',
        description: error.message || 'Não foi possível criar o agente.',
        variant: 'destructive',
      });
      throw error;
    }
  };

  const atualizarAgente = async (id: string, dados: Partial<Agent>) => {
    try {
      const { error } = await supabase
        .from('agents')
        .update(dados)
        .eq('id', id);

      if (error) throw error;

      await carregarAgentes();
      
      toast({
        title: 'Agente atualizado!',
        description: 'As informações foram salvas com sucesso.',
      });
    } catch (error: any) {
      console.error('Error updating agent:', error);
      toast({
        title: 'Erro ao atualizar agente',
        description: error.message || 'Não foi possível atualizar o agente.',
        variant: 'destructive',
      });
      throw error;
    }
  };

  const deletarAgente = async (id: string) => {
    try {
      // Buscar workflow associado
      const { data: agent } = await supabase
        .from('agents')
        .select('n8n_workflow_id')
        .eq('id', id)
        .single();

      // Deletar workflow N8N se existir
      if (agent?.n8n_workflow_id) {
        try {
          await n8nClient.deleteWorkflow(agent.n8n_workflow_id);
          
          // Deletar registro do workflow
          await supabase
            .from('n8n_workflows')
            .delete()
            .eq('workflow_id', agent.n8n_workflow_id);
        } catch (workflowError) {
          console.error('Erro ao deletar workflow:', workflowError);
        }
      }

      // Deletar agente
      const { error } = await supabase
        .from('agents')
        .delete()
        .eq('id', id);

      if (error) throw error;

      await carregarAgentes();
      
      toast({
        title: 'Agente deletado',
        description: 'O agente foi removido do sistema.',
      });
    } catch (error: any) {
      console.error('Error deleting agent:', error);
      toast({
        title: 'Erro ao deletar agente',
        description: error.message || 'Não foi possível deletar o agente.',
        variant: 'destructive',
      });
      throw error;
    }
  };

  const toggleStatus = async (id: string, ativo: boolean) => {
    try {
      const { error } = await supabase
        .from('agents')
        .update({ ativo })
        .eq('id', id);

      if (error) throw error;

      await carregarAgentes();
      
      toast({
        title: ativo ? 'Agente ativado' : 'Agente desativado',
        description: `O status foi alterado com sucesso.`,
      });
    } catch (error: any) {
      console.error('Error toggling status:', error);
      toast({
        title: 'Erro ao alterar status',
        description: error.message || 'Não foi possível alterar o status.',
        variant: 'destructive',
      });
      throw error;
    }
  };

  useEffect(() => {
    carregarAgentes();
  }, []);

  return {
    agentes,
    loading,
    stats,
    criarAgente,
    atualizarAgente,
    deletarAgente,
    toggleStatus,
    recarregar: carregarAgentes,
  };
}
