import { useParams } from 'react-router-dom'
import { AppShell } from '@/components/AppShell'
import { useAgentMonitoring } from '@/hooks/useAgentMonitoring'
import { useAgentActions } from '@/hooks/useAgentActions'
import { AgentMonitoringDashboard } from '@/components/agents/AgentMonitoringDashboard'
import { AgentAnalytics } from '@/components/agents/AgentAnalytics'
import { PromptVersionManager } from '@/components/agents/PromptVersionManager'
import { ABTestManager } from '@/components/agents/ABTestManager'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Play, 
  Pause, 
  TestTube, 
  RefreshCw, 
  Settings, 
  TrendingUp,
  Activity,
  Zap,
  MessageSquare,
  History
} from 'lucide-react'
import { useState } from 'react'

export default function AgentDetailPage() {
  const { agentId } = useParams<{ agentId: string }>()
  const { data, loading, refresh } = useAgentMonitoring(agentId!)
  const { 
    loading: actionLoading, 
    pauseAgent, 
    resumeAgent, 
    testAgent, 
    syncN8NWorkflow 
  } = useAgentActions(agentId!)
  
  const [testMessage, setTestMessage] = useState('')
  const [testResult, setTestResult] = useState<any>(null)

  if (loading) {
    return (
      <AppShell>
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </AppShell>
    )
  }

  if (!data) {
    return (
      <AppShell>
        <div className="text-center py-12">
          <p className="text-muted-foreground">Agente não encontrado</p>
        </div>
      </AppShell>
    )
  }

  const handleTest = async () => {
    if (!testMessage.trim()) return
    const result = await testAgent(testMessage)
    setTestResult(result)
  }

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Header com Ações Rápidas */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold">{data.agent.nome}</h1>
              <Badge variant={
                data.agent.status === 'active' ? 'success' :
                data.agent.status === 'paused' ? 'warning' :
                'destructive'
              }>
                {data.agent.status}
              </Badge>
            </div>
            <p className="text-muted-foreground mt-1">
              {data.agent.descricao || 'Agente de atendimento inteligente'}
            </p>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={refresh}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>

            {data.agent.status === 'active' ? (
              <Button
                variant="outline"
                size="sm"
                onClick={pauseAgent}
                disabled={actionLoading}
              >
                <Pause className="h-4 w-4 mr-2" />
                Pausar
              </Button>
            ) : (
              <Button
                variant="default"
                size="sm"
                onClick={resumeAgent}
                disabled={actionLoading}
              >
                <Play className="h-4 w-4 mr-2" />
                Reativar
              </Button>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={syncN8NWorkflow}
              disabled={actionLoading}
            >
              <Zap className="h-4 w-4 mr-2" />
              Sync N8N
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => window.location.href = `/agents/${agentId}/edit`}
            >
              <Settings className="h-4 w-4 mr-2" />
              Configurar
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="monitoring" className="w-full">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="monitoring">
              <Activity className="h-4 w-4 mr-2" />
              Monitoramento
            </TabsTrigger>
            <TabsTrigger value="test">
              <TestTube className="h-4 w-4 mr-2" />
              Testar
            </TabsTrigger>
            <TabsTrigger value="analytics">
              <TrendingUp className="h-4 w-4 mr-2" />
              Analytics
            </TabsTrigger>
            <TabsTrigger value="versions">
              <History className="h-4 w-4 mr-2" />
              Versões
            </TabsTrigger>
            <TabsTrigger value="ab-tests">
              <TestTube className="h-4 w-4 mr-2" />
              Testes A/B
            </TabsTrigger>
            <TabsTrigger value="chats">
              <MessageSquare className="h-4 w-4 mr-2" />
              Conversas
            </TabsTrigger>
          </TabsList>

          {/* Tab 1: Monitoramento */}
          <TabsContent value="monitoring">
            <AgentMonitoringDashboard agentId={agentId!} />
          </TabsContent>

          {/* Tab 2: Testar Agente */}
          <TabsContent value="test">
            <Card>
              <CardHeader>
                <CardTitle>Testar Agente</CardTitle>
                <CardDescription>
                  Envie uma mensagem de teste para ver como o agente responde
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Mensagem de Teste
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      className="flex-1 px-3 py-2 border border-input rounded-md bg-background"
                      placeholder="Ex: Olá, quero saber sobre preços"
                      value={testMessage}
                      onChange={(e) => setTestMessage(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleTest()}
                    />
                    <Button onClick={handleTest} disabled={actionLoading}>
                      <TestTube className="h-4 w-4 mr-2" />
                      Testar
                    </Button>
                  </div>
                </div>

                {testResult && (
                  <div className="mt-6 space-y-4">
                    <div className="bg-primary/10 p-4 rounded-lg border border-primary/20">
                      <p className="text-sm font-medium mb-2">
                        Resposta do Agente:
                      </p>
                      <p>{testResult.response}</p>
                    </div>

                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div className="bg-muted p-3 rounded">
                        <p className="text-muted-foreground mb-1">Tokens Usados</p>
                        <p className="text-lg font-bold">{testResult.tokens_used}</p>
                      </div>
                      <div className="bg-muted p-3 rounded">
                        <p className="text-muted-foreground mb-1">Custo</p>
                        <p className="text-lg font-bold">
                          R$ {testResult.custo_brl?.toFixed(4)}
                        </p>
                      </div>
                      <div className="bg-muted p-3 rounded">
                        <p className="text-muted-foreground mb-1">Modelo</p>
                        <p className="text-sm font-medium">{testResult.modelo}</p>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab 3: Analytics Avançado */}
          <TabsContent value="analytics">
            <AgentAnalytics agentId={agentId!} />
          </TabsContent>

          {/* Tab 4: Versionamento */}
          <TabsContent value="versions">
            <PromptVersionManager agentId={agentId!} />
          </TabsContent>

          {/* Tab 5: Testes A/B */}
          <TabsContent value="ab-tests">
            <ABTestManager agentId={agentId!} />
          </TabsContent>

          {/* Tab 4: Conversas Recentes */}
          <TabsContent value="chats">
            <Card>
              <CardHeader>
                <CardTitle>Últimas Conversas</CardTitle>
                <CardDescription>
                  Conversas processadas por este agente
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12 text-muted-foreground">
                  Lista de conversas será implementada aqui
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppShell>
  )
}