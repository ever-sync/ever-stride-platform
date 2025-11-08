import { useState } from 'react';
import { Bell, AlertTriangle, AlertCircle, Info, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useN8NMonitoring } from '@/hooks/useN8NMonitoring';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface Alert {
  id: string;
  severity: 'critical' | 'warning' | 'info';
  workflow_id: string;
  workflow_name: string;
  message: string;
  timestamp: string;
}

export function N8NAlerts() {
  const { data } = useN8NMonitoring('24h');
  const navigate = useNavigate();
  const [dismissedAlerts, setDismissedAlerts] = useState<string[]>([]);

  const alerts: Alert[] = [];

  if (data?.problematic_workflows) {
    data.problematic_workflows.forEach(workflow => {
      const errorRate = workflow.error_rate || 0;
      
      if (errorRate > 50) {
        alerts.push({
          id: `critical-${workflow.workflow_id}`,
          severity: 'critical',
          workflow_id: workflow.workflow_id,
          workflow_name: workflow.workflow_name,
          message: `Taxa de erro crítica: ${errorRate.toFixed(0)}% (${workflow.failed_executions}/${workflow.total_executions} falhas)`,
          timestamp: new Date().toISOString(),
        });
      } else if (errorRate > 30) {
        alerts.push({
          id: `warning-${workflow.workflow_id}`,
          severity: 'warning',
          workflow_id: workflow.workflow_id,
          workflow_name: workflow.workflow_name,
          message: `Taxa de erro elevada: ${errorRate.toFixed(0)}% (${workflow.failed_executions} falhas)`,
          timestamp: new Date().toISOString(),
        });
      }
    });
  }

  const activeAlerts = alerts.filter(alert => !dismissedAlerts.includes(alert.id));
  const criticalCount = activeAlerts.filter(a => a.severity === 'critical').length;
  const warningCount = activeAlerts.filter(a => a.severity === 'warning').length;
  const totalCount = activeAlerts.length;

  const dismissAlert = (alertId: string) => {
    setDismissedAlerts(prev => [...prev, alertId]);
  };

  const getSeverityIcon = (severity: Alert['severity']) => {
    switch (severity) {
      case 'critical':
        return <AlertTriangle className="h-4 w-4 text-destructive" />;
      case 'warning':
        return <AlertCircle className="h-4 w-4 text-warning" />;
      case 'info':
        return <Info className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getSeverityBadgeClass = (severity: Alert['severity']) => {
    switch (severity) {
      case 'critical':
        return 'bg-destructive/10 text-destructive hover:bg-destructive/20';
      case 'warning':
        return 'bg-warning/10 text-warning hover:bg-warning/20';
      case 'info':
        return 'bg-muted text-muted-foreground hover:bg-muted';
    }
  };

  if (totalCount === 0) return null;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative h-9 w-9"
        >
          <Bell className="h-5 w-5" />
          {totalCount > 0 && (
            <Badge 
              variant="destructive" 
              className={cn(
                "absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs",
                criticalCount > 0 ? "animate-pulse" : ""
              )}
            >
              {totalCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0" align="end">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            <h3 className="font-semibold">Alertas N8N</h3>
          </div>
          <div className="flex items-center gap-1">
            {criticalCount > 0 && (
              <Badge variant="destructive" className="text-xs">
                {criticalCount} crítico{criticalCount > 1 ? 's' : ''}
              </Badge>
            )}
            {warningCount > 0 && (
              <Badge className={getSeverityBadgeClass('warning')}>
                {warningCount} aviso{warningCount > 1 ? 's' : ''}
              </Badge>
            )}
          </div>
        </div>

        <ScrollArea className="h-[400px]">
          <div className="p-2">
            {activeAlerts.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Nenhum alerta no momento</p>
              </div>
            ) : (
              <div className="space-y-2">
                {activeAlerts.map((alert) => (
                  <div
                    key={alert.id}
                    className={cn(
                      "p-3 rounded-lg border transition-smooth",
                      alert.severity === 'critical' && "border-destructive/30 bg-destructive/5",
                      alert.severity === 'warning' && "border-warning/30 bg-warning/5",
                      alert.severity === 'info' && "border-border bg-muted/50"
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5">{getSeverityIcon(alert.severity)}</div>
                      <div className="flex-1 space-y-1">
                        <div className="flex items-start justify-between gap-2">
                          <p className="font-medium text-sm">{alert.workflow_name}</p>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-5 w-5 -mr-1 -mt-1"
                            onClick={() => dismissAlert(alert.id)}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                        <p className="text-xs text-muted-foreground">{alert.message}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() => navigate('/n8n-monitoring')}
                          >
                            Ver Logs
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() => navigate('/integrations')}
                          >
                            Investigar
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </ScrollArea>

        <Separator />
        
        <div className="p-3 bg-muted/50">
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-xs"
            onClick={() => navigate('/n8n-monitoring')}
          >
            Ver Dashboard Completo
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
