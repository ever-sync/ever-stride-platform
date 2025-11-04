import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { wahaAPI } from '@/lib/waha';
import { toast } from '@/hooks/use-toast';
import { WhatsAppClient } from '@/types/database';

export interface ClientStats {
  total: number;
  ativos: number;
  inativos: number;
  totalMensagens: number;
}

export function useWhatsAppClients() {
  const [clientes, setClientes] = useState<WhatsAppClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<ClientStats>({
    total: 0,
    ativos: 0,
    inativos: 0,
    totalMensagens: 0,
  });

  const carregarClientes = async () => {
    try {
      const { data, error } = await supabase
        .from('whatsapp_clients')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setClientes((data || []) as WhatsAppClient[]);
      
      // Calculate statistics
      const total = data?.length || 0;
      const ativos = data?.filter(c => c.ativo).length || 0;
      const inativos = total - ativos;
      
      setStats({ total, ativos, inativos, totalMensagens: 0 });
    } catch (error) {
      console.error('Error loading WhatsApp clients:', error);
      toast({
        title: 'Erro ao carregar clientes',
        description: 'Não foi possível carregar a lista de clientes WhatsApp.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const criarCliente = async (dados: Partial<WhatsAppClient>) => {
    try {
      const { data: cliente, error } = await supabase
        .from('whatsapp_clients')
        .insert([dados as any])
        .select()
        .single();

      if (error) throw error;

      // Create Waha session
      try {
        const webhookUrl = import.meta.env.VITE_N8N_WEBHOOK_URL 
          ? `${import.meta.env.VITE_N8N_WEBHOOK_URL}?client_id=${cliente.id}`
          : '';
        
        await wahaAPI.criarSessao(cliente.id, webhookUrl);
        
        await supabase
          .from('whatsapp_clients')
          .update({
            waha_session_id: cliente.id,
            waha_webhook_url: webhookUrl,
          })
          .eq('id', cliente.id);
      } catch (wahaError) {
        console.warn('Error creating Waha session:', wahaError);
      }

      await carregarClientes();
      
      toast({
        title: 'Cliente criado com sucesso!',
        description: `Cliente ${dados.nome_empresa} foi adicionado.`,
      });
      
      return cliente;
    } catch (error: any) {
      console.error('Error creating client:', error);
      toast({
        title: 'Erro ao criar cliente',
        description: error.message || 'Não foi possível criar o cliente.',
        variant: 'destructive',
      });
      throw error;
    }
  };

  const atualizarCliente = async (id: string, dados: Partial<WhatsAppClient>) => {
    try {
      const { error } = await supabase
        .from('whatsapp_clients')
        .update(dados)
        .eq('id', id);

      if (error) throw error;

      await carregarClientes();
      
      toast({
        title: 'Cliente atualizado!',
        description: 'As informações foram salvas com sucesso.',
      });
    } catch (error: any) {
      console.error('Error updating client:', error);
      toast({
        title: 'Erro ao atualizar cliente',
        description: error.message || 'Não foi possível atualizar o cliente.',
        variant: 'destructive',
      });
      throw error;
    }
  };

  const deletarCliente = async (id: string, sessionId: string | null) => {
    try {
      // Try to delete Waha session
      if (sessionId) {
        try {
          await wahaAPI.deletarSessao(sessionId);
        } catch (wahaError) {
          console.warn('Error deleting Waha session:', wahaError);
        }
      }

      const { error } = await supabase
        .from('whatsapp_clients')
        .delete()
        .eq('id', id);

      if (error) throw error;

      await carregarClientes();
      
      toast({
        title: 'Cliente deletado',
        description: 'O cliente foi removido do sistema.',
      });
    } catch (error: any) {
      console.error('Error deleting client:', error);
      toast({
        title: 'Erro ao deletar cliente',
        description: error.message || 'Não foi possível deletar o cliente.',
        variant: 'destructive',
      });
      throw error;
    }
  };

  const toggleStatus = async (id: string, ativo: boolean) => {
    try {
      const { error } = await supabase
        .from('whatsapp_clients')
        .update({ ativo })
        .eq('id', id);

      if (error) throw error;

      await carregarClientes();
      
      toast({
        title: ativo ? 'Cliente ativado' : 'Cliente desativado',
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
    carregarClientes();
  }, []);

  return {
    clientes,
    loading,
    stats,
    criarCliente,
    atualizarCliente,
    deletarCliente,
    toggleStatus,
    recarregar: carregarClientes,
  };
}
