import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppShell } from '@/components/AppShell'
import { useCreateAgent } from '@/hooks/useCreateAgent'
import { useWhatsAppClients } from '@/hooks/useWhatsAppClients'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ArrowLeft, Bot } from 'lucide-react'

const MODELOS_IA = [
  { value: 'gpt-4o-mini', label: 'GPT-4o Mini (Econômico)' },
  { value: 'gpt-4o', label: 'GPT-4o (Equilibrado)' },
  { value: 'gpt-4-turbo', label: 'GPT-4 Turbo (Premium)' },
  { value: 'claude-haiku-4', label: 'Claude Haiku (Rápido)' },
  { value: 'claude-sonnet-4', label: 'Claude Sonnet (Recomendado)' },
  { value: 'claude-opus-4', label: 'Claude Opus (Máximo)' }
]

export default function AgentCreate() {
  const navigate = useNavigate()
  const { createAgent, loading } = useCreateAgent()
  const { clientes } = useWhatsAppClients()
  
  const [formData, setFormData] = useState({
    nome: '',
    descricao: '',
    tipo: 'atendimento',
    modelo_ia: 'gpt-4o-mini',
    temperatura: 0.7,
    max_tokens: 800,
    prompt_sistema: 'Você é um assistente virtual prestativo e profissional. Responda de forma clara e objetiva às perguntas dos usuários.',
    saudacao_inicial: 'Olá! Como posso ajudar?',
    client_id: ''
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const agent = await createAgent(formData)
    if (agent) {
      navigate(`/agents/${agent.id}`)
    }
  }

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/agents')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Criar Novo Agente</h1>
            <p className="text-muted-foreground">
              Configure um novo agente de IA para atendimento
            </p>
          </div>
        </div>

        {/* Formulário */}
        <form onSubmit={handleSubmit}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bot className="h-5 w-5" />
                Informações do Agente
              </CardTitle>
              <CardDescription>
                Preencha os dados básicos do agente
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Nome */}
              <div className="space-y-2">
                <Label htmlFor="nome">Nome do Agente *</Label>
                <Input
                  id="nome"
                  placeholder="Ex: Assistente de Vendas"
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  required
                />
              </div>

              {/* Descrição */}
              <div className="space-y-2">
                <Label htmlFor="descricao">Descrição</Label>
                <Textarea
                  id="descricao"
                  placeholder="Descreva brevemente a função deste agente..."
                  value={formData.descricao}
                  onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                  rows={3}
                />
              </div>

              {/* Cliente WhatsApp */}
              <div className="space-y-2">
                <Label htmlFor="client_id">Cliente WhatsApp (Opcional)</Label>
                <Select
                  value={formData.client_id}
                  onValueChange={(value) => setFormData({ ...formData, client_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Nenhum</SelectItem>
                    {clientes?.map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.nome_empresa}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Modelo IA */}
              <div className="space-y-2">
                <Label htmlFor="modelo_ia">Modelo de IA</Label>
                <Select
                  value={formData.modelo_ia}
                  onValueChange={(value) => setFormData({ ...formData, modelo_ia: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MODELOS_IA.map((modelo) => (
                      <SelectItem key={modelo.value} value={modelo.value}>
                        {modelo.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Prompt Sistema */}
              <div className="space-y-2">
                <Label htmlFor="prompt_sistema">Prompt do Sistema *</Label>
                <Textarea
                  id="prompt_sistema"
                  placeholder="Instrução inicial do agente..."
                  value={formData.prompt_sistema}
                  onChange={(e) => setFormData({ ...formData, prompt_sistema: e.target.value })}
                  rows={4}
                  required
                />
              </div>

              {/* Saudação Inicial */}
              <div className="space-y-2">
                <Label htmlFor="saudacao_inicial">Saudação Inicial</Label>
                <Input
                  id="saudacao_inicial"
                  placeholder="Ex: Olá! Como posso ajudar?"
                  value={formData.saudacao_inicial}
                  onChange={(e) => setFormData({ ...formData, saudacao_inicial: e.target.value })}
                />
              </div>

              {/* Configurações Avançadas */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="temperatura">Temperatura</Label>
                  <Input
                    id="temperatura"
                    type="number"
                    step="0.1"
                    min="0"
                    max="2"
                    value={formData.temperatura}
                    onChange={(e) => setFormData({ ...formData, temperatura: parseFloat(e.target.value) })}
                  />
                  <p className="text-xs text-muted-foreground">
                    Criatividade (0 = preciso, 2 = criativo)
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="max_tokens">Max Tokens</Label>
                  <Input
                    id="max_tokens"
                    type="number"
                    step="100"
                    min="100"
                    max="4000"
                    value={formData.max_tokens}
                    onChange={(e) => setFormData({ ...formData, max_tokens: parseInt(e.target.value) })}
                  />
                  <p className="text-xs text-muted-foreground">
                    Tamanho máximo da resposta
                  </p>
                </div>
              </div>

              {/* Botões */}
              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate('/agents')}
                  disabled={loading}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? 'Criando...' : 'Criar Agente'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </form>
      </div>
    </AppShell>
  )
}
