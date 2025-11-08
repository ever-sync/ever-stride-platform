import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Send, Check, X, Clock } from 'lucide-react';
import { useN8NWorkflows } from '@/hooks/useN8NWorkflows';
import { toast } from 'sonner';

interface WebhookTestModalProps {
  webhookUrl: string;
  workflowName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const EXAMPLE_PAYLOADS = {
  simple: {
    name: 'Mensagem Simples',
    payload: {
      message: 'Olá, este é um teste do webhook',
      from: '+5511999999999',
      timestamp: new Date().toISOString(),
    },
  },
  whatsapp: {
    name: 'Mensagem WhatsApp',
    payload: {
      phone: '+5511999999999',
      message: 'Teste de integração N8N',
      type: 'text',
      metadata: {
        source: 'test',
        userId: 'test-user-123',
      },
    },
  },
  media: {
    name: 'Mensagem com Mídia',
    payload: {
      phone: '+5511999999999',
      message: 'Veja esta imagem',
      type: 'image',
      mediaUrl: 'https://example.com/image.jpg',
    },
  },
  custom: {
    name: 'Payload Customizado',
    payload: {
      // Empty for user to fill
    },
  },
};

export function WebhookTestModal({ webhookUrl, workflowName, open, onOpenChange }: WebhookTestModalProps) {
  const { testWebhook } = useN8NWorkflows();
  const [selectedExample, setSelectedExample] = useState<keyof typeof EXAMPLE_PAYLOADS>('simple');
  const [payload, setPayload] = useState(JSON.stringify(EXAMPLE_PAYLOADS.simple.payload, null, 2));
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<{
    status: number;
    data: any;
    time: number;
  } | null>(null);

  const handleExampleChange = (value: keyof typeof EXAMPLE_PAYLOADS) => {
    setSelectedExample(value);
    setPayload(JSON.stringify(EXAMPLE_PAYLOADS[value].payload, null, 2));
    setResponse(null);
  };

  const handleSendTest = async () => {
    try {
      setLoading(true);
      setResponse(null);

      // Validate JSON
      let parsedPayload;
      try {
        parsedPayload = JSON.parse(payload);
      } catch (e) {
        toast.error('JSON inválido', {
          description: 'Por favor, verifique o formato do payload',
        });
        return;
      }

      const startTime = Date.now();
      const result = await testWebhook(webhookUrl, parsedPayload);
      const endTime = Date.now();

      setResponse({
        status: result.status || 200,
        data: result.data,
        time: endTime - startTime,
      });

      toast.success('Teste enviado com sucesso!', {
        description: `Resposta recebida em ${endTime - startTime}ms`,
      });
    } catch (error: any) {
      console.error('Erro ao testar webhook:', error);
      
      setResponse({
        status: error.response?.status || 500,
        data: error.response?.data || { error: error.message },
        time: 0,
      });

      toast.error('Erro ao testar webhook', {
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: number) => {
    if (status >= 200 && status < 300) {
      return <Badge className="bg-success text-success-foreground"><Check className="h-3 w-3 mr-1" /> {status} Success</Badge>;
    } else if (status >= 400 && status < 500) {
      return <Badge variant="destructive"><X className="h-3 w-3 mr-1" /> {status} Client Error</Badge>;
    } else if (status >= 500) {
      return <Badge variant="destructive"><X className="h-3 w-3 mr-1" /> {status} Server Error</Badge>;
    }
    return <Badge variant="secondary">{status}</Badge>;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Testar Webhook</DialogTitle>
          <DialogDescription>
            Envie um payload de teste para o workflow <strong>{workflowName}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {/* Example selector */}
          <div className="space-y-2">
            <Label>Exemplo de Payload</Label>
            <Select value={selectedExample} onValueChange={handleExampleChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(EXAMPLE_PAYLOADS).map(([key, value]) => (
                  <SelectItem key={key} value={key}>
                    {value.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Payload editor */}
          <div className="space-y-2">
            <Label>Payload JSON</Label>
            <Textarea
              value={payload}
              onChange={(e) => setPayload(e.target.value)}
              placeholder="Cole ou edite o payload JSON aqui..."
              className="font-mono text-sm min-h-[200px]"
            />
          </div>

          {/* Send button */}
          <Button
            onClick={handleSendTest}
            disabled={loading}
            className="w-full"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Enviando...
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                Enviar Teste
              </>
            )}
          </Button>

          {/* Response section */}
          {response && (
            <Card className="p-4 space-y-3 border-border">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-sm">Resposta</h4>
                <div className="flex items-center gap-2">
                  {getStatusBadge(response.status)}
                  <Badge variant="outline" className="gap-1">
                    <Clock className="h-3 w-3" />
                    {response.time}ms
                  </Badge>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Payload de Resposta</Label>
                <div className="bg-muted rounded-md p-3 overflow-x-auto">
                  <pre className="text-xs font-mono">
                    {JSON.stringify(response.data, null, 2)}
                  </pre>
                </div>
              </div>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
