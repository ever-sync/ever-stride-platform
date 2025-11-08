import { useParams, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { AppShell } from '@/components/AppShell'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ArrowLeft, Save, Settings, Bot, Zap } from 'lucide-react'

interface AgentData {
  id: string
  nome: string
  descricao: string
  prompt_sistema: string
  modelo_ia: string
  temperatura: number
  max_tokens: number
  limite_msgs_mes: number
  limite_tokens_mes: number
  n8n_workflow_id: string | null
  n8n_webhook_url: string | null
  status: string
}

export default function AgentEditPage() {
  const { agentId } = useParams<{ agentId: string }>()
  const navigate = useNavigate()
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [agent, setAgent] = useState<AgentData | null>(null)

  useEffect(() => {
    loadAgent()
  }, [agentId])

  const loadAgent = async () => {
    try {
      const { data, error } = await supabase
        .from('agents_v2')
        .select('*')
        .eq('id', agentId)
        .single()

      if (error) throw error

      setAgent({
        id: data.id,
        nome: data.nome || '',
        descricao: data.descricao || '',
        prompt_sistema: data.prompt_sistema || '',
        modelo_ia: data.modelo_ia || 'gpt-4o-mini',
        temperatura: data.temperatura || 0.7,
        max_tokens: data.max_tokens || 800,
        limite_msgs_mes: data.limite_msgs_mes || 1000,
        limite_tokens_mes: data.limite_tokens_mes || 100000,
        n8n_workflow_id: data.n8n_workflow_id,
        n8n_webhook_url: data.n8n_webhook_url,
        status: data.status || 'active'
      })
    } catch (error: any) {
      console.error('Erro ao carregar agente:', error)
      toast({
        title: 'Erro ao carregar agente',
        description: error.message,
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!agent) return

    try {
      setSaving(true)

      const { error } = await supabase
        .from('agents_v2')
        .update({
          nome: agent.nome,
          descricao: agent.descricao,
          prompt_sistema: agent.prompt_sistema,
          modelo_ia: agent.modelo_ia,
          temperatura: agent.temperatura,
          max_tokens: agent.max_tokens,
          limite_msgs_mes: agent.limite_msgs_mes,
          limite_tokens_mes: agent.limite_tokens_mes,
          updated_at: new Date().toISOString()
        })
        .eq('id', agentId)

      if (error) throw error

      toast({
        title: 'Agente atualizado',
        description: 'As configurações foram salvas com sucesso'
      })

      navigate(`/agents/${agentId}`)
    } catch (error: any) {
      console.error('Erro ao salvar:', error)
      toast({
        title: 'Erro ao salvar',
        description: error.message,
        variant: 'destructive'
      })
    } finally {
      setSaving(false)
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

  if (!agent) {
    return (
      <AppShell>
        <div className="text-center py-12">
          <p className="text-muted-foreground">Agente não encontrado</p>
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(`/agents/${agentId}`)}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold">Editar Agente</h1>
              <p className="text-muted-foreground">{agent.nome}</p>
            </div>
          </div>
          <Button onClick={handleSave} disabled={saving}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Salvando...' : 'Salvar Alterações'}
          </Button>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="basic" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="basic">
              <Settings className="h-4 w-4 mr-2" />
              Básico
            </TabsTrigger>
            <TabsTrigger value="ia">
              <Bot className="h-4 w-4 mr-2" />
              Configuração IA
            </TabsTrigger>
            <TabsTrigger value="integrations">
              <Zap className="h-4 w-4 mr-2" />
              Integrações
            </TabsTrigger>
          </TabsList>

          {/* Tab Básico */}
          <TabsContent value="basic" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Informações Básicas</CardTitle>
                <CardDescription>
                  Configure o nome e descrição do agente
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="nome">Nome do Agente</Label>
                  <Input
                    id="nome"
                    value={agent.nome}
                    onChange={(e) => setAgent({ ...agent, nome: e.target.value })}
                    placeholder="Ex: Atendimento Vendas"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="descricao">Descrição</Label>
                  <Textarea
                    id="descricao"
                    value={agent.descricao}
                    onChange={(e) => setAgent({ ...agent, descricao: e.target.value })}
                    placeholder="Descreva o propósito deste agente..."
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select
                    value={agent.status}
                    onValueChange={(value) => setAgent({ ...agent, status: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Ativo</SelectItem>
                      <SelectItem value="paused">Pausado</SelectItem>
                      <SelectItem value="suspended">Suspenso</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Limites</CardTitle>
                <CardDescription>
                  Configure os limites de uso do agente
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="limite_msgs">Limite de Mensagens/Mês</Label>
                  <Input
                    id="limite_msgs"
                    type="number"
                    value={agent.limite_msgs_mes}
                    onChange={(e) => setAgent({ ...agent, limite_msgs_mes: parseInt(e.target.value) })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="limite_tokens">Limite de Tokens/Mês</Label>
                  <Input
                    id="limite_tokens"
                    type="number"
                    value={agent.limite_tokens_mes}
                    onChange={(e) => setAgent({ ...agent, limite_tokens_mes: parseInt(e.target.value) })}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab IA */}
          <TabsContent value="ia" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Modelo de IA</CardTitle>
                <CardDescription>
                  Configure o modelo e parâmetros de geração
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="modelo">Modelo</Label>
                  <Select
                    value={agent.modelo_ia}
                    onValueChange={(value) => setAgent({ ...agent, modelo_ia: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="gpt-4o">GPT-4o</SelectItem>
                      <SelectItem value="gpt-4o-mini">GPT-4o Mini</SelectItem>
                      <SelectItem value="gpt-4-turbo">GPT-4 Turbo</SelectItem>
                      <SelectItem value="claude-sonnet-4">Claude Sonnet 4</SelectItem>
                      <SelectItem value="claude-opus-4">Claude Opus 4</SelectItem>
                      <SelectItem value="claude-haiku-4">Claude Haiku 4</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="temperatura">
                    Temperatura: {agent.temperatura.toFixed(1)}
                  </Label>
                  <input
                    id="temperatura"
                    type="range"
                    min="0"
                    max="2"
                    step="0.1"
                    value={agent.temperatura}
                    onChange={(e) => setAgent({ ...agent, temperatura: parseFloat(e.target.value) })}
                    className="w-full"
                  />
                  <p className="text-xs text-muted-foreground">
                    Controla a criatividade das respostas (0 = determinístico, 2 = muito criativo)
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="max_tokens">Máximo de Tokens por Resposta</Label>
                  <Input
                    id="max_tokens"
                    type="number"
                    value={agent.max_tokens}
                    onChange={(e) => setAgent({ ...agent, max_tokens: parseInt(e.target.value) })}
                  />
                  <p className="text-xs text-muted-foreground">
                    Controla o tamanho máximo das respostas (800-4000 tokens)
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Prompt do Sistema</CardTitle>
                <CardDescription>
                  Define o comportamento e personalidade do agente
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={agent.prompt_sistema}
                  onChange={(e) => setAgent({ ...agent, prompt_sistema: e.target.value })}
                  placeholder="Ex: Você é um assistente de vendas especializado em produtos de tecnologia. Seja amigável, prestativo e sempre busque entender a necessidade do cliente..."
                  rows={12}
                  className="font-mono text-sm"
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab Integrações */}
          <TabsContent value="integrations" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>N8N Workflow</CardTitle>
                <CardDescription>
                  Configurações de integração com N8N
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {agent.n8n_workflow_id ? (
                  <>
                    <div className="space-y-2">
                      <Label>Workflow ID</Label>
                      <Input value={agent.n8n_workflow_id} disabled />
                    </div>

                    {agent.n8n_webhook_url && (
                      <div className="space-y-2">
                        <Label>Webhook URL</Label>
                        <Input value={agent.n8n_webhook_url} disabled />
                      </div>
                    )}

                    <div className="flex gap-2">
                      <Button variant="outline" className="flex-1">
                        Ver no N8N
                      </Button>
                      <Button variant="destructive">
                        Remover Integração
                      </Button>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground mb-4">
                      Nenhum workflow N8N configurado
                    </p>
                    <Button>
                      <Zap className="h-4 w-4 mr-2" />
                      Criar Workflow N8N
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>WhatsApp</CardTitle>
                <CardDescription>
                  Configurações de integração com WhatsApp via WAHA
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  Integração WhatsApp disponível em breve
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppShell>
  )
}
