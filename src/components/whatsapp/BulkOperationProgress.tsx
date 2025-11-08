import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { CheckCircle2, XCircle, Loader2, Clock } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface OperationStatus {
  sessionId: string;
  sessionName: string;
  status: 'pending' | 'processing' | 'success' | 'failed';
  message?: string;
}

interface BulkOperationProgressProps {
  open: boolean;
  operation: string;
  operations: OperationStatus[];
  completed: number;
  total: number;
  onCancel?: () => void;
}

export function BulkOperationProgress({
  open,
  operation,
  operations,
  completed,
  total,
  onCancel,
}: BulkOperationProgressProps) {
  const progress = total > 0 ? (completed / total) * 100 : 0;

  const getOperationText = () => {
    switch (operation) {
      case 'reconnect': return 'Reconectando sessões';
      case 'disconnect': return 'Desconectando sessões';
      case 'refresh_qr': return 'Atualizando QR codes';
      default: return 'Processando';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'processing':
        return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{getOperationText()}</DialogTitle>
          <DialogDescription>
            {completed} de {total} operações concluídas
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Progress value={progress} className="h-2" />
            <div className="text-sm text-muted-foreground text-right">
              {Math.round(progress)}%
            </div>
          </div>

          <ScrollArea className="h-[300px] rounded-md border p-4">
            <div className="space-y-2">
              {operations.map((op) => (
                <div
                  key={op.sessionId}
                  className="flex items-start justify-between gap-3 p-2 rounded hover:bg-muted/50"
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    {getStatusIcon(op.status)}
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">
                        {op.sessionName}
                      </div>
                      {op.message && (
                        <div className={`text-xs truncate ${
                          op.status === 'failed' ? 'text-red-600' : 'text-muted-foreground'
                        }`}>
                          {op.message}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground capitalize">
                    {op.status === 'pending' ? 'Aguardando' : 
                     op.status === 'processing' ? 'Processando' :
                     op.status === 'success' ? 'Sucesso' : 'Falhou'}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>

          {onCancel && completed < total && (
            <div className="flex justify-end">
              <Button variant="outline" onClick={onCancel}>
                Cancelar Operações Restantes
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
