import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { AgentFormData, MODELOS_IA } from '@/types/agent'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Slider } from '@/components/ui/slider'
import { Badge } from '@/components/ui/badge'

interface AgentFormProps {
  initialData?: Partial<AgentFormData>
  onSubmit: (data: AgentFormData) => Promise<void>
  onCancel: () => void
  clientes: Array<{ id: string; nome_empresa: string }>
}

export function AgentForm({ initialData, onSubmit, onCancel, clientes }: AgentFormProps) {
  const [loading, setLoading] = useState(false)
  const [temperatura, setTemperatura] = useState(initialData?.temperatura || 0.7)
  
  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<AgentFormData>({
    defaultValues: {
      client_id: initialData?.client_id || '',
      nome_agente: initialData?.nome_agente || '',
      script_atendimento: initialData?.script_atendimento || '',
      saudacao_inicial: initialData?.saudacao_inicial || 'Olá! Como posso ajudar você hoje?',
      limite_mensagens_mes: initialData?.limite_mensagens_mes || 1000,
      tempo_atendimento: initialData?.tempo_atendimento || 30,
      modelo_ia: initialData?.modelo_ia || 'gpt-4o-mini',
      temperatura: initialData?.temperatura || 0.7,
      max_tokens: initialData?.max_tokens || 800,
      prompt_sistema: initialData?.prompt_sistema || ''
    }
  })

  const modeloSelecionado = watch('modelo_ia')
  const modeloInfo = MODELOS_IA.find(m => m.value === modeloSelecionado)

  const handleFormSubmit = async (data: AgentFormData) => {
    try {
      setLoading(true)
      await onSubmit(data)
    } catch (error) {
      console.error('Erro ao salvar:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
      {/* SEÇÃO: INFORMAÇÕES BÁSICAS */}
      <Card>
        <CardHeader>
          <CardTitle>Informações Básicas</CardTitle>
          <CardDescription>Dados principais do agente</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Cliente */}
          <div>
            <Label htmlFor="client_id">Cliente *</Label>
            <Select
              value={watch('client_id')}
              onValueChange={(value) => setValue('client_id', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione um cliente" />
              </SelectTrigger>
              <SelectContent>
                {clientes.map((cliente) => (
                  <SelectItem key={cliente.id} value={cliente.id}>
                    {cliente.nome_empresa}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.client_id && (
              <p className="text-sm text-destructive mt-1">Cliente é obrigatório</p>
            )}
          </div>

          {/* Nome do Agente */}
          <div>
            <Label htmlFor="nome_agente">Nome do Agente *</Label>
            <Input
              id="nome_agente"
              {...register('nome_agente', { required: true })}
              placeholder="Ex: Atendente Virtual Maria"
            />
            {errors.nome_agente && (
              <p className="text-sm text-destructive mt-1">Nome é obrigatório</p>
            )}
          </div>

          {/* Saudação Inicial */}
          <div>
            <Label htmlFor="saudacao_inicial">Saudação Inicial *</Label>
            <Input
              id="saudacao_inicial"
              {...register('saudacao_inicial', { required: true })}
              placeholder="Olá! Como posso ajudar você hoje?"
            />
          </div>
        </CardContent>
      </Card>

      {/* SEÇÃO: CONFIGURAÇÃO DE IA */}
      <Card>
        <CardHeader>
          <CardTitle>Configuração de Inteligência Artificial</CardTitle>
          <CardDescription>Escolha o modelo e parâmetros da IA</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Modelo */}
          <div>
            <Label htmlFor="modelo_ia">Modelo de IA *</Label>
            <Select
              value={watch('modelo_ia')}
              onValueChange={(value) => setValue('modelo_ia', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MODELOS_IA.map((modelo) => (
                  <SelectItem key={modelo.value} value={modelo.value}>
                    <div className="flex items-center justify-between w-full">
                      <span>{modelo.label}</span>
                      <Badge variant={
                        modelo.custo === 'Baixo' ? 'success' :
                        modelo.custo === 'Médio' ? 'warning' :
                        'destructive'
                      } className="ml-2">
                        {modelo.custo}
                      </Badge>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {modeloInfo && (
              <p className="text-sm text-muted-foreground mt-1">
                Custo: {modeloInfo.custo}
              </p>
            )}
          </div>

          {/* Temperatura */}
          <div>
            <Label htmlFor="temperatura">
              Temperatura: {temperatura.toFixed(2)}
            </Label>
            <Slider
              value={[temperatura]}
              onValueChange={([value]) => {
                setTemperatura(value)
                setValue('temperatura', value)
              }}
              min={0}
              max={2}
              step={0.1}
              className="mt-2"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Menor = Mais consistente | Maior = Mais criativo
            </p>
          </div>

          {/* Max Tokens */}
          <div>
            <Label htmlFor="max_tokens">Tokens Máximos por Resposta</Label>
            <Input
              id="max_tokens"
              type="number"
              {...register('max_tokens', { min: 100, max: 4000 })}
              placeholder="800"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Controla o tamanho máximo das respostas (100-4000)
            </p>
          </div>

          {/* Prompt do Sistema */}
          <div>
            <Label htmlFor="prompt_sistema">Prompt do Sistema (Opcional)</Label>
            <Textarea
              id="prompt_sistema"
              {...register('prompt_sistema')}
              rows={4}
              placeholder="Instruções específicas para o comportamento da IA..."
              className="font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Use este campo para instruções avançadas. Se vazio, usará o Script de Atendimento.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* SEÇÃO: SCRIPT E COMPORTAMENTO */}
      <Card>
        <CardHeader>
          <CardTitle>Script de Atendimento</CardTitle>
          <CardDescription>Como o agente deve se comportar</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="script_atendimento">Script de Atendimento *</Label>
            <Textarea
              id="script_atendimento"
              {...register('script_atendimento', { required: true })}
              rows={8}
              placeholder="Você é um atendente virtual especializado em...&#10;&#10;Suas responsabilidades:&#10;- Responder dúvidas sobre produtos&#10;- Fornecer informações sobre prazos&#10;- Ser sempre educado e prestativo&#10;&#10;Regras importantes:&#10;- Nunca invente informações&#10;- Se não souber, transfira para humano&#10;- Use linguagem clara e objetiva"
              className="font-mono text-sm"
            />
            {errors.script_atendimento && (
              <p className="text-sm text-destructive mt-1">Script é obrigatório</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* SEÇÃO: LIMITES E CONTROLE */}
      <Card>
        <CardHeader>
          <CardTitle>Limites e Controle</CardTitle>
          <CardDescription>Defina limites operacionais</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Limite de Mensagens */}
          <div>
            <Label htmlFor="limite_mensagens_mes">Limite de Mensagens/Mês</Label>
            <Input
              id="limite_mensagens_mes"
              type="number"
              {...register('limite_mensagens_mes', { min: 100 })}
              placeholder="1000"
            />
          </div>

          {/* Tempo de Atendimento */}
          <div>
            <Label htmlFor="tempo_atendimento">Tempo Máximo de Atendimento (minutos)</Label>
            <Input
              id="tempo_atendimento"
              type="number"
              {...register('tempo_atendimento', { min: 1 })}
              placeholder="30"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Após este tempo, o atendimento pode ser transferido para humano
            </p>
          </div>
        </CardContent>
      </Card>

      {/* BOTÕES */}
      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? 'Salvando...' : initialData ? 'Atualizar Agente' : 'Criar Agente'}
        </Button>
      </div>
    </form>
  )
}
