import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Activity, RefreshCw, TrendingUp, TrendingDown, Minus, AlertCircle } from 'lucide-react';
import { useSessionHealthMonitor } from '@/hooks/useSessionHealthMonitor';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useState } from 'react';

export function HealthStatusWidget() {
  const { summary, healthChecks, isMonitoring, lastCheck, runHealthCheck } = useSessionHealthMonitor();
  const [isOpen, setIsOpen] = useState(false);

  const getStatusColor = () => {
    switch (summary.status) {
      case 'healthy': return 'bg-green-500';
      case 'degraded': return 'bg-yellow-500';
      case 'critical': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusText = () => {
    switch (summary.status) {
      case 'healthy': return 'Saudável';
      case 'degraded': return 'Degradado';
      case 'critical': return 'Crítico';
      default: return 'Desconhecido';
    }
  };

  const getTrendIcon = () => {
    switch (summary.trend) {
      case 'improving': return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'degrading': return <TrendingDown className="h-4 w-4 text-red-500" />;
      default: return <Minus className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const latestCheck = healthChecks[0];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`h-3 w-3 rounded-full ${getStatusColor()} animate-pulse`} />
            <CardTitle className="text-lg">Status de Saúde das Sessões</CardTitle>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={runHealthCheck}
            disabled={isMonitoring}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isMonitoring ? 'animate-spin' : ''}`} />
            Verificar Agora
          </Button>
        </div>
        <CardDescription>
          {lastCheck ? `Última verificação: ${lastCheck.toLocaleTimeString()}` : 'Carregando...'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-1">
            <div className="text-2xl font-bold">{Math.round(summary.healthy_percentage)}%</div>
            <div className="text-xs text-muted-foreground">Saúde Geral</div>
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Badge variant={summary.status === 'healthy' ? 'default' : 'destructive'}>
                {getStatusText()}
              </Badge>
            </div>
            <div className="text-xs text-muted-foreground">Status</div>
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              {getTrendIcon()}
              <span className="text-sm capitalize">{summary.trend === 'improving' ? 'Melhorando' : summary.trend === 'degrading' ? 'Piorando' : 'Estável'}</span>
            </div>
            <div className="text-xs text-muted-foreground">Tendência</div>
          </div>
        </div>

        {summary.critical_count > 0 && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {summary.critical_count} problema{summary.critical_count > 1 ? 's' : ''} crítico{summary.critical_count > 1 ? 's' : ''} detectado{summary.critical_count > 1 ? 's' : ''}
            </AlertDescription>
          </Alert>
        )}

        {latestCheck && (
          <Collapsible open={isOpen} onOpenChange={setIsOpen}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="w-full justify-between">
                <span>Ver Detalhes</span>
                <Activity className="h-4 w-4" />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-3 mt-3">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="font-semibold">Total de Sessões</div>
                  <div className="text-muted-foreground">{latestCheck.total_sessions}</div>
                </div>
                <div>
                  <div className="font-semibold">Sessões Saudáveis</div>
                  <div className="text-green-600">{latestCheck.healthy_sessions}</div>
                </div>
                <div>
                  <div className="font-semibold">Sessões com Problemas</div>
                  <div className="text-red-600">{latestCheck.unhealthy_sessions}</div>
                </div>
                <div>
                  <div className="font-semibold">Tempo Médio de Resposta</div>
                  <div className="text-muted-foreground">
                    {latestCheck.average_response_time_ms ? `${latestCheck.average_response_time_ms}ms` : 'N/A'}
                  </div>
                </div>
              </div>

              {latestCheck.failed_sessions.length > 0 && (
                <div className="space-y-2">
                  <div className="font-semibold text-sm">Sessões com Problemas:</div>
                  <div className="space-y-1">
                    {latestCheck.failed_sessions.slice(0, 5).map((session: any, idx) => (
                      <div key={idx} className="text-xs bg-muted p-2 rounded">
                        <div className="font-medium">{session.session_name}</div>
                        <div className="text-red-600">{session.error}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {latestCheck.recommendations.length > 0 && (
                <div className="space-y-2">
                  <div className="font-semibold text-sm">Recomendações:</div>
                  <ul className="list-disc list-inside text-xs space-y-1">
                    {latestCheck.recommendations.map((rec, idx) => (
                      <li key={idx} className="text-muted-foreground">{rec}</li>
                    ))}
                  </ul>
                </div>
              )}
            </CollapsibleContent>
          </Collapsible>
        )}
      </CardContent>
    </Card>
  );
}
