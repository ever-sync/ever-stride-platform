import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { MessageSquare, TrendingUp, Clock, Zap } from "lucide-react";
import { format, subDays, startOfDay, endOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function ChatAnalytics() {
  const { userSession } = useAuth();
  const [loading, setLoading] = useState(true);
  const [volumeByHour, setVolumeByHour] = useState<any[]>([]);
  const [topSessions, setTopSessions] = useState<any[]>([]);
  const [stats, setStats] = useState({
    totalChats: 0,
    totalMessages: 0,
    avgMessagesPerChat: 0,
    last7Days: 0,
  });

  useEffect(() => {
    if (userSession?.tenant?.id) {
      loadAnalytics();
    }
  }, [userSession]);

  const loadAnalytics = async () => {
    if (!userSession?.tenant?.id) return;

    try {
      // Load chats
      const { data: chats, error: chatsError } = await supabase
        .from("chats")
        .select(`
          id,
          created_at,
          session_id,
          waha_sessions(session_name)
        `)
        .eq("tenant_id", userSession.tenant.id);

      if (chatsError) throw chatsError;

      // Load messages
      const { data: messages, error: messagesError } = await supabase
        .from("chat_messages")
        .select("id, created_at, chat_id")
        .in("chat_id", chats?.map(c => c.id) || []);

      if (messagesError) throw messagesError;

      // Calculate stats
      const totalChats = chats?.length || 0;
      const totalMessages = messages?.length || 0;
      const avgMessagesPerChat = totalChats > 0 ? (totalMessages / totalChats).toFixed(1) : 0;

      const last7DaysDate = subDays(new Date(), 7);
      const last7DaysChats = chats?.filter(
        c => c.created_at && new Date(c.created_at) >= last7DaysDate
      ).length || 0;

      setStats({
        totalChats,
        totalMessages,
        avgMessagesPerChat: parseFloat(avgMessagesPerChat.toString()),
        last7Days: last7DaysChats,
      });

      // Volume by hour (last 24 hours)
      const hourlyData = Array.from({ length: 24 }, (_, i) => ({
        hour: `${i}h`,
        count: 0,
      }));

      const last24Hours = subDays(new Date(), 1);
      messages?.forEach((msg) => {
        if (msg.created_at) {
          const msgDate = new Date(msg.created_at);
          if (msgDate >= last24Hours) {
            const hour = msgDate.getHours();
            hourlyData[hour].count++;
          }
        }
      });

      setVolumeByHour(hourlyData);

      // Top sessions
      const sessionCounts: Record<string, { name: string; count: number }> = {};
      chats?.forEach((chat: any) => {
        if (chat.session_id && chat.waha_sessions?.session_name) {
          const sessionName = chat.waha_sessions.session_name;
          if (!sessionCounts[sessionName]) {
            sessionCounts[sessionName] = { name: sessionName, count: 0 };
          }
          sessionCounts[sessionName].count++;
        }
      });

      const topSessionsData = Object.values(sessionCounts)
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      setTopSessions(topSessionsData);

    } catch (error) {
      console.error("Error loading analytics:", error);
    } finally {
      setLoading(false);
    }
  };

  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-muted-foreground">Carregando analytics...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Analytics de Conversas</h1>
        <p className="text-muted-foreground mt-1">Análise detalhada das suas conversas</p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Chats</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalChats}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Mensagens</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalMessages}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Média por Chat</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.avgMessagesPerChat}</div>
            <p className="text-xs text-muted-foreground">mensagens</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Últimos 7 dias</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.last7Days}</div>
            <p className="text-xs text-muted-foreground">novos chats</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Volume by Hour */}
        <Card>
          <CardHeader>
            <CardTitle>Volume de Mensagens (24h)</CardTitle>
            <CardDescription>Distribuição de mensagens por hora</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={volumeByHour}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="hour" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="count" stroke="#3B82F6" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Top Sessions */}
        <Card>
          <CardHeader>
            <CardTitle>Sessões Mais Ativas</CardTitle>
            <CardDescription>Top 5 sessões por número de conversas</CardDescription>
          </CardHeader>
          <CardContent>
            {topSessions.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                Nenhuma sessão com conversas ainda
              </p>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={topSessions}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={(entry) => `${entry.name} (${entry.count})`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="count"
                  >
                    {topSessions.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Session Details Table */}
      <Card>
        <CardHeader>
          <CardTitle>Detalhes das Sessões</CardTitle>
        </CardHeader>
        <CardContent>
          {topSessions.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Nenhuma sessão disponível
            </p>
          ) : (
            <div className="space-y-2">
              {topSessions.map((session, index) => (
                <div key={session.name} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: COLORS[index % COLORS.length] }}
                    />
                    <span className="font-medium">{session.name}</span>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold">{session.count}</div>
                    <div className="text-xs text-muted-foreground">conversas</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
