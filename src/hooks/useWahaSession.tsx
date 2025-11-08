import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { WahaSession } from '@/types/waha';
import { wahaClient } from '@/lib/waha-client';

export function useWahaSession(clientId?: string) {
  const [session, setSession] = useState<WahaSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);

  const carregarSession = async () => {
    if (!clientId) return;

    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('waha_sessions')
        .select('*')
        .eq('client_id', clientId)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      setSession(data);
    } catch (error: any) {
      console.error('Erro ao carregar sessão:', error);
    } finally {
      setLoading(false);
    }
  };

  const criarSession = async (agentId?: string) => {
    if (!clientId) return;

    try {
      setConnecting(true);

      // Buscar webhook URL
      const webhookUrl = `${window.location.origin}/webhook/waha`;

      // Criar sessão via edge function
      const sessionData = await wahaClient.createSession({
        clientId,
        webhookUrl
      });

      // Salvar no banco
      const { data, error } = await supabase
        .from('waha_sessions')
        .insert({
          client_id: clientId,
          agent_id: agentId,
          tenant_id: 1, // TODO: pegar do contexto
          session_name: sessionData.session_name,
          status: sessionData.status,
          qr_code: sessionData.qr,
          webhook_url: webhookUrl
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: 'Sessão criada!',
        description: 'Escaneie o QR Code para conectar'
      });

      await carregarSession();
      return data;
    } catch (error: any) {
      toast({
        title: 'Erro ao criar sessão',
        description: error.message,
        variant: 'destructive'
      });
      throw error;
    } finally {
      setConnecting(false);
    }
  };

  const atualizarQR = async () => {
    if (!session) return;

    try {
      const qr = await wahaClient.getQRCode(session.session_name);
      
      if (qr) {
        // Atualizar no banco
        await supabase
          .from('waha_sessions')
          .update({ qr_code: qr })
          .eq('id', session.id);
        
        setSession({ ...session, qr_code: qr });
      }
    } catch (error) {
      console.error('Erro ao atualizar QR:', error);
    }
  };

  const desconectar = async () => {
    if (!session) return;

    try {
      await wahaClient.stopSession(session.session_name);

      // Atualizar status no banco
      await supabase
        .from('waha_sessions')
        .update({ 
          status: 'disconnected',
          disconnected_at: new Date().toISOString()
        })
        .eq('id', session.id);

      toast({
        title: 'Desconectado',
        description: 'A sessão foi desconectada com sucesso'
      });

      await carregarSession();
    } catch (error: any) {
      toast({
        title: 'Erro ao desconectar',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  const atualizarStatus = async () => {
    if (!session) return;

    try {
      const status = await wahaClient.getSessionStatus(session.session_name);
      
      if (status !== session.status) {
        await supabase
          .from('waha_sessions')
          .update({ status })
          .eq('id', session.id);
        
        setSession({ ...session, status });
      }
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
    }
  };

  useEffect(() => {
    carregarSession();
    
    // Polling para atualizar status e QR
    const interval = setInterval(() => {
      if (session?.status === 'qr_code' || session?.status === 'connecting') {
        atualizarStatus();
        if (session.status === 'qr_code') {
          atualizarQR();
        }
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [clientId, session?.status]);

  return {
    session,
    loading,
    connecting,
    criarSession,
    atualizarQR,
    desconectar,
    atualizarStatus,
    refresh: carregarSession
  };
}
