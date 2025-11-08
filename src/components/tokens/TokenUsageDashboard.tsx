import { useTokenUsage } from '@/hooks/useTokenUsage'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { AlertTriangle, TrendingUp, Zap, DollarSign } from 'lucide-react'

interface TokenUsageDashboardProps {
  clientId: string
}

export function TokenUsageDashboard({ clientId }: TokenUsageDashboardProps) {
  const { usage, limite, stats, loading } = useTokenUsage(clientId)

  if (loading) {
    return <div className="text-center py-12">Carregando...</div>
  }

  const percentualUso = limite 
    ? (limite.tokens_usados_mes / limite.limite_tokens_mes) * 100 
    : 0

  const getAlertLevel = () => {
    if (percentualUso >= 100) return { color: 'destructive', icon: AlertTriangle, text: 'Limite Atingido!' }
    if (percentualUso >= 90) return { color: 'destructive', icon: AlertTriangle, text: 'Atenção: 90% usado' }
    if (percentualUso >= 80) return { color: 'warning', icon: AlertTriangle, text: 'Aviso: 80% usado' }
    return { color: 'success', icon: TrendingUp, text: 'Uso Normal' }
  }

  const alertLevel = getAlertLevel()

  // Preparar dados para gráfico (últimas 7 entradas)
  const chartData = usage.slice(0, 7).reverse().map(u => ({
    data: new Date(u.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
    tokens: u.tokens_total,
    custo: u.custo_total_brl
  }))

  return (
    <div className="space-y-6">
      {/* Alerta de Limite */}
      {percentualUso >= 80 && (
        <Alert variant={alertLevel.color as any}>
          <alertLevel.icon className="h-4 w-4" />
          <AlertTitle>{alertLevel.text}</AlertTitle>
          <AlertDescription>
            {percentualUso >= 100 
              ? 'Você atingiu o limite mensal. O agente foi pausado automaticamente.'
              : `Você já usou ${percentualUso.toFixed(0)}% do seu limite mensal. Considere fazer upgrade do plano.`
            }
          </AlertDescription>
        </Alert>
      )}

      {/* Cards de Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Tokens Usados</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <p className="text-3xl font-bold">
                {((limite?.tokens_usados_mes || 0) / 1000).toFixed(1)}k
              </p>
              <p className="text-sm text-muted-foreground">
                / {((limite?.limite_tokens_mes || 0) / 1000).toFixed(0)}k
              </p>
            </div>
            <Progress value={percentualUso} className="mt-2" />
            <p className="text-xs text-muted-foreground mt-1">
              {percentualUso.toFixed(1)}% do limite
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Custo Total (Mês)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-1">
              <DollarSign className="h-5 w-5 text-muted-foreground" />
              <p className="text-3xl font-bold">
                {(limite?.custo_brl_usado_mes || 0).toFixed(2)}
              </p>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Limite: R$ {(limite?.limite_custo_brl_mes || 0).toFixed(2)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Conversas</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">
              {stats?.total_conversas || 0}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Custo médio: R$ {(stats?.custo_medio_conversa || 0).toFixed(4)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Modelo Mais Usado</CardDescription>
          </CardHeader>
          <CardContent>
            <Badge variant="outline" className="text-xs">
              {stats?.modelo_mais_usado || 'N/A'}
            </Badge>
            <p className="text-xs text-muted-foreground mt-2">
              <Zap className="h-3 w-3 inline mr-1" />
              Latência média: {usage.length > 0 
                ? Math.round(usage.reduce((sum, u) => sum + (u.latencia_ms || 0), 0) / usage.length)
                : 0
              }ms
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Gráfico de Uso */}
      <Card>
        <CardHeader>
          <CardTitle>Histórico de Uso (Últimas 7 conversas)</CardTitle>
        </CardHeader>
        <CardContent>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="data" />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" />
                <Tooltip />
                <Line 
                  yAxisId="left"
                  type="monotone" 
                  dataKey="tokens" 
                  stroke="hsl(var(--primary))" 
                  name="Tokens"
                  strokeWidth={2}
                />
                <Line 
                  yAxisId="right"
                  type="monotone" 
                  dataKey="custo" 
                  stroke="hsl(var(--chart-2))" 
                  name="Custo (R$)"
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              Nenhum dado disponível ainda
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tabela de Uso Detalhado */}
      <Card>
        <CardHeader>
          <CardTitle>Detalhamento de Uso</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2">Data/Hora</th>
                  <th className="text-left py-2">Modelo</th>
                  <th className="text-right py-2">Tokens</th>
                  <th className="text-right py-2">Custo</th>
                  <th className="text-right py-2">Latência</th>
                  <th className="text-center py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {usage.slice(0, 20).map((u) => (
                  <tr key={u.id} className="border-b hover:bg-muted/50">
                    <td className="py-2">
                      {new Date(u.created_at).toLocaleString('pt-BR')}
                    </td>
                    <td className="py-2">
                      <Badge variant="outline" className="text-xs">
                        {u.modelo}
                      </Badge>
                    </td>
                    <td className="text-right py-2">{u.tokens_total}</td>
                    <td className="text-right py-2">
                      R$ {u.custo_total_brl.toFixed(4)}
                    </td>
                    <td className="text-right py-2">{u.latencia_ms}ms</td>
                    <td className="text-center py-2">
                      {u.sucesso ? (
                        <Badge variant="success" className="text-xs">✓</Badge>
                      ) : (
                        <Badge variant="destructive" className="text-xs">✗</Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
