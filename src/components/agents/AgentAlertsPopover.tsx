import { Bell, X, AlertTriangle, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { useAgentAlerts } from '@/hooks/useAgentAlerts'
import { ScrollArea } from '@/components/ui/scroll-area'

export function AgentAlertsPopover() {
  const { alerts, hasAlerts, criticalCount, errorCount, clearAlert, clearAllAlerts } = useAgentAlerts()

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {hasAlerts && (
            <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-destructive text-destructive-foreground text-xs flex items-center justify-center animate-pulse">
              {alerts.length}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0" align="end">
        <div className="flex items-center justify-between border-b border-border p-4">
          <div>
            <h3 className="font-semibold">Alertas de Agentes</h3>
            <p className="text-xs text-muted-foreground">
              {criticalCount} críticos, {errorCount} erros
            </p>
          </div>
          {hasAlerts && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearAllAlerts}
              className="text-xs"
            >
              Limpar todos
            </Button>
          )}
        </div>

        <ScrollArea className="h-96">
          {hasAlerts ? (
            <div className="divide-y divide-border">
              {alerts.map((alert) => (
                <div
                  key={alert.id}
                  className="p-4 hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <div className={`mt-1 ${
                      alert.severity === 'critical' ? 'text-red-500' :
                      'text-orange-500'
                    }`}>
                      {alert.severity === 'critical' ? (
                        <XCircle className="h-5 w-5" />
                      ) : (
                        <AlertTriangle className="h-5 w-5" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <p className="font-medium text-sm truncate">
                          {alert.agent_name}
                        </p>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 shrink-0"
                          onClick={() => clearAlert(alert.id)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        {alert.message}
                      </p>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={alert.severity === 'critical' ? 'destructive' : 'warning'}
                          className="text-xs"
                        >
                          {alert.event_type.replace(/_/g, ' ').toUpperCase()}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {new Date(alert.created_at).toLocaleString('pt-BR')}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full py-12">
              <Bell className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground text-sm">
                Nenhum alerta no momento
              </p>
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  )
}
