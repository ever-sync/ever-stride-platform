import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Slider } from '@/components/ui/slider'
import { useToast } from '@/hooks/use-toast'
import { TestTube, Play, Pause, Trophy, TrendingUp } from 'lucide-react'
import { Progress } from '@/components/ui/progress'

interface ABTestManagerProps {
  agentId: string
}

export function ABTestManager({ agentId }: ABTestManagerProps) {
  const [tests, setTests] = useState<any[]>([])
  const [versions, setVersions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [testName, setTestName] = useState('')
  const [description, setDescription] = useState('')
  const [variantA, setVariantA] = useState('')
  const [variantB, setVariantB] = useState('')
  const [trafficSplit, setTrafficSplit] = useState(50)
  const [agent, setAgent] = useState<any>(null)
  const { toast } = useToast()

  useEffect(() => {
    loadTests()
    loadVersions()
    loadAgent()
  }, [agentId])

  const loadAgent = async () => {
    const { data } = await supabase
      .from('agents_v2')
      .select('*')
      .eq('id', agentId)
      .single()

    if (data) setAgent(data)
  }

  const loadTests = async () => {
    try {
      const { data, error } = await supabase
        .from('prompt_ab_tests')
        .select('*')
        .eq('agent_id', agentId)
        .order('created_at', { ascending: false })

      if (error) throw error
      setTests(data || [])
    } catch (error) {
      console.error('Erro ao carregar testes:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadVersions = async () => {
    const { data } = await supabase
      .from('prompt_versions')
      .select('*')
      .eq('agent_id', agentId)
      .order('version_number', { ascending: false })

    if (data) setVersions(data)
  }

  const createTest = async () => {
    if (!testName || !variantA || !variantB) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Preencha todos os campos',
        variant: 'destructive'
      })
      return
    }

    try {
      const { data: userData } = await supabase.auth.getUser()

      const { error } = await supabase
        .from('prompt_ab_tests')
        .insert({
          agent_id: agentId,
          tenant_id: agent.tenant_id,
          test_name: testName,
          description,
          variant_a_id: variantA,
          variant_b_id: variantB,
          traffic_split_percent: trafficSplit,
          status: 'draft',
          created_by: userData.user?.id
        })

      if (error) throw error

      toast({
        title: 'Teste criado',
        description: 'Teste A/B criado com sucesso'
      })

      setTestName('')
      setDescription('')
      setVariantA('')
      setVariantB('')
      setTrafficSplit(50)
      loadTests()
    } catch (error: any) {
      toast({
        title: 'Erro ao criar teste',
        description: error.message,
        variant: 'destructive'
      })
    }
  }

  const startTest = async (testId: string) => {
    try {
      const { error } = await supabase
        .from('prompt_ab_tests')
        .update({
          status: 'running',
          started_at: new Date().toISOString()
        })
        .eq('id', testId)

      if (error) throw error

      toast({
        title: 'Teste iniciado',
        description: 'O teste A/B está ativo'
      })

      loadTests()
    } catch (error: any) {
      toast({
        title: 'Erro ao iniciar teste',
        description: error.message,
        variant: 'destructive'
      })
    }
  }

  const stopTest = async (testId: string) => {
    try {
      const { error } = await supabase
        .from('prompt_ab_tests')
        .update({
          status: 'stopped',
          ended_at: new Date().toISOString()
        })
        .eq('id', testId)

      if (error) throw error

      toast({
        title: 'Teste pausado',
        description: 'O teste A/B foi pausado'
      })

      loadTests()
    } catch (error: any) {
      toast({
        title: 'Erro ao pausar teste',
        description: error.message,
        variant: 'destructive'
      })
    }
  }

  const declareWinner = async (testId: string, winner: 'a' | 'b') => {
    try {
      const { error } = await supabase
        .from('prompt_ab_tests')
        .update({
          status: 'completed',
          winner_variant: winner,
          ended_at: new Date().toISOString()
        })
        .eq('id', testId)

      if (error) throw error

      toast({
        title: 'Vencedor declarado',
        description: `Variante ${winner.toUpperCase()} foi declarada vencedora`
      })

      loadTests()
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message,
        variant: 'destructive'
      })
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <TestTube className="h-5 w-5" />
                Testes A/B de Prompts
              </CardTitle>
              <CardDescription>
                Compare diferentes versões e meça qual tem melhor performance
              </CardDescription>
            </div>

            <Dialog>
              <DialogTrigger asChild>
                <Button>
                  <TestTube className="h-4 w-4 mr-2" />
                  Novo Teste A/B
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Criar Teste A/B</DialogTitle>
                  <DialogDescription>
                    Configure um teste para comparar duas variantes de prompt
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Nome do Teste</Label>
                    <Input
                      placeholder="Ex: Teste de Tom de Voz"
                      value={testName}
                      onChange={(e) => setTestName(e.target.value)}
                    />
                  </div>

                  <div>
                    <Label>Descrição (opcional)</Label>
                    <Textarea
                      placeholder="O que você está testando..."
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      rows={2}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Variante A (Controle)</Label>
                      <Select value={variantA} onValueChange={setVariantA}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione versão" />
                        </SelectTrigger>
                        <SelectContent>
                          {versions.map((v) => (
                            <SelectItem key={v.id} value={v.id}>
                              v{v.version_number} - {v.change_description?.substring(0, 30)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label>Variante B (Teste)</Label>
                      <Select value={variantB} onValueChange={setVariantB}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione versão" />
                        </SelectTrigger>
                        <SelectContent>
                          {versions.map((v) => (
                            <SelectItem key={v.id} value={v.id}>
                              v{v.version_number} - {v.change_description?.substring(0, 30)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <Label>Divisão de Tráfego</Label>
                    <div className="flex items-center gap-4 mt-2">
                      <span className="text-sm w-16">A: {100 - trafficSplit}%</span>
                      <Slider
                        value={[trafficSplit]}
                        onValueChange={([value]) => setTrafficSplit(value)}
                        min={10}
                        max={90}
                        step={10}
                        className="flex-1"
                      />
                      <span className="text-sm w-16">B: {trafficSplit}%</span>
                    </div>
                  </div>

                  <Button onClick={createTest} className="w-full">
                    Criar Teste
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {tests.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <TestTube className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>Nenhum teste A/B criado</p>
                <p className="text-sm">Crie testes para comparar diferentes versões de prompts</p>
              </div>
            ) : (
              tests.map((test) => (
                <Card key={test.id} className="border border-border">
                  <CardContent className="p-4">
                    <div className="space-y-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold">{test.test_name}</h3>
                            <Badge variant={
                              test.status === 'running' ? 'default' :
                              test.status === 'completed' ? 'success' :
                              test.status === 'stopped' ? 'warning' :
                              'secondary'
                            }>
                              {test.status === 'running' ? 'Rodando' :
                               test.status === 'completed' ? 'Concluído' :
                               test.status === 'stopped' ? 'Pausado' :
                               'Rascunho'}
                            </Badge>
                            {test.winner_variant && (
                              <Badge variant="success">
                                <Trophy className="h-3 w-3 mr-1" />
                                Vencedor: {test.winner_variant.toUpperCase()}
                              </Badge>
                            )}
                          </div>
                          {test.description && (
                            <p className="text-sm text-muted-foreground">{test.description}</p>
                          )}
                        </div>

                        <div className="flex gap-2">
                          {test.status === 'draft' && (
                            <Button size="sm" onClick={() => startTest(test.id)}>
                              <Play className="h-4 w-4 mr-1" />
                              Iniciar
                            </Button>
                          )}
                          {test.status === 'running' && (
                            <Button size="sm" variant="outline" onClick={() => stopTest(test.id)}>
                              <Pause className="h-4 w-4 mr-1" />
                              Pausar
                            </Button>
                          )}
                        </div>
                      </div>

                      {test.status !== 'draft' && (
                        <>
                          <div className="grid grid-cols-2 gap-4">
                            {/* Variante A */}
                            <Card className="border-2 border-primary/30">
                              <CardHeader className="pb-3">
                                <CardTitle className="text-sm">Variante A</CardTitle>
                              </CardHeader>
                              <CardContent className="space-y-2">
                                <div className="flex justify-between text-sm">
                                  <span className="text-muted-foreground">Interações</span>
                                  <span className="font-mono font-semibold">{test.total_interactions_a}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                  <span className="text-muted-foreground">Tokens Médios</span>
                                  <span className="font-mono">{Math.round(test.avg_tokens_a)}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                  <span className="text-muted-foreground">Custo Médio</span>
                                  <span className="font-mono">R$ {parseFloat(test.avg_cost_a).toFixed(4)}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                  <span className="text-muted-foreground">Latência</span>
                                  <span className="font-mono">{Math.round(test.avg_latency_a)}ms</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                  <span className="text-muted-foreground">Taxa Sucesso</span>
                                  <span className="font-mono font-semibold">{test.success_rate_a}%</span>
                                </div>

                                {test.status === 'running' && !test.winner_variant && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="w-full mt-2"
                                    onClick={() => declareWinner(test.id, 'a')}
                                  >
                                    <Trophy className="h-3 w-3 mr-1" />
                                    Declarar Vencedor
                                  </Button>
                                )}
                              </CardContent>
                            </Card>

                            {/* Variante B */}
                            <Card className="border-2 border-chart-2/30">
                              <CardHeader className="pb-3">
                                <CardTitle className="text-sm">Variante B</CardTitle>
                              </CardHeader>
                              <CardContent className="space-y-2">
                                <div className="flex justify-between text-sm">
                                  <span className="text-muted-foreground">Interações</span>
                                  <span className="font-mono font-semibold">{test.total_interactions_b}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                  <span className="text-muted-foreground">Tokens Médios</span>
                                  <span className="font-mono">{Math.round(test.avg_tokens_b)}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                  <span className="text-muted-foreground">Custo Médio</span>
                                  <span className="font-mono">R$ {parseFloat(test.avg_cost_b).toFixed(4)}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                  <span className="text-muted-foreground">Latência</span>
                                  <span className="font-mono">{Math.round(test.avg_latency_b)}ms</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                  <span className="text-muted-foreground">Taxa Sucesso</span>
                                  <span className="font-mono font-semibold">{test.success_rate_b}%</span>
                                </div>

                                {test.status === 'running' && !test.winner_variant && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="w-full mt-2"
                                    onClick={() => declareWinner(test.id, 'b')}
                                  >
                                    <Trophy className="h-3 w-3 mr-1" />
                                    Declarar Vencedor
                                  </Button>
                                )}
                              </CardContent>
                            </Card>
                          </div>

                          <div>
                            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                              <span>Divisão de Tráfego</span>
                              <span>{100 - test.traffic_split_percent}% / {test.traffic_split_percent}%</span>
                            </div>
                            <Progress value={test.traffic_split_percent} className="h-2" />
                          </div>
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}