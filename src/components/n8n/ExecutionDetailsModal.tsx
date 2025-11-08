import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Check, X, Clock, AlertTriangle, ExternalLink, PlayCircle } from 'lucide-react';
import type { N8NExecutionLog } from '@/types/n8n';
import { format } from 'date-fns';

interface ExecutionDetailsModalProps {
  executionLog: N8NExecutionLog | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ExecutionDetailsModal({ executionLog, open, onOpenChange }: ExecutionDetailsModalProps) {
  if (!executionLog) return null;

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <Check className="h-4 w-4 text-success" />;
      case 'failed':
      case 'error':
        return <X className="h-4 w-4 text-destructive" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'success':
        return <Badge className="bg-success text-success-foreground">Sucesso</Badge>;
      case 'failed':
      case 'error':
        return <Badge variant="destructive">Falha</Badge>;
      case 'running':
        return <Badge variant="secondary">Executando</Badge>;
      case 'waiting':
        return <Badge variant="outline">Aguardando</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const formatTimestamp = (timestamp: string) => {
    try {
      return format(new Date(timestamp), 'dd/MM/yyyy HH:mm:ss');
    } catch {
      return timestamp;
    }
  };

  const handleEditInN8N = () => {
    const n8nUrl = import.meta.env.VITE_N8N_URL || 'http://localhost:5678';
    window.open(`${n8nUrl}/workflow/${executionLog.workflow_id}`, '_blank');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <DialogTitle className="flex items-center gap-2">
                {getStatusIcon(executionLog.execution_status)}
                Detalhes da Execução
              </DialogTitle>
              <DialogDescription>
                ID: {executionLog.execution_id}
              </DialogDescription>
            </div>
            {getStatusBadge(executionLog.execution_status)}
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 -mx-6 px-6">
          <div className="space-y-6 pb-6">
            {/* Informações básicas */}
            <Card className="p-4 border-border">
              <h3 className="font-semibold text-sm mb-3">Informações Gerais</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground text-xs mb-1">Modo de Execução</p>
                  <p className="font-mono">{executionLog.execution_mode || 'webhook'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs mb-1">Tempo de Execução</p>
                  <p className="font-mono">{executionLog.execution_time_ms || 0}ms</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs mb-1">Iniciado em</p>
                  <p className="font-mono text-xs">{formatTimestamp(executionLog.started_at)}</p>
                </div>
                {executionLog.finished_at && (
                  <div>
                    <p className="text-muted-foreground text-xs mb-1">Finalizado em</p>
                    <p className="font-mono text-xs">{formatTimestamp(executionLog.finished_at)}</p>
                  </div>
                )}
              </div>
            </Card>

            {/* Nós executados */}
            {executionLog.nodes_executed && (
              <Card className="p-4 border-border">
                <h3 className="font-semibold text-sm mb-3">
                  Timeline de Execução ({executionLog.total_nodes || 0} nós)
                </h3>
                <div className="space-y-2">
                  {Object.entries(executionLog.nodes_executed as Record<string, any>).map(([nodeName, nodeData]: [string, any]) => (
                    <div key={nodeName} className="flex items-start gap-3 p-2 rounded-lg bg-muted/50">
                      <div className="mt-1">
                        {nodeData.error ? (
                          <X className="h-4 w-4 text-destructive" />
                        ) : (
                          <Check className="h-4 w-4 text-success" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{nodeName}</p>
                        {nodeData.executionTime && (
                          <p className="text-xs text-muted-foreground">{nodeData.executionTime}ms</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Dados de entrada */}
            {executionLog.input_data && (
              <Card className="p-4 border-border">
                <h3 className="font-semibold text-sm mb-3">Dados de Entrada</h3>
                <div className="bg-muted rounded-md p-3 overflow-x-auto">
                  <pre className="text-xs font-mono">
                    {JSON.stringify(executionLog.input_data, null, 2)}
                  </pre>
                </div>
              </Card>
            )}

            {/* Dados de saída */}
            {executionLog.output_data && (
              <Card className="p-4 border-border">
                <h3 className="font-semibold text-sm mb-3">Dados de Saída</h3>
                <div className="bg-muted rounded-md p-3 overflow-x-auto">
                  <pre className="text-xs font-mono">
                    {JSON.stringify(executionLog.output_data, null, 2)}
                  </pre>
                </div>
              </Card>
            )}

            {/* Erro */}
            {executionLog.error_message && (
              <Card className="p-4 border-destructive/30 bg-destructive/5">
                <div className="flex items-start gap-2 mb-3">
                  <AlertTriangle className="h-4 w-4 text-destructive mt-0.5" />
                  <h3 className="font-semibold text-sm text-destructive">Erro Detectado</h3>
                </div>
                
                <div className="space-y-3">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Mensagem de Erro</p>
                    <p className="text-sm font-mono bg-background/50 p-2 rounded">
                      {executionLog.error_message}
                    </p>
                  </div>

                  {executionLog.failed_node && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Nó que Falhou</p>
                      <Badge variant="outline" className="font-mono">
                        {executionLog.failed_node}
                      </Badge>
                    </div>
                  )}

                  {executionLog.error_stack && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Stack Trace</p>
                      <div className="bg-background/50 rounded-md p-3 overflow-x-auto max-h-48">
                        <pre className="text-xs font-mono text-muted-foreground">
                          {executionLog.error_stack}
                        </pre>
                      </div>
                    </div>
                  )}
                </div>
              </Card>
            )}
          </div>
        </ScrollArea>

        <Separator />

        {/* Ações */}
        <div className="flex items-center justify-end gap-2 pt-4">
          <Button
            variant="outline"
            size="sm"
            onClick={handleEditInN8N}
          >
            <ExternalLink className="mr-2 h-4 w-4" />
            Editar no N8N
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled
          >
            <PlayCircle className="mr-2 h-4 w-4" />
            Reexecutar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
