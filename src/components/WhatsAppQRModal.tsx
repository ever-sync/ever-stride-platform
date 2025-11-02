import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useWaha } from '@/hooks/useWaha';
import { Loader2, CheckCircle2, XCircle, QrCode } from 'lucide-react';
import QRCode from 'react-qr-code';

interface WhatsAppQRModalProps {
  open: boolean;
  onClose: () => void;
  clienteNome: string;
  sessionId: string | null;
}

export function WhatsAppQRModal({ open, onClose, clienteNome, sessionId }: WhatsAppQRModalProps) {
  const { status, qrCode, loading, iniciarSessao, pararSessao } = useWaha(sessionId);

  const getStatusBadge = () => {
    switch (status) {
      case 'STOPPED':
        return <Badge variant="secondary">Parado</Badge>;
      case 'STARTING':
        return <Badge className="bg-yellow-500">Iniciando...</Badge>;
      case 'SCAN_QR_CODE':
        return <Badge className="bg-blue-500">Aguardando QR Code</Badge>;
      case 'WORKING':
        return <Badge className="bg-green-500">Conectado</Badge>;
      case 'FAILED':
        return <Badge variant="destructive">Falha</Badge>;
      default:
        return <Badge variant="secondary">Desconhecido</Badge>;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Vincular WhatsApp</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          <div>
            <p className="text-sm text-muted-foreground mb-2">Cliente</p>
            <p className="font-semibold">{clienteNome}</p>
          </div>

          <div>
            <p className="text-sm text-muted-foreground mb-2">Status da Conexão</p>
            {getStatusBadge()}
          </div>

          {loading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          )}

          {!loading && status === 'SCAN_QR_CODE' && qrCode && (
            <div className="space-y-4">
              <div className="flex justify-center p-4 bg-white rounded-lg">
                <QRCode value={qrCode} size={256} />
              </div>
              
              <div className="bg-muted p-4 rounded-lg">
                <p className="font-semibold mb-2 flex items-center gap-2">
                  <QrCode className="h-5 w-5" />
                  Como escanear:
                </p>
                <ol className="text-sm space-y-1 list-decimal list-inside">
                  <li>Abra o WhatsApp no celular</li>
                  <li>Vá em Menu → Aparelhos conectados</li>
                  <li>Toque em "Conectar um aparelho"</li>
                  <li>Escaneie o código QR acima</li>
                </ol>
              </div>
            </div>
          )}

          {!loading && status === 'WORKING' && (
            <div className="flex flex-col items-center justify-center py-8 space-y-4">
              <CheckCircle2 className="h-16 w-16 text-green-500" />
              <p className="text-xl font-semibold">WhatsApp Conectado!</p>
              <p className="text-sm text-muted-foreground text-center">
                O cliente está pronto para receber e enviar mensagens.
              </p>
              <Button onClick={pararSessao} variant="outline" size="sm">
                Desconectar
              </Button>
            </div>
          )}

          {!loading && status === 'STOPPED' && (
            <div className="flex flex-col items-center justify-center py-8 space-y-4">
              <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
                <QrCode className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground text-center">
                A sessão WhatsApp está parada. Clique em iniciar para conectar.
              </p>
              <Button onClick={iniciarSessao}>
                Iniciar Sessão
              </Button>
            </div>
          )}

          {!loading && status === 'FAILED' && (
            <div className="flex flex-col items-center justify-center py-8 space-y-4">
              <XCircle className="h-16 w-16 text-destructive" />
              <p className="text-xl font-semibold">Falha na Conexão</p>
              <p className="text-sm text-muted-foreground text-center">
                Não foi possível conectar ao WhatsApp. Tente novamente.
              </p>
              <Button onClick={iniciarSessao} variant="outline">
                Tentar Novamente
              </Button>
            </div>
          )}

          {!loading && status === 'STARTING' && (
            <div className="flex flex-col items-center justify-center py-8 space-y-4">
              <Loader2 className="h-16 w-16 animate-spin text-yellow-500" />
              <p className="text-xl font-semibold">Iniciando...</p>
              <p className="text-sm text-muted-foreground text-center">
                Aguarde enquanto preparamos a conexão WhatsApp.
              </p>
            </div>
          )}

          <div className="flex justify-end pt-4 border-t">
            <Button variant="outline" onClick={onClose}>
              Fechar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
