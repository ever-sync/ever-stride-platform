import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { WahaSession } from '@/types/waha';
import QRCode from 'react-qr-code';
import { CheckCircle, Loader2 } from 'lucide-react';

interface QRCodeModalProps {
  session: WahaSession;
  open: boolean;
  onClose: () => void;
}

export function QRCodeModal({ session, open, onClose }: QRCodeModalProps) {
  const isConnected = session.status === 'connected' || session.status === 'WORKING';
  const needsQR = session.status === 'qr_code' || session.status === 'SCAN_QR_CODE';

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
            <div className="bg-white p-4 rounded-lg">
              <QRCode value={session.qr_code} size={256} />
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