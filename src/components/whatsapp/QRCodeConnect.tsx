import { useEffect, useState } from 'react'
import { useWahaSession } from '@/hooks/useWahaSession'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Loader2, Smartphone, CheckCircle, XCircle, RefreshCw, Clock } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'

interface QRCodeConnectProps {
  clientId: string
  agentId?: string
}

export function QRCodeConnect({ clientId, agentId }: QRCodeConnectProps) {
  const { session, loading, connecting, criarSession, atualizarQR, desconectar } = useWahaSession(clientId)
  const [autoRefresh, setAutoRefresh] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null)

  // Auto-refresh QR Code every 30s when status = qr_code
  useEffect(() => {
    if (session?.status === 'qr_code' && autoRefresh) {
      const interval = setInterval(async () => {
        setRefreshing(true)
        await atualizarQR()
        setRefreshing(false)
      }, 30000)
      return () => clearInterval(interval)
    }
  }, [session?.status, autoRefresh, atualizarQR])

  // Countdown timer for QR expiration
  useEffect(() => {
    if (session?.status === 'qr_code' && session?.qr_expires_at) {
      const updateTimer = () => {
        const expiresAt = new Date(session.qr_expires_at).getTime()
        const now = Date.now()
        const remaining = Math.max(0, Math.floor((expiresAt - now) / 1000))
        setTimeRemaining(remaining)
        
        if (remaining === 0 && autoRefresh) {
          atualizarQR()
        }
      }
      
      updateTimer()
      const interval = setInterval(updateTimer, 1000)
      return () => clearInterval(interval)
    } else {
      setTimeRemaining(null)
    }
  }, [session?.status, session?.qr_expires_at, autoRefresh, atualizarQR])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const handleRefreshQR = async () => {
    setRefreshing(true)
    await atualizarQR()
    setRefreshing(false)
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  const getStatusBadge = (status: string) => {
    const config = {
      disconnected: { variant: 'secondary' as const, label: 'Desconectado', icon: XCircle },
      qr_code: { variant: 'warning' as const, label: 'Aguardando QR', icon: Smartphone },
      connecting: { variant: 'warning' as const, label: 'Conectando...', icon: Loader2 },
      connected: { variant: 'success' as const, label: 'Conectado', icon: CheckCircle },
      failed: { variant: 'destructive' as const, label: 'Falhou', icon: XCircle }
    }
    
    const { variant, label, icon: Icon } = config[status as keyof typeof config] || config.disconnected
    
    return (
      <Badge variant={variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {label}
      </Badge>
    )
  }

  return (
    <div className="space-y-4">
      {/* Card de Status */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Conexão WhatsApp</CardTitle>
              <CardDescription>
                Status da conexão com o WhatsApp via WAHA
              </CardDescription>
            </div>
            {session && getStatusBadge(session.status)}
          </div>
        </CardHeader>
        <CardContent>
          {!session ? (
            // Sem sessão - Criar nova
            <div className="text-center py-8">
              <Smartphone className="h-16 w-16 mx-auto text-muted mb-4" />
              <h3 className="text-lg font-semibold mb-2">WhatsApp não conectado</h3>
              <p className="text-sm text-muted-foreground mb-6">
                Conecte o WhatsApp do cliente para começar a receber mensagens
              </p>
              <Button
                onClick={() => {
                  criarSession(agentId)
                  setAutoRefresh(true)
                }}
                disabled={connecting}
              >
                {connecting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Criando sessão...
                  </>
                ) : (
                  <>
                    <Smartphone className="mr-2 h-4 w-4" />
                    Conectar WhatsApp
                  </>
                )}
              </Button>
            </div>
          ) : session.status === 'qr_code' ? (
            // Mostrando QR Code
            <div className="text-center py-4">
              <h3 className="text-lg font-semibold mb-4">Escaneie o QR Code</h3>
              
              {refreshing ? (
                <div className="bg-muted p-12 rounded-lg">
                  <Loader2 className="h-12 w-12 mx-auto animate-spin text-primary" />
                  <p className="text-sm text-muted-foreground mt-4">Atualizando QR Code...</p>
                </div>
              ) : session.qr_code ? (
                <div className="space-y-4">
                  <div className="bg-background p-4 rounded-lg inline-block border-2 border-border">
                    <img
                      src={session.qr_code}
                      alt="QR Code WhatsApp"
                      className="w-64 h-64 mx-auto"
                    />
                  </div>
                  
                  {timeRemaining !== null && (
                    <div className="max-w-md mx-auto space-y-2">
                      <div className="flex items-center justify-center gap-2 text-sm">
                        <Clock className="h-4 w-4" />
                        <span className="font-medium">
                          Expira em: {formatTime(timeRemaining)}
                        </span>
                      </div>
                      <Progress 
                        value={(timeRemaining / 60) * 100} 
                        className="h-2"
                      />
                      {timeRemaining < 10 && (
                        <p className="text-xs text-destructive">
                          QR Code expirando em breve...
                        </p>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-muted p-12 rounded-lg">
                  <Loader2 className="h-12 w-12 mx-auto animate-spin text-muted-foreground" />
                  <p className="text-sm text-muted-foreground mt-4">Gerando QR Code...</p>
                </div>
              )}

              <Alert className="mt-6 text-left">
                <Smartphone className="h-4 w-4" />
                <AlertDescription>
                  <strong>Como conectar:</strong>
                  <ol className="list-decimal list-inside mt-2 space-y-1 text-sm">
                    <li>Abra o WhatsApp no celular</li>
                    <li>Toque em <strong>Mais opções</strong> ou <strong>Configurações</strong></li>
                    <li>Toque em <strong>Aparelhos conectados</strong></li>
                    <li>Toque em <strong>Conectar um aparelho</strong></li>
                    <li>Aponte o celular para esta tela e escaneie o código</li>
                  </ol>
                </AlertDescription>
              </Alert>

              <div className="flex gap-2 justify-center mt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRefreshQR}
                  disabled={refreshing}
                >
                  <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                  {refreshing ? 'Atualizando...' : 'Atualizar QR'}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    desconectar()
                    setAutoRefresh(false)
                  }}
                >
                  Cancelar
                </Button>
              </div>
            </div>
          ) : session.status === 'connected' ? (
            // Conectado
            <div className="text-center py-8">
              <CheckCircle className="h-16 w-16 mx-auto text-green-500 mb-4" />
              <h3 className="text-lg font-semibold mb-2">WhatsApp Conectado!</h3>
              <p className="text-sm text-muted-foreground mb-2">
                Número: {session.phone_number || 'Carregando...'}
              </p>
              <p className="text-xs text-muted-foreground mb-6">
                Última atividade: {session.last_activity 
                  ? new Date(session.last_activity).toLocaleString('pt-BR')
                  : 'Nunca'
                }
              </p>

              <div className="grid grid-cols-2 gap-4 max-w-md mx-auto mb-6">
                <div className="bg-muted p-4 rounded-lg">
                  <p className="text-2xl font-bold text-green-500">
                    {session.total_messages_sent || 0}
                  </p>
                  <p className="text-xs text-muted-foreground">Mensagens Enviadas</p>
                </div>
                <div className="bg-muted p-4 rounded-lg">
                  <p className="text-2xl font-bold text-blue-500">
                    {session.total_messages_received || 0}
                  </p>
                  <p className="text-xs text-muted-foreground">Mensagens Recebidas</p>
                </div>
              </div>

              <Button
                variant="destructive"
                onClick={desconectar}
              >
                <XCircle className="mr-2 h-4 w-4" />
                Desconectar WhatsApp
              </Button>
            </div>
          ) : (
            // Outros status (connecting, failed, etc)
            <div className="text-center py-8">
              <Loader2 className="h-16 w-16 mx-auto text-muted mb-4 animate-spin" />
              <h3 className="text-lg font-semibold mb-2">
                {session.status === 'connecting' ? 'Conectando...' : 'Status desconhecido'}
              </h3>
              <p className="text-sm text-muted-foreground mb-6">
                Aguarde enquanto estabelecemos a conexão
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
