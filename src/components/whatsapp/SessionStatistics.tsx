import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ArrowDown, ArrowUp, Clock, CheckCircle2, XCircle } from 'lucide-react';
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

interface SessionStatsProps {
  sessionId?: string;
}

export function SessionStatistics({ sessionId }: SessionStatsProps) {
  const { data: stats } = useQuery({
    queryKey: ['session-stats', sessionId],
    queryFn: async () => {
      let query = supabase
        .from('evolution_instances')
        .select('total_messages_sent, total_messages_received, failed_messages, success_rate, avg_response_time_ms');

      if (sessionId) {
        const { data, error } = await query.eq('id', sessionId).single();
        if (error) throw error;
        return data;
      } else {
        const { data, error } = await query;
        if (error) throw error;
        
        const totals = data?.reduce(
          (acc, session) => ({
            total_messages_sent: acc.total_messages_sent + (session.total_messages_sent || 0),
            total_messages_received: acc.total_messages_received + (session.total_messages_received || 0),
            failed_messages: acc.failed_messages + (session.failed_messages || 0),
            success_rate: data.length > 0 ? data.reduce((sum, s) => sum + (s.success_rate || 0), 0) / data.length : 0,
            avg_response_time_ms: data.length > 0 ? data.reduce((sum, s) => sum + (s.avg_response_time_ms || 0), 0) / data.length : 0,
          }),
          { total_messages_sent: 0, total_messages_received: 0, failed_messages: 0, success_rate: 0, avg_response_time_ms: 0 }
        );
        
        return totals;
      }
    },
    refetchInterval: 10000,
  });

  const { data: recentActivity } = useQuery({
    queryKey: ['session-activity', sessionId],
    queryFn: async () => {
      const last24Hours = new Date();
      last24Hours.setHours(last24Hours.getHours() - 24);

      let query = supabase
        .from('waha_session_logs')
        .select('action_type, created_at')
        .gte('created_at', last24Hours.toISOString())
        .order('created_at', { ascending: true });

      if (sessionId) {
        query = query.eq('session_id', sessionId);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Agrupar por hora
      const hourlyData = new Map<string, { sent: number; received: number }>();
      data?.forEach((log) => {
        const hour = new Date(log.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        if (!hourlyData.has(hour)) {
          hourlyData.set(hour, { sent: 0, received: 0 });
        }
        const current = hourlyData.get(hour)!;
        if (log.action_type === 'message_sent') current.sent++;
        if (log.action_type === 'message_received') current.received++;
      });

      return Array.from(hourlyData.entries()).map(([time, data]) => ({
        time,
        enviadas: data.sent,
        recebidas: data.received,
      }));
    },
    refetchInterval: 30000,
  });

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Mensagens Enviadas</CardTitle>
          <ArrowUp className="h-4 w-4 text-blue-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats?.total_messages_sent ?? 0}</div>
          <p className="text-xs text-muted-foreground">Total de mensagens enviadas</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Mensagens Recebidas</CardTitle>
          <ArrowDown className="h-4 w-4 text-green-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats?.total_messages_received ?? 0}</div>
          <p className="text-xs text-muted-foreground">Total de mensagens recebidas</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Taxa de Sucesso</CardTitle>
          {(stats?.success_rate ?? 0) >= 95 ? (
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          ) : (
            <XCircle className="h-4 w-4 text-red-600" />
          )}
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{((stats?.success_rate ?? 0) as number).toFixed(1)}%</div>
          <p className="text-xs text-muted-foreground">
            {stats?.failed_messages ?? 0} falhas
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Tempo Médio</CardTitle>
          <Clock className="h-4 w-4 text-purple-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats?.avg_response_time_ms ?? 0}ms</div>
          <p className="text-xs text-muted-foreground">Tempo médio de resposta</p>
        </CardContent>
      </Card>

      {recentActivity && recentActivity.length > 0 && (
        <Card className="col-span-full">
          <CardHeader>
            <CardTitle>Atividade nas Últimas 24h</CardTitle>
            <CardDescription>Mensagens enviadas e recebidas por hora</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={recentActivity}>
                <XAxis dataKey="time" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--background))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '6px',
                  }}
                />
                <Line type="monotone" dataKey="enviadas" stroke="#3b82f6" strokeWidth={2} name="Enviadas" />
                <Line type="monotone" dataKey="recebidas" stroke="#10b981" strokeWidth={2} name="Recebidas" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
