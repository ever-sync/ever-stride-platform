import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Plano, RECURSOS_DISPONIVEIS, INTEGRACOES_DISPONIVEIS } from '@/types/plano'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'

interface PlanoFormProps {
  initialData?: Partial<Plano>
  onSubmit: (data: Omit<Plano, 'id' | 'created_at' | 'updated_at'>) => Promise<void>
  onCancel: () => void
}

export function PlanoForm({ initialData, onSubmit, onCancel }: PlanoFormProps) {
  const [loading, setLoading] = useState(false)
  const [recursos, setRecursos] = useState<string[]>(initialData?.recursos || [])
  const [integracoes, setIntegracoes] = useState<string[]>(initialData?.integracoes_permitidas || [])

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm({
    defaultValues: {
      nome: initialData?.nome || '',
      descricao: initialData?.descricao || '',
      preco_mensal: initialData?.preco_mensal || 0,
      limite_conversas_mes: initialData?.limite_conversas_mes || 1000,
      limite_tokens_mes: initialData?.limite_tokens_mes || 100000,
      limite_agentes: initialData?.limite_agentes || 1,
      limite_usuarios: initialData?.limite_usuarios || 1,
      ativo: initialData?.ativo ?? true,
      is_publico: initialData?.is_publico ?? false,
      is_default: initialData?.is_default ?? false
    }
  })

  const handleFormSubmit = async (data: any) => {
    try {
      setLoading(true)
      await onSubmit({
        ...data,
        recursos: recursos,
        integracoes_permitidas: integracoes
      })
    } catch (error) {
      console.error('Erro ao salvar:', error)
    } finally {
      setLoading(false)
    }
  }

  const toggleRecurso = (recurso: string) => {
    setRecursos(prev => 
      prev.includes(recurso)
        ? prev.filter(r => r !== recurso)
        : [...prev, recurso]
    )
  }

  const toggleIntegracao = (integracao: string) => {
    setIntegracoes(prev =>
      prev.includes(integracao)
        ? prev.filter(i => i !== integracao)
        : [...prev, integracao]
    )
  }

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
      {/* INFORMAÇÕES BÁSICAS */}
      <Card>
        <CardHeader>
          <CardTitle>Informações do Plano</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="nome">Nome do Plano *</Label>
            <Input
              id="nome"
              {...register('nome', { required: true })}
              placeholder="Ex: Plano Básico"
            />
          </div>

          <div>
            <Label htmlFor="descricao">Descrição</Label>
            <Textarea
              id="descricao"
              {...register('descricao')}
              rows={3}
              placeholder="Descreva o que está incluído neste plano..."
            />
          </div>

          <div>
            <Label htmlFor="preco_mensal">Preço Mensal (R$) *</Label>
            <Input
              id="preco_mensal"
              type="number"
              step="0.01"
              {...register('preco_mensal', { required: true, min: 0 })}
              placeholder="97.00"
            />
          </div>
        </CardContent>
      </Card>

      {/* LIMITES */}
      <Card>
        <CardHeader>
          <CardTitle>Limites do Plano</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="limite_conversas_mes">Conversas/Mês</Label>
              <Input
                id="limite_conversas_mes"
                type="number"
                {...register('limite_conversas_mes', { min: 0 })}
              />
            </div>

            <div>
              <Label htmlFor="limite_tokens_mes">Tokens/Mês</Label>
              <Input
                id="limite_tokens_mes"
                type="number"
                {...register('limite_tokens_mes', { min: 0 })}
              />
            </div>

            <div>
              <Label htmlFor="limite_agentes">Agentes</Label>
              <Input
                id="limite_agentes"
                type="number"
                {...register('limite_agentes', { min: 1 })}
              />
            </div>

            <div>
              <Label htmlFor="limite_usuarios">Usuários</Label>
              <Input
                id="limite_usuarios"
                type="number"
                {...register('limite_usuarios', { min: 1 })}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* RECURSOS */}
      <Card>
        <CardHeader>
          <CardTitle>Recursos Incluídos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3">
            {RECURSOS_DISPONIVEIS.map((recurso) => (
              <div key={recurso.value} className="flex items-center space-x-2">
                <Checkbox
                  id={recurso.value}
                  checked={recursos.includes(recurso.value)}
                  onCheckedChange={() => toggleRecurso(recurso.value)}
                />
                <label
                  htmlFor={recurso.value}
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  {recurso.label}
                </label>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* INTEGRAÇÕES */}
      <Card>
        <CardHeader>
          <CardTitle>Integrações Permitidas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3">
            {INTEGRACOES_DISPONIVEIS.map((integracao) => (
              <div key={integracao.value} className="flex items-center space-x-2">
                <Checkbox
                  id={integracao.value}
                  checked={integracoes.includes(integracao.value)}
                  onCheckedChange={() => toggleIntegracao(integracao.value)}
                />
                <label
                  htmlFor={integracao.value}
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  {integracao.label}
                </label>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* CONFIGURAÇÕES */}
      <Card>
        <CardHeader>
          <CardTitle>Configurações</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="ativo">Plano Ativo</Label>
              <p className="text-sm text-muted-foreground">
                Apenas planos ativos podem ser selecionados
              </p>
            </div>
            <Switch
              id="ativo"
              checked={watch('ativo')}
              onCheckedChange={(checked) => setValue('ativo', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="is_publico">Plano Público</Label>
              <p className="text-sm text-muted-foreground">
                Visível para todos os técnicos
              </p>
            </div>
            <Switch
              id="is_publico"
              checked={watch('is_publico')}
              onCheckedChange={(checked) => setValue('is_publico', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="is_default">Plano Padrão</Label>
              <p className="text-sm text-muted-foreground">
                Aplicado automaticamente a novos clientes
              </p>
            </div>
            <Switch
              id="is_default"
              checked={watch('is_default')}
              onCheckedChange={(checked) => setValue('is_default', checked)}
            />
          </div>
        </CardContent>
      </Card>

      {/* BOTÕES */}
      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? 'Salvando...' : initialData ? 'Atualizar' : 'Criar Plano'}
        </Button>
      </div>
    </form>
  )
}
