import { useState, useEffect } from 'react'
import { AppShell } from '@/components/AppShell'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { BarChart, Bar, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { TrendingUp, DollarSign, Zap, Clock, Activity } from 'lucide-react'

export default function AgentComparison() {
  const [agents, setAgents] = useState<any[]>([])
  const [selectedAgents, setSelectedAgents] = useState<string[]>([])
  const [comparisonData, setComparisonData] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    loadAgents()
  }, [])

  useEffect(() => {
    if (selectedAgents.length >= 2) {
      loadComparison()
    }
  }, [selectedAgents])

  const loadAgents = async () => {
    const { data } = await supabase
      .from('agents_v2')
      .select('*')
      .eq('status', 'active')
      .order('nome')

    if (data) setAgents(data)
  }

  const loadComparison = async () => {
    setLoading(true)
    try {
      const comparisons = await Promise.all(
        selectedAgents.map(async (agentId) => {
          // Buscar métricas dos últimos 30 dias
          const { data: events } = await supabase
            .from('agent_events')
            .select('*')
            .eq('agent_id', agentId)
            .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())

          const agent = agents.find(a => a.id === agentId)

          const totalTokens = events?.reduce((sum, e) => sum + (e.tokens_used || 0), 0) || 0
          const totalCost = events?.reduce((sum, e) => sum + (parseFloat(String(e.custo_brl || 0))), 0) || 0
          const avgLatency = events && events.length > 0
            ? Math.round(events.reduce((sum, e) => sum + (e.latencia_ms || 0), 0) / events.length)
            : 0
          const errorCount = events?.filter(e => e.severity === 'error' || e.severity === 'critical').length || 0
          const successRate = events && events.length > 0
            ? parseFloat(((events.length - errorCount) / events.length * 100).toFixed(1))
            : 100

          // Calcular health score
          const { data: healthData } = await supabase
            .rpc('calculate_agent_health_score', { p_agent_id: agentId })

          return {
            name: agent?.nome || 'Agente',
            agentId,
            tokens: totalTokens,
            custo: parseFloat(totalCost.toFixed(2)),
            latency: avgLatency,
            messages: events?.length || 0,
            errors: errorCount,
            successRate,
            healthScore: healthData || 0
          }
        })
      )

      setComparisonData(comparisons)
    } catch (error) {
      console.error('Erro ao carregar comparação:', error)
    } finally {
      setLoading(false)
    }
  }

  const radarData = comparisonData.length >= 2 ? [
    {
      metric: 'Health Score',
      ...Object.fromEntries(comparisonData.map((a, i) => [`agent${i + 1}`, a.healthScore]))
    },
    {
      metric: 'Taxa Sucesso',
      ...Object.fromEntries(comparisonData.map((a, i) => [`agent${i + 1}`, a.successRate]))
    },
    {
      metric: 'Performance',
      ...Object.fromEntries(comparisonData.map((a, i) => [`agent${i + 1}`, Math.max(0, 100 - (a.latency / 10))]))
    },
    {
      metric: 'Eficiência',
      ...Object.fromEntries(comparisonData.map((a, i) => [`agent${i + 1}`, Math.min(100, (a.messages / (a.custo || 1)) * 10)]))
    }
  ] : []

  return (
    <AppShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Comparação de Agentes</h1>
          <p className="text-muted-foreground">Compare performance, custos e health scores lado a lado</p>
        </div>

        {/* Seleção de Agentes */}
        <Card>
          <CardHeader>
            <CardTitle>Selecionar Agentes</CardTitle>
            <CardDescription>Escolha 2 ou mais agentes para comparar (máximo 4)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 gap-4">
              {[0, 1, 2, 3].map((index) => (
                <div key={index}>
                  <label className="text-sm font-medium mb-2 block">
                    Agente {index + 1}
                  </label>
                  <Select
                    value={selectedAgents[index] || ''}
                    onValueChange={(value) => {
                      const newSelected = [...selectedAgents]
                      newSelected[index] = value
                      setSelectedAgents(newSelected.filter(Boolean))
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      {agents
                        .filter(a => !selectedAgents.includes(a.id) || selectedAgents[index] === a.id)
                        .map((agent) => (
                          <SelectItem key={agent.id} value={agent.id}>
                            {agent.nome}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {loading && (
          <Card>
            <CardContent className="py-12">
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            </CardContent>
          </Card>
        )}

        {!loading && comparisonData.length >= 2 && (
          <>
            {/* Radar Chart - Visão Geral */}
            <Card>
              <CardHeader>
                <CardTitle>Visão Geral Comparativa</CardTitle>
                <CardDescription>Performance normalizada em múltiplas métricas</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <RadarChart data={radarData}>
                    <PolarGrid className="stroke-muted" />
                    <PolarAngleAxis 
                      dataKey="metric" 
                      tick={{ fill: 'hsl(var(--foreground))' }}
                    />
                    <PolarRadiusAxis angle={90} domain={[0, 100]} />
                    {comparisonData.map((_, i) => (
                      <Radar
                        key={i}
                        name={comparisonData[i].name}
                        dataKey={`agent${i + 1}`}
                        stroke={`hsl(${i * 120}, 70%, 50%)`}
                        fill={`hsl(${i * 120}, 70%, 50%)`}
                        fillOpacity={0.3}
                      />
                    ))}
                    <Legend />
                  </RadarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Comparação de Métricas */}
            <div className="grid grid-cols-2 gap-6">
              {/* Tokens */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Consumo de Tokens
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={comparisonData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="name" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                      <YAxis tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))'
                        }}
                      />
                      <Bar dataKey="tokens" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Custos */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5" />
                    Custos (R$)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={comparisonData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="name" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                      <YAxis tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))'
                        }}
                        formatter={(value: any) => `R$ ${value}`}
                      />
                      <Bar dataKey="custo" fill="hsl(var(--chart-2))" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Latência */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    Latência Média (ms)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={comparisonData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="name" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                      <YAxis tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))'
                        }}
                      />
                      <Bar dataKey="latency" fill="hsl(var(--chart-3))" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Health Score */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5" />
                    Health Score
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={comparisonData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="name" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                      <YAxis domain={[0, 100]} tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))'
                        }}
                      />
                      <Bar dataKey="healthScore" fill="hsl(var(--chart-4))" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            {/* Tabela Detalhada */}
            <Card>
              <CardHeader>
                <CardTitle>Comparação Detalhada</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-3 px-4 font-medium">Métrica</th>
                        {comparisonData.map((agent) => (
                          <th key={agent.agentId} className="text-left py-3 px-4 font-medium">
                            {agent.name}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-border">
                        <td className="py-3 px-4 text-muted-foreground">Tokens Totais</td>
                        {comparisonData.map((agent) => (
                          <td key={agent.agentId} className="py-3 px-4 font-mono">
                            {agent.tokens.toLocaleString('pt-BR')}
                          </td>
                        ))}
                      </tr>
                      <tr className="border-b border-border">
                        <td className="py-3 px-4 text-muted-foreground">Custo Total</td>
                        {comparisonData.map((agent) => (
                          <td key={agent.agentId} className="py-3 px-4 font-mono">
                            R$ {agent.custo}
                          </td>
                        ))}
                      </tr>
                      <tr className="border-b border-border">
                        <td className="py-3 px-4 text-muted-foreground">Mensagens</td>
                        {comparisonData.map((agent) => (
                          <td key={agent.agentId} className="py-3 px-4 font-mono">
                            {agent.messages}
                          </td>
                        ))}
                      </tr>
                      <tr className="border-b border-border">
                        <td className="py-3 px-4 text-muted-foreground">Latência Média</td>
                        {comparisonData.map((agent) => (
                          <td key={agent.agentId} className="py-3 px-4 font-mono">
                            {agent.latency}ms
                          </td>
                        ))}
                      </tr>
                      <tr className="border-b border-border">
                        <td className="py-3 px-4 text-muted-foreground">Taxa de Sucesso</td>
                        {comparisonData.map((agent) => (
                          <td key={agent.agentId} className="py-3 px-4">
                            <Badge variant={agent.successRate >= 95 ? 'success' : agent.successRate >= 80 ? 'warning' : 'destructive'}>
                              {agent.successRate}%
                            </Badge>
                          </td>
                        ))}
                      </tr>
                      <tr className="border-b border-border">
                        <td className="py-3 px-4 text-muted-foreground">Health Score</td>
                        {comparisonData.map((agent) => (
                          <td key={agent.agentId} className="py-3 px-4">
                            <Badge variant={agent.healthScore >= 80 ? 'success' : agent.healthScore >= 50 ? 'warning' : 'destructive'}>
                              {agent.healthScore}/100
                            </Badge>
                          </td>
                        ))}
                      </tr>
                      <tr>
                        <td className="py-3 px-4 text-muted-foreground">Custo por Mensagem</td>
                        {comparisonData.map((agent) => (
                          <td key={agent.agentId} className="py-3 px-4 font-mono">
                            R$ {agent.messages > 0 ? (agent.custo / agent.messages).toFixed(4) : '0.0000'}
                          </td>
                        ))}
                      </tr>
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </AppShell>
  )
}