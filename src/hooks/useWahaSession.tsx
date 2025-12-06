import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { WahaSession } from '@/types/waha';
import { wahaClient } from '@/lib/waha-client';
import { useAuth } from '@/hooks/useAuth';
import { mapWahaStatusToDb } from '@/lib/waha-status-mapper';
import { retryWithBackoff } from '@/lib/retry-utils';

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
  const [qrRetryAttempt, setQrRetryAttempt] = useState(0);

  const carregarSession = async () => {
    if (!clientId) return;

    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('evolution_instances')
        .select('*')
        .eq('client_id', clientId)
        .maybeSingle();

      if (error) throw error;
      
      // Map evolution_instances fields to WahaSession type
      if (data) {
        setSession({
          id: data.id,
          tenant_id: data.tenant_id,
          client_id: data.client_id,
          agent_id: data.agent_id,
          session_name: data.instance_name,
          status: data.status || 'disconnected',
          qr_code: data.qr_code,
          qr_expires_at: data.qr_expires_at,
          phone_number: data.phone_number,
          webhook_url: data.webhook_url,
          reconnect_attempts: data.reconnect_attempts,
          last_activity: data.last_activity,
          created_at: data.created_at,
          connected_at: data.connected_at,
          disconnected_at: data.disconnected_at,
        });
      } else {
        setSession(null);
      }
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

      const supabaseUrl = 'https://dffhhforfwhgzdlrfzpc.supabase.co';
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
        .from('evolution_instances')
        .insert({
          client_id: clientId,
          agent_id: agentId,
          tenant_id: tenantId,
          instance_name: sessionData.session_name,
          status: mapWahaStatusToDb(sessionData.status),
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

  const atualizarQR = async (): Promise<{ success: boolean; error?: string }> => {
    if (!session) return { success: false, error: 'No session available' };

    try {
      console.log('Atualizando QR code para sessão:', session.session_name);
      
      const result = await retryWithBackoff(
        async () => {
          const { qr, expiresAt } = await wahaClient.getQRCode(session.session_name);
          if (!qr) {
            throw new Error('QR code não disponível');
          }
          return { qr, expiresAt };
        },
        {
          maxAttempts: 3,
          initialDelay: 1000,
          maxDelay: 5000,
          backoffMultiplier: 2,
          onRetry: (attempt, error) => {
            setQrRetryAttempt(attempt);
            console.log(`Tentativa ${attempt} de buscar QR code:`, error);
            
            toast({
              title: `Tentando novamente (${attempt}/3)...`,
              description: 'Aguarde enquanto tentamos buscar o QR code.',
            });
          }
        }
      );

      const qrExpiresAt = result.expiresAt || new Date(Date.now() + 60000).toISOString();

      await supabase
        .from('evolution_instances')
        .update({ 
          qr_code: result.qr,
          qr_expires_at: qrExpiresAt
        })
        .eq('id', session.id);
      
      setSession({ ...session, qr_code: result.qr, qr_expires_at: qrExpiresAt });
      setQrRetryAttempt(0);
      
      toast({
        title: 'QR Code atualizado!',
        description: 'O código QR foi gerado com sucesso.',
      });
      
      console.log('QR code atualizado com sucesso');
      return { success: true };
      
    } catch (error: any) {
      setQrRetryAttempt(0);
      console.error('Erro ao buscar QR após todas as tentativas:', error);
      
      toast({
        title: 'Erro ao buscar QR Code',
        description: 'Não foi possível gerar o código QR após várias tentativas. Tente novamente em alguns instantes.',
        variant: 'destructive',
      });
      
      await logSessionAction(session.id, 'qr_fetch_failed', 'error', {
        retries: 3
      }, error.message);
      
      return { success: false, error: error.message };
    }
  };

  const desconectar = async () => {
    if (!session) return;

    try {
      await wahaClient.stopSession(session.session_name);

      await supabase
        .from('evolution_instances')
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
        const mappedStatus = mapWahaStatusToDb(status);
        
        if (mappedStatus === 'connected') {
          setRetryCount(0);
          await supabase
            .from('evolution_instances')
            .update({ 
              status: mappedStatus,
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
          
          setSession({ ...session, status: mappedStatus, reconnect_attempts: 0 });
        } else {
          setRetryCount(prev => prev + 1);
          await supabase
            .from('evolution_instances')
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
      const mappedStatus = mapWahaStatusToDb(status);
      
      if (mappedStatus !== session.status) {
        await supabase
          .from('evolution_instances')
          .update({ status: mappedStatus })
          .eq('id', session.id);
        
        if (mappedStatus === 'connected' && session.status !== 'connected') {
          await logSessionAction(session.id, 'connected', 'success', {
            previous_status: session.status
          });
          
          toast({
            title: 'WhatsApp Conectado! ✓',
            description: 'Sessão conectada com sucesso. Pronto para enviar mensagens.',
          });
          
          setRetryCount(0);
        } else if (mappedStatus === 'disconnected' && session.status === 'connected') {
          await logSessionAction(session.id, 'disconnected', 'error', {
            unexpected: true
          }, 'Conexão perdida inesperadamente');
          
          toast({
            title: '⚠️ Conexão Perdida',
            description: `A sessão ${session.session_name} foi desconectada inesperadamente. Tentando reconectar...`,
            variant: 'destructive',
          });
          
          if (retryCount < MAX_RECONNECT_ATTEMPTS) {
            attemptReconnect();
          }
        }
        
        setSession({ ...session, status: mappedStatus });
      }
    } catch (error: any) {
      console.error('Erro ao atualizar status:', error);
      
      if (session.status === 'connected' && retryCount < MAX_RECONNECT_ATTEMPTS) {
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
        
        // Auto-fetch QR if status is qr_code but QR is missing or expired
        if (session.status === 'qr_code') {
          const isQRExpired = session.qr_expires_at ? 
            new Date(session.qr_expires_at).getTime() < Date.now() : true;
          
          if (!session.qr_code || isQRExpired) {
            atualizarQR();
          }
        }
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [clientId, session?.status, session?.qr_code, session?.qr_expires_at]);

  return {
    session,
    loading,
    connecting,
    qrRetryAttempt,
    criarSession,
    atualizarQR,
    desconectar,
    atualizarStatus,
    refresh: carregarSession
  };
}
