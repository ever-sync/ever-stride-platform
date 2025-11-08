import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle, Clock, RefreshCw, MessageSquare, Power } from 'lucide-react';
import { useEffect } from 'react';

interface SessionActivityLogProps {
  sessionId?: string;
  limit?: number;
}

const actionIcons = {
  created: Power,
  connected: CheckCircle2,
  disconnected: Power,
  reconnect_attempt: RefreshCw,
  message_sent: MessageSquare,
  message_received: MessageSquare,
  error: XCircle,
};

const actionLabels = {
  created: 'Sessão Criada',
  connected: 'Conectado',
  disconnected: 'Desconectado',
  reconnect_attempt: 'Tentativa de Reconexão',
  message_sent: 'Mensagem Enviada',
  message_received: 'Mensagem Recebida',
  error: 'Erro',
};

const statusVariants: Record<string, 'default' | 'destructive' | 'secondary'> = {
  success: 'default',
  error: 'destructive',
  pending: 'secondary',
};

export function SessionActivityLog({ sessionId, limit = 50 }: SessionActivityLogProps) {
  const { data: logs, refetch } = useQuery({
    queryKey: ['session-logs', sessionId, limit],
    queryFn: async () => {
      let query = supabase
        .from('waha_session_logs')
        .select('*, waha_sessions(session_name)')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (sessionId) {
        query = query.eq('session_id', sessionId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    refetchInterval: 5000,
  });

  useEffect(() => {
    const channel = supabase
      .channel('session-logs-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'waha_session_logs',
          filter: sessionId ? `session_id=eq.${sessionId}` : undefined,
        },
        () => {
          refetch();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId, refetch]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Histórico de Ações</CardTitle>
        <CardDescription>
          Últimas {limit} ações realizadas {sessionId ? 'nesta sessão' : 'em todas as sessões'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px] pr-4">
          {!logs || logs.length === 0 ? (
            <div className="flex items-center justify-center h-40 text-muted-foreground">
              <Clock className="h-5 w-5 mr-2" />
              Nenhuma atividade registrada
            </div>
          ) : (
            <div className="space-y-4">
              {logs.map((log) => {
                const Icon = actionIcons[log.action_type as keyof typeof actionIcons] || Clock;
                const label = actionLabels[log.action_type as keyof typeof actionLabels] || log.action_type;

                return (
                  <div key={log.id} className="flex gap-3 pb-4 border-b last:border-0">
                    <div className="flex-shrink-0 mt-1">
                      <div className={`p-2 rounded-full ${
                        log.status === 'success' ? 'bg-green-100 text-green-600' :
                        log.status === 'error' ? 'bg-red-100 text-red-600' :
                        'bg-gray-100 text-gray-600'
                      }`}>
                        <Icon className="h-4 w-4" />
                      </div>
                    </div>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium">{label}</p>
                        <Badge variant={statusVariants[log.status] || 'default'} className="text-xs">
                          {log.status}
                        </Badge>
                      </div>
                      {!sessionId && (log as any).waha_sessions?.session_name && (
                        <p className="text-xs text-muted-foreground">
                          Sessão: {(log as any).waha_sessions.session_name}
                        </p>
                      )}
                      {log.error_message && (
                        <p className="text-xs text-destructive">{log.error_message}</p>
                      )}
                      {log.details && Object.keys(log.details).length > 0 && (
                        <p className="text-xs text-muted-foreground">
                          {JSON.stringify(log.details)}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        {new Date(log.created_at).toLocaleString('pt-BR')}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
