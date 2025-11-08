import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { WahaSession } from '@/types/waha';
import QRCode from 'react-qr-code';
import { CheckCircle, Loader2, Clock, RefreshCw } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface QRCodeModalProps {
  session: WahaSession;
  open: boolean;
  onClose: () => void;
  onRefreshQR?: () => Promise<void>;
  refreshing?: boolean;
  qrRetryAttempt?: number;
}

export function QRCodeModal({ session, open, onClose, onRefreshQR, refreshing = false, qrRetryAttempt = 0 }: QRCodeModalProps) {
  const isConnected = session.status === 'connected' || session.status === 'WORKING';
  const needsQR = session.status === 'qr_code' || session.status === 'SCAN_QR_CODE';
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    if (needsQR && session.qr_expires_at) {
      const updateTimer = () => {
        const expiresAt = new Date(session.qr_expires_at).getTime();
        const now = Date.now();
        const remaining = Math.max(0, Math.floor((expiresAt - now) / 1000));
        setTimeRemaining(remaining);
      };
      
      updateTimer();
      const interval = setInterval(updateTimer, 1000);
      return () => clearInterval(interval);
    } else {
      setTimeRemaining(null);
    }
  }, [needsQR, session.qr_expires_at]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleRefreshClick = async () => {
    if (!onRefreshQR) return;
    setIsRefreshing(true);
    try {
      await onRefreshQR();
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isConnected ? 'WhatsApp Conectado!' : 'Escanear QR Code'}
          </DialogTitle>
          <DialogDescription>
            {isConnected 
              ? 'Sua sessão WhatsApp foi conectada com sucesso'
              : 'Abra o WhatsApp no seu celular e escaneie o código QR'
            }
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center justify-center py-6 space-y-4">
          {isConnected ? (
            <div className="flex flex-col items-center space-y-4">
              <CheckCircle className="h-16 w-16 text-green-500" />
              <p className="text-sm text-muted-foreground text-center">
                Sessão: {session.session_name}
              </p>
              {session.phone_number && (
                <p className="text-sm font-medium">
                  Número: {session.phone_number}
                </p>
              )}
            </div>
          ) : needsQR && session.qr_code ? (
            <div className="space-y-4 w-full">
              <div className="bg-white p-4 rounded-lg">
                {session.qr_code.startsWith('data:image') ? (
                  <img 
                    src={session.qr_code} 
                    alt="QR Code WhatsApp"
                    className="w-64 h-64 mx-auto"
                  />
                ) : (
                  <QRCode value={session.qr_code} size={256} />
                )}
              </div>
              
              {onRefreshQR && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRefreshClick}
                  disabled={isRefreshing || refreshing}
                  className="w-full"
                >
                  {isRefreshing || refreshing ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Atualizando...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Atualizar QR Code
                    </>
                  )}
                </Button>
              )}
              
              {qrRetryAttempt > 0 && (
                <Alert>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <AlertDescription>
                    Tentativa {qrRetryAttempt} de 3... Aguarde.
                  </AlertDescription>
                </Alert>
              )}
              
              {timeRemaining !== null && (
                <div className="space-y-2">
                  <div className="flex items-center justify-center gap-2 text-sm">
                    <Clock className="h-4 w-4" />
                    <span className="font-medium">
                      Expira em: {formatTime(timeRemaining)}
                    </span>
                  </div>
                  <Progress 
                    value={(timeRemaining / 60) * 100} 
                    className="h-2"
                  />
                  {timeRemaining < 10 && (
                    <p className="text-xs text-center text-destructive">
                      QR Code expirando em breve...
                    </p>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center space-y-4">
              <Loader2 className="h-16 w-16 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">
                {session.status === 'connecting' || session.status === 'STARTING'
                  ? 'Iniciando sessão...'
                  : 'Aguardando QR code...'
                }
              </p>
              {qrRetryAttempt > 0 && (
                <Alert className="mt-4">
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <AlertDescription>
                    Tentativa {qrRetryAttempt} de 3... Aguarde.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}
        </div>

        <div className="text-xs text-center text-muted-foreground space-y-1">
          <p>Status: {session.status}</p>
          {session.qr_expires_at && !isConnected && (
            <p>Expira em: {new Date(session.qr_expires_at).toLocaleTimeString()}</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}