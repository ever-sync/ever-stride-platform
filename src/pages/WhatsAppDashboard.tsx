import { useState, useEffect } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Activity, Zap, AlertCircle, CheckCircle, Clock, RefreshCw, Search, Power, QrCode, MessageSquare, X, Wrench } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { NewSessionDialog } from '@/components/whatsapp/NewSessionDialog'
import { WAHAHealthIndicator } from '@/components/whatsapp/WAHAHealthIndicator'
import { QRCodeModal } from '@/components/whatsapp/QRCodeModal'
import { SessionStatistics } from '@/components/whatsapp/SessionStatistics'
import { SessionActivityLog } from '@/components/whatsapp/SessionActivityLog'
import { SessionChats } from '@/components/whatsapp/SessionChats'
import { DisconnectAlert } from '@/components/whatsapp/DisconnectAlert'
import { HealthStatusWidget } from '@/components/whatsapp/HealthStatusWidget'
import { BulkActionsToolbar } from '@/components/whatsapp/BulkActionsToolbar'
import { BulkOperationProgress } from '@/components/whatsapp/BulkOperationProgress'
import { SessionRecoveryWizard } from '@/components/whatsapp/SessionRecoveryWizard'
import { wahaClient } from '@/lib/waha-client'
import { executeBulkOperation } from '@/lib/bulk-operations'
import QRCode from 'react-qr-code'

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
  const [syncing, setSyncing] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [selectedSession, setSelectedSession] = useState<WahaSession | null>(null)
  const [showQR, setShowQR] = useState(false)
  const [showChats, setShowChats] = useState(false)
  const [disconnectedSessions, setDisconnectedSessions] = useState<WahaSession[]>([])
  const [reconnectingSessionIds, setReconnectingSessionIds] = useState<string[]>([])
  
  // Bulk operations state
  const [selectedSessionIds, setSelectedSessionIds] = useState<Set<string>>(new Set())
  const [bulkOperationInProgress, setBulkOperationInProgress] = useState(false)
  const [bulkProgress, setBulkProgress] = useState({
    open: false,
    operation: '',
    operations: [] as any[],
    completed: 0,
    total: 0,
  })
  
  // Recovery wizard state
  const [showRecoveryWizard, setShowRecoveryWizard] = useState(false)
  const [recoveryWizardSessions, setRecoveryWizardSessions] = useState<WahaSession[]>([])

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
          
          // Detect unexpected disconnections
          if (payload.eventType === 'UPDATE') {
            const oldStatus = (payload.old as any)?.status
            const newStatus = (payload.new as any)?.status
            const sessionData = payload.new as WahaSession
            
            if ((oldStatus === 'WORKING' || oldStatus === 'connected') && newStatus === 'disconnected') {
              console.log('Unexpected disconnection detected for:', sessionData.session_name)
              setDisconnectedSessions(prev => {
                if (!prev.find(s => s.id === sessionData.id)) {
                  return [...prev, sessionData]
                }
                return prev
              })
            }
          }
          
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

  const handleSyncSessions = async () => {
    setSyncing(true)
    try {
      const { data, error } = await supabase.functions.invoke('waha-sync-sessions')
      
      if (error) throw error
      
      toast({
        title: 'Sincronização concluída',
        description: `${data.updated} sessões atualizadas, ${data.errors} erros`,
      })
      
      await loadSessions()
    } catch (error: any) {
      toast({
        title: 'Erro na sincronização',
        description: error.message,
        variant: 'destructive',
      })
    } finally {
      setSyncing(false)
    }
  }

  const handleDisconnectSession = async (session: WahaSession) => {
    try {
      const { error } = await supabase.functions.invoke('waha-session-stop', {
        body: { sessionName: session.session_name }
      })
      
      if (error) throw error
      
      await supabase
        .from('waha_sessions')
        .update({ status: 'disconnected', disconnected_at: new Date().toISOString() })
        .eq('id', session.id)
      
      toast({
        title: 'Sessão desconectada',
        description: `${session.session_name} foi desconectada`,
      })
      
      await loadSessions()
    } catch (error: any) {
      toast({
        title: 'Erro ao desconectar',
        description: error.message,
        variant: 'destructive',
      })
    }
  }

  const handleReconnectSession = async (session: WahaSession) => {
    setReconnectingSessionIds(prev => [...prev, session.id])
    
    try {
      const status = await wahaClient.getSessionStatus(session.session_name)
      
      if (status === 'WORKING') {
        await supabase
          .from('waha_sessions')
          .update({ status: 'connected', reconnect_attempts: 0 })
          .eq('id', session.id)
        
        toast({
          title: 'Reconectado com sucesso!',
          description: `Sessão ${session.session_name} foi reconectada.`,
        })
        
        setDisconnectedSessions(prev => prev.filter(s => s.id !== session.id))
      } else {
        toast({
          title: 'Não foi possível reconectar',
          description: 'A sessão ainda está desconectada. Tente novamente em alguns momentos.',
          variant: 'destructive',
        })
      }
      
      await loadSessions()
    } catch (error: any) {
      toast({
        title: 'Erro ao reconectar',
        description: error.message,
        variant: 'destructive',
      })
    } finally {
      setReconnectingSessionIds(prev => prev.filter(id => id !== session.id))
    }
  }

  const handleRefreshQR = async (session: WahaSession) => {
    try {
      const { qr, expiresAt } = await wahaClient.getQRCode(session.session_name)
      
      if (qr) {
        const qrExpiresAt = expiresAt || new Date(Date.now() + 60000).toISOString()
        
        await supabase
          .from('waha_sessions')
          .update({ 
            qr_code: qr,
            qr_expires_at: qrExpiresAt
          })
          .eq('id', session.id)
        
        toast({
          title: 'QR Code atualizado!',
          description: 'O código QR foi regenerado com sucesso.',
        })
        
        await loadSessions()
      }
    } catch (error: any) {
      toast({
        title: 'Erro ao atualizar QR',
        description: error.message,
        variant: 'destructive',
      })
    }
  }

  // Bulk operations handlers
  const toggleSessionSelection = (sessionId: string) => {
    setSelectedSessionIds(prev => {
      const newSet = new Set(prev)
      if (newSet.has(sessionId)) {
        newSet.delete(sessionId)
      } else {
        newSet.add(sessionId)
      }
      return newSet
    })
  }

  const toggleAllSessions = () => {
    if (selectedSessionIds.size === filteredSessions.length) {
      setSelectedSessionIds(new Set())
    } else {
      setSelectedSessionIds(new Set(filteredSessions.map(s => s.id)))
    }
  }

  const handleBulkReconnect = async () => {
    setBulkOperationInProgress(true)
    const sessionIds = Array.from(selectedSessionIds)
    
    setBulkProgress({
      open: true,
      operation: 'reconnect',
      operations: sessionIds.map(id => ({
        sessionId: id,
        sessionName: sessions.find(s => s.id === id)?.session_name || 'Unknown',
        status: 'pending',
      })),
      completed: 0,
      total: sessionIds.length,
    })

    try {
      const result = await executeBulkOperation('reconnect', sessionIds, {
        onProgress: (completed, total) => {
          setBulkProgress(prev => ({
            ...prev,
            completed,
            operations: prev.operations.map((op, idx) => ({
              ...op,
              status: idx < completed ? 'success' : idx === completed ? 'processing' : 'pending',
            })),
          }))
        },
      })

      toast({
        title: 'Reconexão em massa concluída',
        description: `${result.successful} sessões reconectadas, ${result.failed} falharam`,
        variant: result.failed > 0 ? 'destructive' : 'default',
      })

      await loadSessions()
      setSelectedSessionIds(new Set())
    } catch (error: any) {
      toast({
        title: 'Erro na operação em massa',
        description: error.message,
        variant: 'destructive',
      })
    } finally {
      setBulkOperationInProgress(false)
      setTimeout(() => setBulkProgress(prev => ({ ...prev, open: false })), 2000)
    }
  }

  const handleBulkDisconnect = async () => {
    if (!confirm(`Desconectar ${selectedSessionIds.size} sessões?`)) return

    setBulkOperationInProgress(true)
    const sessionIds = Array.from(selectedSessionIds)
    
    setBulkProgress({
      open: true,
      operation: 'disconnect',
      operations: sessionIds.map(id => ({
        sessionId: id,
        sessionName: sessions.find(s => s.id === id)?.session_name || 'Unknown',
        status: 'pending',
      })),
      completed: 0,
      total: sessionIds.length,
    })

    try {
      const result = await executeBulkOperation('disconnect', sessionIds, {
        onProgress: (completed, total) => {
          setBulkProgress(prev => ({
            ...prev,
            completed,
            operations: prev.operations.map((op, idx) => ({
              ...op,
              status: idx < completed ? 'success' : idx === completed ? 'processing' : 'pending',
            })),
          }))
        },
      })

      toast({
        title: 'Desconexão em massa concluída',
        description: `${result.successful} sessões desconectadas, ${result.failed} falharam`,
        variant: result.failed > 0 ? 'destructive' : 'default',
      })

      await loadSessions()
      setSelectedSessionIds(new Set())
    } catch (error: any) {
      toast({
        title: 'Erro na operação em massa',
        description: error.message,
        variant: 'destructive',
      })
    } finally {
      setBulkOperationInProgress(false)
      setTimeout(() => setBulkProgress(prev => ({ ...prev, open: false })), 2000)
    }
  }

  const handleBulkRefreshQR = async () => {
    setBulkOperationInProgress(true)
    const sessionIds = Array.from(selectedSessionIds)
    
    setBulkProgress({
      open: true,
      operation: 'refresh_qr',
      operations: sessionIds.map(id => ({
        sessionId: id,
        sessionName: sessions.find(s => s.id === id)?.session_name || 'Unknown',
        status: 'pending',
      })),
      completed: 0,
      total: sessionIds.length,
    })

    try {
      const result = await executeBulkOperation('refresh_qr', sessionIds, {
        onProgress: (completed, total) => {
          setBulkProgress(prev => ({
            ...prev,
            completed,
            operations: prev.operations.map((op, idx) => ({
              ...op,
              status: idx < completed ? 'success' : idx === completed ? 'processing' : 'pending',
            })),
          }))
        },
      })

      toast({
        title: 'Atualização de QR em massa concluída',
        description: `${result.successful} QR codes atualizados, ${result.failed} falharam`,
        variant: result.failed > 0 ? 'destructive' : 'default',
      })

      await loadSessions()
      setSelectedSessionIds(new Set())
    } catch (error: any) {
      toast({
        title: 'Erro na operação em massa',
        description: error.message,
        variant: 'destructive',
      })
    } finally {
      setBulkOperationInProgress(false)
      setTimeout(() => setBulkProgress(prev => ({ ...prev, open: false })), 2000)
    }
  }

  const openRecoveryWizard = (sessionsToRecover: WahaSession[]) => {
    setRecoveryWizardSessions(sessionsToRecover)
    setShowRecoveryWizard(true)
  }

  const filteredSessions = sessions.filter(session => {
    const matchesSearch = session.whatsapp_clients?.nome_empresa.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         session.session_name.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === 'all' || session.status === statusFilter
    return matchesSearch && matchesStatus
  })

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
    <div className="space-y-6 pb-24">
      <DisconnectAlert
        sessions={disconnectedSessions}
        onReconnect={handleReconnectSession}
        onDismiss={() => setDisconnectedSessions([])}
        reconnecting={reconnectingSessionIds}
      />
      
      <BulkActionsToolbar
        selectedCount={selectedSessionIds.size}
        onReconnect={handleBulkReconnect}
        onDisconnect={handleBulkDisconnect}
        onRefreshQR={handleBulkRefreshQR}
        onClearSelection={() => setSelectedSessionIds(new Set())}
        isProcessing={bulkOperationInProgress}
      />

      <BulkOperationProgress
        open={bulkProgress.open}
        operation={bulkProgress.operation}
        operations={bulkProgress.operations}
        completed={bulkProgress.completed}
        total={bulkProgress.total}
      />

      <SessionRecoveryWizard
        open={showRecoveryWizard}
        sessions={recoveryWizardSessions}
        onClose={() => setShowRecoveryWizard(false)}
        onComplete={() => {
          loadSessions()
          setShowRecoveryWizard(false)
        }}
      />
      
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dashboard WhatsApp - Tempo Real</h1>
          <p className="text-muted-foreground">Monitoramento de sessões e métricas de performance</p>
        </div>
        <div className="flex items-center gap-3">
          <WAHAHealthIndicator />
          <Button onClick={handleSyncSessions} disabled={syncing} variant="outline">
            <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
            Sincronizar
          </Button>
          <NewSessionDialog />
        </div>
      </div>

      {/* Health Status Widget */}
      <HealthStatusWidget />

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

      {/* Estatísticas em Tempo Real */}
      <SessionStatistics />

      {/* Grid com Histórico e Sessões */}
      <div className="grid gap-6 lg:grid-cols-2">
        <SessionActivityLog limit={50} />
        
        <Card>
          <CardHeader>
            <CardTitle>Sessões WhatsApp</CardTitle>
            <CardDescription>Atualização automática em tempo real</CardDescription>
            
            <div className="flex gap-3 mt-4">
              <Checkbox
                checked={selectedSessionIds.size === filteredSessions.length && filteredSessions.length > 0}
                onCheckedChange={toggleAllSessions}
                className="mt-2"
              />
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por empresa ou sessão..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 border rounded-md bg-background"
              >
                <option value="all">Todos</option>
                <option value="WORKING">Conectados</option>
                <option value="SCAN_QR_CODE">Aguardando QR</option>
              <option value="disconnected">Desconectados</option>
            </select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {filteredSessions.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma sessão encontrada</p>
            ) : (
              filteredSessions.map((session) => (
                <div key={session.id} className={`p-4 border rounded-lg space-y-3 ${selectedSessionIds.has(session.id) ? 'bg-primary/5 border-primary' : ''}`}>
                  <div className="flex items-start justify-between">
                    <Checkbox
                      checked={selectedSessionIds.has(session.id)}
                      onCheckedChange={() => toggleSessionSelection(session.id)}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{session.whatsapp_clients?.nome_empresa}</span>
                        {getStatusBadge(session.status)}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">{session.session_name}</p>
                      {session.phone_number && (
                        <p className="text-sm text-muted-foreground">{session.phone_number}</p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      {(session.status === 'SCAN_QR_CODE' || session.status === 'qr_code') && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedSession(session)
                              setShowQR(true)
                            }}
                          >
                            <QrCode className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleRefreshQR(session)}
                            title="Atualizar QR Code"
                          >
                            <RefreshCw className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                      {session.status === 'WORKING' && (
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDisconnectSession(session)}
                        >
                          <Power className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>

                  {(session.status === 'SCAN_QR_CODE' || session.status === 'qr_code') && session.qr_code && (
                    <div className="flex justify-center p-4 bg-white rounded-lg">
                      <QRCode value={session.qr_code} size={150} />
                    </div>
                  )}

                  <div className="grid grid-cols-3 gap-4 text-sm pt-3 border-t">
                    <div>
                      <p className="text-muted-foreground">Enviadas</p>
                      <p className="font-medium">{session.total_messages_sent || 0}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Recebidas</p>
                      <p className="font-medium">{session.total_messages_received || 0}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Última atividade</p>
                      <p className="font-medium">
                        {session.last_activity ? new Date(session.last_activity).toLocaleTimeString() : 'N/A'}
                      </p>
                    </div>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full mt-3"
                    onClick={() => {
                      setSelectedSession(session)
                      setShowChats(true)
                    }}
                  >
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Ver Conversas
                  </Button>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {selectedSession && (
        <>
          <QRCodeModal
            session={selectedSession}
            open={showQR}
            onClose={() => {
              setShowQR(false)
              setSelectedSession(null)
            }}
            onRefreshQR={async () => {
              if (selectedSession) {
                await handleRefreshQR(selectedSession)
              }
            }}
          />
          
          {/* Dialog for Session Chats */}
          {showChats && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
              <div className="w-full max-w-2xl max-h-[80vh] overflow-auto bg-card rounded-lg shadow-lg">
                <div className="sticky top-0 bg-card border-b p-4 flex items-center justify-between z-10">
                  <h2 className="text-xl font-semibold">Conversas da Sessão</h2>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setShowChats(false)
                      setSelectedSession(null)
                    }}
                  >
                    <X className="h-5 w-5" />
                  </Button>
                </div>
                <div className="p-6">
                  <SessionChats
                    sessionId={selectedSession.id}
                    sessionName={selectedSession.session_name}
                  />
                </div>
              </div>
            </div>
          )}
        </>
      )}

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

      {selectedSession && (
        <QRCodeModal
          session={selectedSession}
          open={!!selectedSession}
          onClose={() => setSelectedSession(null)}
        />
      )}
    </div>
  )
}
