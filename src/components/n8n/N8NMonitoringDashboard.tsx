import { useState } from 'react';
import { useN8NMonitoring } from '@/hooks/useN8NMonitoring';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Activity, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  TrendingUp, 
  AlertTriangle,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';
import { AreaChart, Area, LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import type { N8NExecutionLog } from '@/types/n8n';
import { format } from 'date-fns';
import { ExecutionDetailsModal } from './ExecutionDetailsModal';

export function N8NMonitoringDashboard() {
  const [timeRange, setTimeRange] = useState<'24h' | '7d' | '30d'>('24h');
  const { data, loading, error, refetch } = useN8NMonitoring(timeRange);
  const [selectedExecution, setSelectedExecution] = useState<N8NExecutionLog | null>(null);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);

  const handleViewDetails = (execution: N8NExecutionLog) => {
    setSelectedExecution(execution);
    setDetailsModalOpen(true);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-destructive/30">
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 text-destructive">
            <XCircle className="h-5 w-5" />
            <p>Erro ao carregar dados: {error}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const stats = data?.stats || {
    total_workflows: 0,
    active_workflows: 0,
    total_executions: 0,
    success_rate: 0,
    avg_execution_time_ms: 0,
  };

  const chartConfig = {
    success: {
      label: 'Sucesso',
      color: 'hsl(var(--success))',
    },
    failed: {
      label: 'Falha',
      color: 'hsl(var(--destructive))',
    },
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Monitoramento N8N</h1>
          <p className="text-muted-foreground">
            Visão completa de workflows e execuções
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Tabs value={timeRange} onValueChange={(v) => setTimeRange(v as typeof timeRange)}>
            <TabsList>
              <TabsTrigger value="24h">24h</TabsTrigger>
              <TabsTrigger value="7d">7d</TabsTrigger>
              <TabsTrigger value="30d">30d</TabsTrigger>
            </TabsList>
          </Tabs>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Workflows Totais</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total_workflows}</div>
            <p className="text-xs text-muted-foreground">
              {stats.active_workflows} ativos ({Math.round((stats.active_workflows / stats.total_workflows) * 100)}%)
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Execuções</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total_executions}</div>
            <p className="text-xs text-muted-foreground">
              Últimas {timeRange === '24h' ? '24 horas' : timeRange === '7d' ? '7 dias' : '30 dias'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Taxa de Sucesso</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">
              {stats.success_rate?.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">
              {Math.round(stats.total_executions - (stats.total_executions * stats.success_rate / 100))} falhas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Tempo Médio</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.avg_execution_time_ms?.toFixed(0)}ms</div>
            <p className="text-xs text-muted-foreground">
              Por execução
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Execution Trends */}
        <Card>
          <CardHeader>
            <CardTitle>Execuções ao Longo do Tempo</CardTitle>
            <CardDescription>Sucesso vs Falhas</CardDescription>
          </CardHeader>
          <CardContent>
            {data?.trends && data.trends.length > 0 ? (
              <ChartContainer config={chartConfig} className="h-[300px]">
                <AreaChart data={data.trends}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis 
                    dataKey="date" 
                    className="text-xs"
                    tickFormatter={(value) => format(new Date(value), 'dd/MM')}
                  />
                  <YAxis className="text-xs" />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Area
                    type="monotone"
                    dataKey="success"
                    stackId="1"
                    stroke="hsl(var(--success))"
                    fill="hsl(var(--success))"
                    fillOpacity={0.6}
                  />
                  <Area
                    type="monotone"
                    dataKey="failed"
                    stackId="1"
                    stroke="hsl(var(--destructive))"
                    fill="hsl(var(--destructive))"
                    fillOpacity={0.6}
                  />
                </AreaChart>
              </ChartContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                Nenhum dado disponível
              </div>
            )}
          </CardContent>
        </Card>

        {/* Average Execution Time */}
        <Card>
          <CardHeader>
            <CardTitle>Tempo Médio de Execução</CardTitle>
            <CardDescription>Workflows mais lentos</CardDescription>
          </CardHeader>
          <CardContent>
            {data?.problematic_workflows && data.problematic_workflows.length > 0 ? (
              <ChartContainer config={chartConfig} className="h-[300px]">
                <BarChart data={data.problematic_workflows.slice(0, 5)}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis 
                    dataKey="workflow_name" 
                    className="text-xs"
                    angle={-45}
                    textAnchor="end"
                    height={100}
                  />
                  <YAxis className="text-xs" label={{ value: 'Taxa de Erro (%)', angle: -90, position: 'insideLeft' }} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar 
                    dataKey="error_rate" 
                    fill="hsl(var(--warning))" 
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ChartContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                Nenhum workflow com problemas 🎉
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Problematic Workflows */}
      {data?.problematic_workflows && data.problematic_workflows.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-warning" />
                  Workflows com Problemas
                </CardTitle>
                <CardDescription>
                  Workflows que requerem atenção
                </CardDescription>
              </div>
              <Badge variant="outline">{data.problematic_workflows.length}</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.problematic_workflows.map((workflow) => {
                const errorRate = workflow.error_rate || 0;
                const isCritical = errorRate > 50;
                const isWarning = errorRate > 30;

                return (
                  <div
                    key={workflow.workflow_id}
                    className={`p-4 rounded-lg border transition-smooth ${
                      isCritical
                        ? 'border-destructive/30 bg-destructive/5'
                        : isWarning
                        ? 'border-warning/30 bg-warning/5'
                        : 'border-border bg-muted/50'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold">{workflow.workflow_name}</h4>
                          <Badge
                            variant={isCritical ? 'destructive' : 'secondary'}
                            className={isWarning && !isCritical ? 'bg-warning/10 text-warning' : ''}
                          >
                            {errorRate.toFixed(0)}% erro
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {workflow.failed_executions} falhas em {workflow.total_executions} execuções
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm">
                          Ver Logs
                        </Button>
                        <Button variant="outline" size="sm">
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Logs */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Logs Recentes de Execução</CardTitle>
              <CardDescription>Últimas execuções registradas</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {data?.recent_logs && data.recent_logs.length > 0 ? (
            <div className="space-y-2">
              {data.recent_logs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/50 transition-smooth cursor-pointer"
                  onClick={() => handleViewDetails(log)}
                >
                  <div className="flex items-center gap-3 flex-1">
                    {log.execution_status === 'success' ? (
                      <CheckCircle2 className="h-4 w-4 text-success flex-shrink-0" />
                    ) : (
                      <XCircle className="h-4 w-4 text-destructive flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">
                        Workflow ID: {log.workflow_id}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(log.started_at), 'dd/MM/yyyy HH:mm:ss')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {log.execution_time_ms && (
                      <Badge variant="outline" className="font-mono">
                        {log.execution_time_ms}ms
                      </Badge>
                    )}
                    <Button variant="ghost" size="sm">
                      Ver Detalhes
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Nenhuma execução recente</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Execution Details Modal */}
      <ExecutionDetailsModal
        executionLog={selectedExecution}
        open={detailsModalOpen}
        onOpenChange={setDetailsModalOpen}
      />
    </div>
  );
}
