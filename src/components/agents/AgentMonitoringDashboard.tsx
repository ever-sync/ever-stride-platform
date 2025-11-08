import { useEffect, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { 
  Activity, 
  AlertTriangle, 
  CheckCircle, 
  Clock,
  DollarSign,
  MessageSquare,
  TrendingUp,
  Zap,
  XCircle
} from 'lucide-react'

interface AgentMonitoringDashboardProps {
  agentId: string
}

interface AgentMetrics {
  health_score: number
  total_messages_24h: number
  total_tokens_24h: number
  total_custo_24h: number
  avg_response_time: number
  error_count_24h: number
  success_rate: number
  status: 'healthy' | 'degraded' | 'critical'
}

interface RecentEvent {
  id: number
  event_type: string
  severity: string
  created_at: string
  error_message?: string
  tokens_used?: number
  custo_brl?: number
  latencia_ms?: number
}

export function AgentMonitoringDashboard({ agentId }: AgentMonitoringDashboardProps) {
  const [metrics, setMetrics] = useState<AgentMetrics | null>(null)
  const [recentEvents, setRecentEvents] = useState<RecentEvent[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
    const interval = setInterval(loadData, 30000)
    return () => clearInterval(interval)
  }, [agentId])

  const loadData = async () => {
    try {
      const now = new Date()
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000)

      const { data: events } = await supabase
        .from('agent_events')
        .select('*')
        .eq('agent_id', agentId)
        .gte('created_at', yesterday.toISOString())
        .order('created_at', { ascending: false })

      if (!events) return

      const messages = events.filter(e => e.event_type === 'message_sent')
      const errors = events.filter(e => ['error', 'critical'].includes(e.severity))
      
      const totalTokens = events.reduce((sum, e) => sum + (e.tokens_used || 0), 0)
      const totalCusto = events.reduce((sum, e) => sum + (Number(e.custo_brl) || 0), 0)
      
      const latencies = events.filter(e => e.latencia_ms).map(e => e.latencia_ms!)
      const avgResponseTime = latencies.length > 0
        ? latencies.reduce((sum, l) => sum + l, 0) / latencies.length
        : 0

      const successRate = messages.length > 0
        ? ((messages.length - errors.length) / messages.length) * 100
        : 100

      const { data: healthScore } = await supabase
        .rpc('calculate_agent_health_score', { p_agent_id: agentId })

      const score = healthScore || 0
      const status = score >= 80 ? 'healthy' : score >= 50 ? 'degraded' : 'critical'

      setMetrics({
        health_score: score,
        total_messages_24h: messages.length,
        total_tokens_24h: totalTokens,
        total_custo_24h: totalCusto,
        avg_response_time: Math.round(avgResponseTime),
        error_count_24h: errors.length,
        success_rate: successRate,
        status
      })

      setRecentEvents(events.slice(0, 10))
    } catch (error) {
      console.error('Erro ao carregar dados de monitoramento:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!metrics) {
    return (
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Sem dados</AlertTitle>
        <AlertDescription>
          Não foi possível carregar os dados de monitoramento
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-2">Health Score</p>
              <div className="flex items-baseline gap-3">
                <p className="text-5xl font-bold">{metrics.health_score}</p>
                <p className="text-xl text-muted-foreground">/100</p>
              </div>
              <Badge
                variant={
                  metrics.status === 'healthy' ? 'success' :
                  metrics.status === 'degraded' ? 'warning' :
                  'destructive'
                }
                className="mt-2"
              >
                {metrics.status === 'healthy' ? 'Saudável' :
                 metrics.status === 'degraded' ? 'Degradado' :
                 'Crítico'}
              </Badge>
            </div>
            <div className={`h-32 w-32 rounded-full flex items-center justify-center ${
              metrics.status === 'healthy' ? 'bg-green-100' :
              metrics.status === 'degraded' ? 'bg-yellow-100' :
              'bg-red-100'
            }`}>
              {metrics.status === 'healthy' ? (
                <CheckCircle className="h-16 w-16 text-green-500" />
              ) : metrics.status === 'degraded' ? (
                <AlertTriangle className="h-16 w-16 text-yellow-500" />
              ) : (
                <XCircle className="h-16 w-16 text-red-500" />
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Mensagens (24h)</p>
                <p className="text-3xl font-bold">{metrics.total_messages_24h}</p>
              </div>
              <MessageSquare className="h-10 w-10 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Tokens (24h)</p>
                <p className="text-3xl font-bold">
                  {(metrics.total_tokens_24h / 1000).toFixed(1)}k
                </p>
              </div>
              <Zap className="h-10 w-10 text-yellow-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Custo (24h)</p>
                <p className="text-3xl font-bold">
                  R$ {metrics.total_custo_24h.toFixed(2)}
                </p>
              </div>
              <DollarSign className="h-10 w-10 text-green-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Tempo Médio</p>
                <p className="text-2xl font-bold">{metrics.avg_response_time}ms</p>
                <Badge
                  variant={
                    metrics.avg_response_time < 2000 ? 'success' :
                    metrics.avg_response_time < 5000 ? 'warning' :
                    'destructive'
                  }
                  className="mt-2"
                >
                  {metrics.avg_response_time < 2000 ? 'Excelente' :
                   metrics.avg_response_time < 5000 ? 'Bom' :
                   'Lento'}
                </Badge>
              </div>
              <Clock className="h-10 w-10 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Taxa de Sucesso</p>
                <p className="text-2xl font-bold">{metrics.success_rate.toFixed(1)}%</p>
                <Badge
                  variant={metrics.success_rate >= 95 ? 'success' : 'warning'}
                  className="mt-2"
                >
                  {metrics.success_rate >= 95 ? 'Ótimo' : 'Atenção'}
                </Badge>
              </div>
              <TrendingUp className="h-10 w-10 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Erros (24h)</p>
                <p className="text-2xl font-bold">{metrics.error_count_24h}</p>
                <Badge
                  variant={metrics.error_count_24h === 0 ? 'success' : 'destructive'}
                  className="mt-2"
                >
                  {metrics.error_count_24h === 0 ? 'Sem erros' : 'Atenção'}
                </Badge>
              </div>
              <Activity className="h-10 w-10 text-red-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Eventos Recentes</CardTitle>
          <CardDescription>Últimas 10 atividades do agente</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {recentEvents.length > 0 ? (
              recentEvents.map((event) => (
                <div
                  key={event.id}
                  className="flex items-start gap-3 p-3 rounded-lg border border-border hover:bg-accent/50 transition-colors"
                >
                  <div className={`mt-1 ${
                    event.severity === 'critical' ? 'text-red-500' :
                    event.severity === 'error' ? 'text-orange-500' :
                    event.severity === 'warning' ? 'text-yellow-500' :
                    'text-blue-500'
                  }`}>
                    {event.severity === 'critical' || event.severity === 'error' ? (
                      <XCircle className="h-5 w-5" />
                    ) : event.severity === 'warning' ? (
                      <AlertTriangle className="h-5 w-5" />
                    ) : (
                      <CheckCircle className="h-5 w-5" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-medium text-sm">
                        {event.event_type.replace(/_/g, ' ').toUpperCase()}
                      </p>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {new Date(event.created_at).toLocaleString('pt-BR')}
                      </span>
                    </div>
                    {event.error_message && (
                      <p className="text-sm text-muted-foreground mt-1 truncate">
                        {event.error_message}
                      </p>
                    )}
                    <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                      {event.tokens_used && (
                        <span>{event.tokens_used} tokens</span>
                      )}
                      {event.custo_brl && (
                        <span>R$ {Number(event.custo_brl).toFixed(4)}</span>
                      )}
                      {event.latencia_ms && (
                        <span>{event.latencia_ms}ms</span>
                      )}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-center text-muted-foreground py-8">
                Nenhum evento registrado
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
