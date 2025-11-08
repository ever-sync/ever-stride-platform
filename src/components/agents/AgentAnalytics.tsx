import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { TrendingUp, DollarSign, Clock, Zap } from 'lucide-react'

interface AgentAnalyticsProps {
  agentId: string
}

export function AgentAnalytics({ agentId }: AgentAnalyticsProps) {
  const [loading, setLoading] = useState(true)
  const [tokensData, setTokensData] = useState<any[]>([])
  const [costData, setCostData] = useState<any[]>([])
  const [latencyData, setLatencyData] = useState<any[]>([])
  const [summary, setSummary] = useState<any>({})

  useEffect(() => {
    loadAnalytics()
  }, [agentId])

  const loadAnalytics = async () => {
    try {
      setLoading(true)

      // Buscar eventos dos últimos 30 dias agrupados por dia
      const { data: events, error } = await supabase
        .from('agent_events')
        .select('*')
        .eq('agent_id', agentId)
        .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: true })

      if (error) throw error

      // Agrupar por dia
      const grouped = events.reduce((acc: any, event: any) => {
        const date = new Date(event.created_at).toLocaleDateString('pt-BR')
        if (!acc[date]) {
          acc[date] = {
            date,
            tokens: 0,
            custo: 0,
            latency: [],
            count: 0
          }
        }
        
        acc[date].tokens += event.tokens_used || 0
        acc[date].custo += parseFloat(event.custo_brl || 0)
        if (event.latencia_ms) acc[date].latency.push(event.latencia_ms)
        acc[date].count++
        
        return acc
      }, {})

      // Converter para arrays
      const dataArray = Object.values(grouped).map((item: any) => ({
        date: item.date,
        tokens: item.tokens,
        custo: parseFloat(item.custo.toFixed(4)),
        latencyAvg: item.latency.length > 0 
          ? Math.round(item.latency.reduce((a: number, b: number) => a + b, 0) / item.latency.length)
          : 0,
        count: item.count
      }))

      setTokensData(dataArray)
      setCostData(dataArray)
      setLatencyData(dataArray)

      // Calcular resumo
      const totalTokens = dataArray.reduce((sum, item) => sum + item.tokens, 0)
      const totalCost = dataArray.reduce((sum, item) => sum + item.custo, 0)
      const avgLatency = dataArray.length > 0
        ? Math.round(dataArray.reduce((sum, item) => sum + item.latencyAvg, 0) / dataArray.length)
        : 0

      setSummary({
        totalTokens,
        totalCost: totalCost.toFixed(2),
        avgLatency,
        totalMessages: dataArray.reduce((sum, item) => sum + item.count, 0)
      })

    } catch (error) {
      console.error('Erro ao carregar analytics:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Cards de Resumo */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              Total Tokens
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.totalTokens?.toLocaleString('pt-BR')}</div>
            <p className="text-xs text-muted-foreground mt-1">Últimos 30 dias</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-primary" />
              Custo Total
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">R$ {summary.totalCost}</div>
            <p className="text-xs text-muted-foreground mt-1">Últimos 30 dias</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" />
              Latência Média
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.avgLatency}ms</div>
            <p className="text-xs text-muted-foreground mt-1">Últimos 30 dias</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Zap className="h-4 w-4 text-primary" />
              Mensagens
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.totalMessages?.toLocaleString('pt-BR')}</div>
            <p className="text-xs text-muted-foreground mt-1">Últimos 30 dias</p>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos */}
      <Tabs defaultValue="tokens">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="tokens">Tokens</TabsTrigger>
          <TabsTrigger value="cost">Custos</TabsTrigger>
          <TabsTrigger value="latency">Latência</TabsTrigger>
        </TabsList>

        <TabsContent value="tokens" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Evolução de Tokens</CardTitle>
              <CardDescription>Consumo diário de tokens nos últimos 30 dias</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <AreaChart data={tokensData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="date" 
                    className="text-xs"
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <YAxis 
                    className="text-xs"
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="tokens" 
                    stroke="hsl(var(--primary))" 
                    fill="hsl(var(--primary))"
                    fillOpacity={0.3}
                    name="Tokens"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cost" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Evolução de Custos</CardTitle>
              <CardDescription>Custo diário em R$ nos últimos 30 dias</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={costData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="date"
                    className="text-xs"
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <YAxis 
                    className="text-xs"
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                    formatter={(value: any) => [`R$ ${value}`, 'Custo']}
                  />
                  <Bar 
                    dataKey="custo" 
                    fill="hsl(var(--primary))"
                    name="Custo (R$)"
                    radius={[8, 8, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="latency" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Latência de Resposta</CardTitle>
              <CardDescription>Tempo médio de resposta por dia (ms)</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <LineChart data={latencyData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="date"
                    className="text-xs"
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <YAxis 
                    className="text-xs"
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                    formatter={(value: any) => [`${value}ms`, 'Latência']}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="latencyAvg" 
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    dot={{ fill: 'hsl(var(--primary))' }}
                    name="Latência Média"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}