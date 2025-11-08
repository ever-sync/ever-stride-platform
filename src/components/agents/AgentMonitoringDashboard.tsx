import { useEffect, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { Activity, AlertTriangle, CheckCircle, XCircle, Zap } from 'lucide-react'

interface AgentMetrics {
  agent: any
  health_score: number
  total_messages_24h: number
  success_rate_24h: number
  total_tokens_24h: number
  total_custo_24h: number
  errors_1h: number
  avg_latency_24h: number
  status: 'healthy' | 'degraded' | 'critical'
}

export function AgentMonitoringDashboard({ agentId }: { agentId: string }) {
  const [metrics, setMetrics] = useState<AgentMetrics | null>(null)
  const [recentEvents, setRecentEvents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
    
    // Atualizar a cada 30s
    const interval = setInterval(loadData, 30000)
    return () => clearInterval(interval)
  }, [agentId])

  const loadData = async () => {
    try {
      // 1. Buscar dados do agente
      const { data: agent } = await supabase
        .from('agents_v2')
        .select('*')
        .eq('id', agentId)
        .single()

      if (!agent) {
        throw new Error('Agente não encontrado')
      }

      // 2. Calcular health score
      const { data: healthScore } = await supabase
        .rpc('calculate_agent_health_score', { p_agent_id: agentId })

      // 3. Métricas das últimas 24h
      const { data: events24h } = await supabase
        .from('agent_events')
        .select('*')
        .eq('agent_id', agentId)
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())

      const totalMessages = events24h?.filter(e => e.event_type === 'message_sent').length || 0
      const successMessages = events24h?.filter(
        e => e.event_type === 'message_sent' && !['error', 'critical'].includes(e.severity)
      ).length || 0
      const totalTokens = events24h?.reduce((sum, e) => sum + (e.tokens_used || 0), 0) || 0
      const totalCusto = events24h?.reduce((sum, e) => sum + (e.custo_brl || 0), 0) || 0
      const avgLatency = events24h?.filter(e => e.latencia_ms)
        .reduce((sum, e, i, arr) => sum + e.latencia_ms / arr.length, 0) || 0

      // 4. Erros na última hora
      const { data: errors1h } = await supabase
        .from('agent_events')
        .select('*')
        .eq('agent_id', agentId)
        .in('severity', ['error', 'critical'])
        .gte('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString())

      // 5. Eventos recentes
      const { data: recent } = await supabase
        .from('agent_events')
        .select('*')
        .eq('agent_id', agentId)
        .order('created_at', { ascending: false })
        .limit(20)

      setMetrics({
        agent,
        health_score: healthScore || 0,
        total_messages_24h: totalMessages,
        success_rate_24h: totalMessages > 0 ? (successMessages / totalMessages) * 100 : 100,
        total_tokens_24h: totalTokens,
        total_custo_24h: totalCusto,
        errors_1h: errors1h?.length || 0,
        avg_latency_24h: Math.round(avgLatency),
        status: 
          (healthScore || 0) >= 80 ? 'healthy' : 
          (healthScore || 0) >= 50 ? 'degraded' : 
          'critical'
      })

      setRecentEvents(recent || [])
    } catch (error) {
      console.error('Erro ao carregar métricas:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!metrics) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>Erro ao carregar dados do agente</AlertDescription>
      </Alert>
    )
  }

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'healthy':
        return { 
          icon: CheckCircle, 
          color: 'text-green-500', 
          bg: 'bg-green-50 dark:bg-green-950', 
          label: 'Saudável' 
        }
      case 'degraded':
        return { 
          icon: AlertTriangle, 
          color: 'text-yellow-500', 
          bg: 'bg-yellow-50 dark:bg-yellow-950', 
          label: 'Degradado' 
        }
      case 'critical':
        return { 
          icon: XCircle, 
          color: 'text-red-500', 
          bg: 'bg-red-50 dark:bg-red-950', 
          label: 'Crítico' 
        }
      default:
        return { 
          icon: Activity, 
          color: 'text-muted-foreground', 
          bg: 'bg-muted', 
          label: 'Desconhecido' 
        }
    }
  }

  const statusConfig = getStatusConfig(metrics.status)
  const StatusIcon = statusConfig.icon

  return (
    <div className="space-y-6">
      {/* Header com Status Geral */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">{metrics.agent.nome}</h2>
          <p className="text-sm text-muted-foreground">{metrics.agent.descricao || 'Agente de IA'}</p>
        </div>
        <div className={`flex items-center gap-3 px-4 py-2 rounded-lg ${statusConfig.bg}`}>
          <StatusIcon className={`h-6 w-6 ${statusConfig.color}`} />
          <div>
            <p className="text-sm font-medium">{statusConfig.label}</p>
            <p className="text-xs text-muted-foreground">Score: {metrics.health_score}/100</p>
          </div>
        </div>
      </div>

      {/* Alertas Críticos */}
      {metrics.errors_1h > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>{metrics.errors_1h} erros</strong> detectados na última hora. 
            Verifique os logs abaixo.
          </AlertDescription>
        </Alert>
      )}

      {/* Cards de Métricas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Mensagens 24h */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Mensagens (24h)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.total_messages_24h}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Taxa de sucesso: {metrics.success_rate_24h.toFixed(1)}%
            </p>
          </CardContent>
        </Card>

        {/* Tokens Consumidos */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Tokens (24h)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(metrics.total_tokens_24h / 1000).toFixed(1)}k
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Custo: R$ {metrics.total_custo_24h.toFixed(2)}
            </p>
          </CardContent>
        </Card>

        {/* Latência Média */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Latência Média
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.avg_latency_24h}ms</div>
            <p className="text-xs text-muted-foreground mt-1">
              <Zap className="inline h-3 w-3" /> Últimas 24h
            </p>
          </CardContent>
        </Card>

        {/* N8N Status */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Workflow N8N
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Badge variant={metrics.agent.n8n_status === 'active' ? 'default' : 'secondary'}>
              {metrics.agent.n8n_status || 'Não configurado'}
            </Badge>
            {metrics.agent.n8n_workflow_id && (
              <p className="text-xs text-muted-foreground mt-2">
                ID: {metrics.agent.n8n_workflow_id.substring(0, 8)}...
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Gráfico de Eventos (últimas 24h) */}
      <Card>
        <CardHeader>
          <CardTitle>Atividade nas Últimas 24 Horas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center bg-muted/50 rounded">
            <p className="text-muted-foreground">Gráfico em desenvolvimento</p>
          </div>
        </CardContent>
      </Card>

      {/* Log de Eventos Recentes */}
      <Card>
        <CardHeader>
          <CardTitle>Eventos Recentes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {recentEvents.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">Nenhum evento registrado</p>
            ) : (
              recentEvents.map((event) => {
                const getSeverityColor = (sev: string) => {
                  switch (sev) {
                    case 'critical': return 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200'
                    case 'error': return 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300'
                    case 'warning': return 'bg-yellow-50 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300'
                    case 'info': return 'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                    default: return 'bg-muted text-muted-foreground'
                  }
                }

                return (
                  <div 
                    key={event.id}
                    className="flex items-start gap-3 p-3 rounded border hover:bg-accent/50 transition-colors"
                  >
                    <Badge className={getSeverityColor(event.severity)}>
                      {event.severity}
                    </Badge>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{event.event_type}</p>
                      {event.error_message && (
                        <p className="text-xs text-destructive mt-1">{event.error_message}</p>
                      )}
                      <div className="flex gap-4 mt-1 text-xs text-muted-foreground">
                        <span>{new Date(event.created_at).toLocaleString('pt-BR')}</span>
                        {event.tokens_used && <span>{event.tokens_used} tokens</span>}
                        {event.custo_brl && <span>R$ {event.custo_brl.toFixed(4)}</span>}
                        {event.latencia_ms && <span>{event.latencia_ms}ms</span>}
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
