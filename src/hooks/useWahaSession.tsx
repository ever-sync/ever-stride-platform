import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { WahaSession } from '@/types/waha';
import { wahaClient } from '@/lib/waha-client';
import { useAuth } from '@/hooks/useAuth';

const MAX_RECONNECT_ATTEMPTS = 5;
const INITIAL_RETRY_DELAY = 2000; // 2 segundos

async function logSessionAction(
  sessionId: string,
  actionType: string,
  status: 'success' | 'error' | 'pending',
  details?: any,
  errorMessage?: string
) {
  try {
    await supabase.rpc('log_waha_session_action', {
      p_session_id: sessionId,
      p_action_type: actionType,
      p_status: status,
      p_details: details || {},
      p_error_message: errorMessage,
      p_metadata: {}
    });
  } catch (error) {
    console.error('Failed to log action:', error);
  }
}

export function useWahaSession(clientId?: string) {
  const { userSession } = useAuth();
  const [session, setSession] = useState<WahaSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  const carregarSession = async () => {
    if (!clientId) return;

    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('waha_sessions')
        .select('*')
        .eq('client_id', clientId)
        .maybeSingle();

      if (error) throw error;
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

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://dffhhforfwhgzdlrfzpc.supabase.co';
      const webhookUrl = `${supabaseUrl}/functions/v1/waha-webhook`;

      const sessionData = await wahaClient.createSession({
        clientId,
        webhookUrl
      });

      const tenantId = userSession?.tenant?.id;
      if (!tenantId) {
        throw new Error('Tenant ID não encontrado');
      }

      const { data, error } = await supabase
        .from('waha_sessions')
        .insert({
          client_id: clientId,
          agent_id: agentId,
          tenant_id: tenantId,
          session_name: sessionData.session_name,
          status: sessionData.status,
          qr_code: sessionData.qr,
          webhook_url: webhookUrl
        })
        .select()
        .single();

      if (error) throw error;

      // Log da criação
      await logSessionAction(data.id, 'created', 'success', {
        session_name: sessionData.session_name,
        client_id: clientId,
        agent_id: agentId
      });

      toast({
        title: 'Sessão criada! ✓',
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

      await supabase
        .from('waha_sessions')
        .update({ 
          status: 'disconnected',
          disconnected_at: new Date().toISOString()
        })
        .eq('id', session.id);

      await logSessionAction(session.id, 'disconnected', 'success', {
        session_name: session.session_name
      });

      toast({
        title: 'Desconectado ✓',
        description: 'A sessão foi desconectada com sucesso'
      });

      await carregarSession();
    } catch (error: any) {
      await logSessionAction(session.id, 'disconnected', 'error', {}, error.message);
      
      toast({
        title: 'Erro ao desconectar',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  const attemptReconnect = useCallback(async () => {
    if (!session || retryCount >= MAX_RECONNECT_ATTEMPTS) return;

    const delay = INITIAL_RETRY_DELAY * Math.pow(2, retryCount);
    
    await logSessionAction(session.id, 'reconnect_attempt', 'pending', {
      attempt: retryCount + 1,
      max_attempts: MAX_RECONNECT_ATTEMPTS,
      delay_ms: delay
    });

    setTimeout(async () => {
      try {
        const status = await wahaClient.getSessionStatus(session.session_name);
        
        if (status === 'working') {
          setRetryCount(0);
          await supabase
            .from('waha_sessions')
            .update({ 
              status,
              reconnect_attempts: 0 
            })
            .eq('id', session.id);
          
          await logSessionAction(session.id, 'connected', 'success', {
            after_attempts: retryCount + 1
          });
          
          toast({
            title: 'Reconectado! ✓',
            description: 'Sessão reconectada com sucesso após ' + (retryCount + 1) + ' tentativa(s)',
          });
          
          setSession({ ...session, status, reconnect_attempts: 0 });
        } else {
          setRetryCount(prev => prev + 1);
          await supabase
            .from('waha_sessions')
            .update({ reconnect_attempts: retryCount + 1 })
            .eq('id', session.id);
        }
      } catch (error: any) {
        await logSessionAction(session.id, 'reconnect_attempt', 'error', {
          attempt: retryCount + 1
        }, error.message);
        setRetryCount(prev => prev + 1);
      }
    }, delay);
  }, [session, retryCount]);

  const atualizarStatus = async () => {
    if (!session) return;

    try {
      const status = await wahaClient.getSessionStatus(session.session_name);
      
      if (status !== session.status) {
        await supabase
          .from('waha_sessions')
          .update({ status })
          .eq('id', session.id);
        
        if (status === 'working' && session.status !== 'working') {
          await logSessionAction(session.id, 'connected', 'success', {
            previous_status: session.status
          });
          
          toast({
            title: 'WhatsApp Conectado! ✓',
            description: 'Sessão conectada com sucesso. Pronto para enviar mensagens.',
          });
          
          setRetryCount(0);
        } else if (status === 'disconnected' && session.status === 'working') {
          await logSessionAction(session.id, 'disconnected', 'error', {
            unexpected: true
          }, 'Conexão perdida inesperadamente');
          
          if (retryCount < MAX_RECONNECT_ATTEMPTS) {
            attemptReconnect();
          }
        }
        
        setSession({ ...session, status });
      }
    } catch (error: any) {
      console.error('Erro ao atualizar status:', error);
      
      if (session.status === 'working' && retryCount < MAX_RECONNECT_ATTEMPTS) {
        attemptReconnect();
      }
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
