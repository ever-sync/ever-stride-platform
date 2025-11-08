import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertCircle, RefreshCw, X } from 'lucide-react';
import { WahaSession } from '@/types/waha';

interface DisconnectAlertProps {
  sessions: WahaSession[];
  onReconnect: (session: WahaSession) => void;
  onDismiss: () => void;
  reconnecting?: string[];
}

export function DisconnectAlert({ sessions, onReconnect, onDismiss, reconnecting = [] }: DisconnectAlertProps) {
  if (sessions.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-right-5 max-w-md">
      <Alert variant="destructive" className="border-2">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle className="flex items-center justify-between">
          Sessões Desconectadas
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={onDismiss}
          >
            <X className="h-4 w-4" />
          </Button>
        </AlertTitle>
        <AlertDescription className="mt-2 space-y-2">
          <p className="text-sm">As seguintes sessões perderam a conexão:</p>
          <div className="space-y-2">
            {sessions.map((session) => {
              const isReconnecting = reconnecting.includes(session.id);
              return (
                <div key={session.id} className="flex items-center justify-between gap-2 bg-background/50 p-2 rounded">
                  <span className="text-sm font-medium truncate">
                    {session.session_name}
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onReconnect(session)}
                    disabled={isReconnecting}
                    className="h-7 text-xs"
                  >
                    {isReconnecting ? (
                      <>
                        <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                        Reconectando...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="h-3 w-3 mr-1" />
                        Reconectar
                      </>
                    )}
                  </Button>
                </div>
              );
            })}
          </div>
        </AlertDescription>
      </Alert>
    </div>
  );
}
