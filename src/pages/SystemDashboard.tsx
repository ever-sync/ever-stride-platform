import { useEffect, useState } from 'react'
import { AppShell } from '@/components/AppShell'
import { supabase } from '@/integrations/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  Activity, 
  AlertTriangle, 
  CheckCircle, 
  DollarSign,
  Users,
  Zap,
  MessageSquare
} from 'lucide-react'

interface SystemStats {
  total_agents: number
  active_agents: number
  total_messages_today: number
  total_tokens_today: number
  total_custo_today: number
  avg_response_time: number
  error_rate: number
  health_score: number
}

export default function SystemDashboardPage() {
  const [stats, setStats] = useState<SystemStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadStats()
    const interval = setInterval(loadStats, 60000) // Atualizar a cada minuto
    return () => clearInterval(interval)
  }, [])

  const loadStats = async () => {
    try {
      // Buscar dados agregados
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      const { data: agents } = await supabase
        .from('agents_v2')
        .select('*')
        .neq('status', 'deleted')

      const { data: eventsToday } = await supabase
        .from('agent_events')
        .select('*')
        .gte('created_at', today.toISOString())

      const totalAgents = agents?.length || 0
      const activeAgents = agents?.filter(a => a.status === 'active').length || 0
      
      const messagesEvents = eventsToday?.filter(e => e.event_type === 'message_sent') || []
      const totalMessages = messagesEvents.length
      
      const totalTokens = eventsToday?.reduce((sum, e) => sum + (e.tokens_used || 0), 0) || 0
      const totalCusto = eventsToday?.reduce((sum, e) => sum + (e.custo_brl || 0), 0) || 0

      const latencies = eventsToday?.filter(e => e.latencia_ms).map(e => e.latencia_ms) || []
      const avgResponseTime = latencies.length > 0
        ? latencies.reduce((sum: number, l: number) => sum + l, 0) / latencies.length
        : 0

      const errors = eventsToday?.filter(e => ['error', 'critical'].includes(e.severity)) || []
      const errorRate = totalMessages > 0 ? (errors.length / totalMessages) * 100 : 0

      // Health score geral (média de todos os agentes)
      const healthScores = await Promise.all(
        agents?.map(async (agent) => {
          const { data } = await supabase
            .rpc('calculate_agent_health_score', { p_agent_id: agent.id })
          return data || 0
        }) || []
      )
      const avgHealthScore = healthScores.length > 0
        ? healthScores.reduce((sum, score) => sum + score, 0) / healthScores.length
        : 100

      setStats({
        total_agents: totalAgents,
        active_agents: activeAgents,
        total_messages_today: totalMessages,
        total_tokens_today: totalTokens,
        total_custo_today: totalCusto,
        avg_response_time: Math.round(avgResponseTime),
        error_rate: errorRate,
        health_score: Math.round(avgHealthScore)
      })
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <AppShell>
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Dashboard do Sistema</h1>
          <p className="text-muted-foreground">Visão geral de todos os agentes e métricas</p>
        </div>

        {/* Health Score Geral */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-2">Health Score Geral</p>
                <div className="flex items-baseline gap-3">
                  <p className="text-4xl font-bold">{stats?.health_score || 0}</p>
                  <p className="text-lg text-muted-foreground">/100</p>
                </div>
              </div>
              <div className={`h-24 w-24 rounded-full flex items-center justify-center ${
                (stats?.health_score || 0) >= 80 ? 'bg-green-100 dark:bg-green-900' :
                (stats?.health_score || 0) >= 50 ? 'bg-yellow-100 dark:bg-yellow-900' :
                'bg-red-100 dark:bg-red-900'
              }`}>
                {(stats?.health_score || 0) >= 80 ? (
                  <CheckCircle className="h-12 w-12 text-green-500" />
                ) : (
                  <AlertTriangle className="h-12 w-12 text-yellow-500" />
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Agentes Ativos</p>
                  <p className="text-2xl font-bold">
                    {stats?.active_agents} / {stats?.total_agents}
                  </p>
                </div>
                <Users className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Mensagens (Hoje)</p>
                  <p className="text-2xl font-bold">{stats?.total_messages_today || 0}</p>
                </div>
                <MessageSquare className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Tokens (Hoje)</p>
                  <p className="text-2xl font-bold">
                    {((stats?.total_tokens_today || 0) / 1000).toFixed(1)}k
                  </p>
                </div>
                <Zap className="h-8 w-8 text-yellow-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Custo (Hoje)</p>
                  <p className="text-2xl font-bold">
                    R$ {(stats?.total_custo_today || 0).toFixed(2)}
                  </p>
                </div>
                <DollarSign className="h-8 w-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Métricas de Performance */}
        <div className="grid grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Tempo Médio de Resposta</CardTitle>
              <CardDescription>Latência média das requisições</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center">
                <p className="text-4xl font-bold">{stats?.avg_response_time || 0}ms</p>
                <Badge variant={
                  (stats?.avg_response_time || 0) < 2000 ? 'success' :
                  (stats?.avg_response_time || 0) < 5000 ? 'warning' :
                  'destructive'
                } className="mt-2">
                  {(stats?.avg_response_time || 0) < 2000 ? 'Excelente' :
                   (stats?.avg_response_time || 0) < 5000 ? 'Aceitável' :
                   'Lento'}
                </Badge>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Taxa de Erro</CardTitle>
              <CardDescription>Percentual de falhas hoje</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center">
                <p className="text-4xl font-bold">{(stats?.error_rate || 0).toFixed(2)}%</p>
                <Badge variant={
                  (stats?.error_rate || 0) < 1 ? 'success' :
                  (stats?.error_rate || 0) < 5 ? 'warning' :
                  'destructive'
                } className="mt-2">
                  {(stats?.error_rate || 0) < 1 ? 'Ótimo' :
                   (stats?.error_rate || 0) < 5 ? 'Atenção' :
                   'Crítico'}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Gráfico de Atividade (últimas 24h) */}
        <Card>
          <CardHeader>
            <CardTitle>Atividade nas Últimas 24 Horas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 bg-muted rounded flex items-center justify-center">
              <p className="text-muted-foreground">
                Gráfico de atividade por hora será implementado aqui
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Alertas e Problemas Recentes */}
        <Card>
          <CardHeader>
            <CardTitle>Alertas e Problemas Recentes</CardTitle>
            <CardDescription>Eventos críticos das últimas 24 horas</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-muted-foreground">
              Lista de alertas será implementada aqui
            </div>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  )
}