import { useState, useEffect } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { Activity, Zap, AlertCircle, CheckCircle, Clock, TrendingUp } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

type WahaSession = {
  id: string
  session_name: string
  status: string
  client_id: string
  phone_number?: string
  qr_code?: string
  tenant_id: number
  agent_id?: string
  created_at: string
  updated_at: string
  connected_at?: string
  disconnected_at?: string
  last_activity?: string
  last_message_at?: string
  total_messages_sent: number
  total_messages_received: number
  qr_expires_at?: string
  reconnect_attempts: number
  webhook_url?: string
  whatsapp_clients: {
    nome_empresa: string
  }
}

type EdgeMetric = {
  function_name: string
  total_calls: number
  success_calls: number
  error_calls: number
  avg_execution_time: number
  p95_execution_time: number
  success_rate: number
}

type CircuitBreakerState = {
  service_name: string
  state: 'CLOSED' | 'OPEN' | 'HALF_OPEN'
  failure_count: number
  last_failure_time?: string
}

export default function WhatsAppDashboard() {
  const { toast } = useToast()
  const [sessions, setSessions] = useState<WahaSession[]>([])
  const [metrics, setMetrics] = useState<EdgeMetric[]>([])
  const [circuitBreakers, setCircuitBreakers] = useState<CircuitBreakerState[]>([])
  const [loading, setLoading] = useState(true)

  // Carregar dados iniciais
  useEffect(() => {
    loadData()
  }, [])

  // Realtime para sessões WhatsApp
  useEffect(() => {
    const channel = supabase
      .channel('waha_sessions_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'waha_sessions'
        },
        (payload) => {
          console.log('Session change:', payload)
          loadSessions()
          
          const sessionName = (payload.new as any)?.session_name || 'desconhecida'
          toast({
            title: 'Atualização em tempo real',
            description: `Sessão ${sessionName} atualizada`,
          })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const loadData = async () => {
    setLoading(true)
    await Promise.all([
      loadSessions(),
      loadMetrics(),
      loadCircuitBreakers()
    ])
    setLoading(false)
  }

  const loadSessions = async () => {
    const { data, error } = await supabase
      .from('waha_sessions')
      .select(`
        *,
        whatsapp_clients (
          nome_empresa
        )
      `)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error loading sessions:', error)
      return
    }

    setSessions((data || []) as WahaSession[])
  }

  const loadMetrics = async () => {
    const functions = [
      'waha-session-create',
      'waha-session-qr',
      'waha-session-status',
      'waha-send-message',
      'ai-chat'
    ]

    const metricsData: EdgeMetric[] = []

    for (const func of functions) {
      const { data, error } = await supabase.rpc('get_edge_function_stats', {
        p_function_name: func,
        p_hours: 24
      })

      if (!error && data && data.length > 0) {
        metricsData.push({
          function_name: func,
          ...data[0]
        })
      }
    }

    setMetrics(metricsData)
  }

  const loadCircuitBreakers = async () => {
    const { data, error } = await supabase
      .from('circuit_breaker_state')
      .select('*')

    if (!error && data) {
      setCircuitBreakers(data as CircuitBreakerState[])
    }
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      'WORKING': 'default',
      'SCAN_QR_CODE': 'secondary',
      'STARTING': 'secondary',
      'STOPPED': 'outline',
      'FAILED': 'destructive',
      'disconnected': 'outline'
    }

    return (
      <Badge variant={variants[status] || 'outline'}>
        {status}
      </Badge>
    )
  }

  const getCircuitBreakerBadge = (state: string) => {
    const config: Record<string, { variant: any; icon: any }> = {
      'CLOSED': { variant: 'default', icon: CheckCircle },
      'OPEN': { variant: 'destructive', icon: AlertCircle },
      'HALF_OPEN': { variant: 'secondary', icon: Activity }
    }

    const { variant, icon: Icon } = config[state] || config.CLOSED

    return (
      <Badge variant={variant} className="gap-1">
        <Icon className="h-3 w-3" />
        {state}
      </Badge>
    )
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  const totalSessions = sessions.length
  const activeSessions = sessions.filter(s => s.status === 'WORKING').length
  const pendingSessions = sessions.filter(s => s.status === 'SCAN_QR_CODE').length

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard WhatsApp - Tempo Real</h1>
        <p className="text-muted-foreground">Monitoramento de sessões e métricas de performance</p>
      </div>

      {/* Resumo de Sessões */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Sessões</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalSessions}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sessões Ativas</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{activeSessions}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Aguardando QR</CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{pendingSessions}</div>
          </CardContent>
        </Card>
      </div>

      {/* Sessões WhatsApp */}
      <Card>
        <CardHeader>
          <CardTitle>Sessões WhatsApp Ativas</CardTitle>
          <CardDescription>Atualização automática em tempo real</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {sessions.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma sessão encontrada</p>
            ) : (
              sessions.map((session) => (
                <div key={session.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{session.whatsapp_clients?.nome_empresa}</span>
                      {getStatusBadge(session.status)}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">{session.session_name}</p>
                  </div>
                  <div className="text-right text-sm text-muted-foreground">
                    {session.last_activity ? new Date(session.last_activity).toLocaleString() : 'N/A'}
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Circuit Breakers */}
      {circuitBreakers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Circuit Breakers</CardTitle>
            <CardDescription>Estado dos circuit breakers por serviço</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {circuitBreakers.map((cb) => (
                <div key={cb.service_name} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <span className="font-medium">{cb.service_name}</span>
                    {getCircuitBreakerBadge(cb.state)}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Falhas: {cb.failure_count}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Métricas de Edge Functions */}
      <Card>
        <CardHeader>
          <CardTitle>Performance de Edge Functions (24h)</CardTitle>
          <CardDescription>Métricas agregadas das últimas 24 horas</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {metrics.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma métrica disponível ainda</p>
            ) : (
              metrics.map((metric) => (
                <div key={metric.function_name} className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Zap className="h-4 w-4" />
                      <span className="font-medium">{metric.function_name}</span>
                    </div>
                    <Badge variant={metric.success_rate >= 95 ? 'default' : 'destructive'}>
                      {metric.success_rate}% sucesso
                    </Badge>
                  </div>

                  <div className="grid grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Total</p>
                      <p className="font-medium">{metric.total_calls}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Sucesso</p>
                      <p className="font-medium text-green-600">{metric.success_calls}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Erros</p>
                      <p className="font-medium text-red-600">{metric.error_calls}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Tempo Médio</p>
                      <p className="font-medium">{metric.avg_execution_time}ms</p>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between text-sm mb-2">
                      <span>Taxa de Sucesso</span>
                      <span>{metric.success_rate}%</span>
                    </div>
                    <Progress value={metric.success_rate} />
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
