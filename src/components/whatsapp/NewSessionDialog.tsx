import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useWahaSession } from '@/hooks/useWahaSession';
import { Plus, Loader2 } from 'lucide-react';
import { QRCodeModal } from './QRCodeModal';

export function NewSessionDialog() {
  const [open, setOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<string>('');
  const [selectedAgent, setSelectedAgent] = useState<string>('');
  const [showQR, setShowQR] = useState(false);
  
  const { criarSession, connecting, session } = useWahaSession(selectedClient);

  // Carregar clientes
  const { data: clients, isLoading: loadingClients } = useQuery({
    queryKey: ['whatsapp-clients'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('whatsapp_clients')
        .select('*')
        .eq('ativo', true)
        .order('nome_empresa');
      
      if (error) throw error;
      return data;
    },
  });

  // Carregar agentes
  const { data: agents, isLoading: loadingAgents } = useQuery({
    queryKey: ['agents'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('agents')
        .select('*')
        .eq('ativo', true)
        .order('nome_agente');
      
      if (error) throw error;
      return data;
    },
  });

  const handleCreateSession = async () => {
    if (!selectedClient) return;
    
    try {
      await criarSession(selectedAgent || undefined);
      setShowQR(true);
      setOpen(false);
    } catch (error) {
      console.error('Error creating session:', error);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Nova Sessão WhatsApp
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Criar Nova Sessão WhatsApp</DialogTitle>
            <DialogDescription>
              Selecione um cliente e opcionalmente um agente para criar uma nova sessão WhatsApp
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Cliente *</Label>
              <Select value={selectedClient} onValueChange={setSelectedClient}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um cliente" />
                </SelectTrigger>
                <SelectContent>
                  {loadingClients ? (
                    <SelectItem value="loading" disabled>Carregando...</SelectItem>
                  ) : (
                    clients?.map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.nome_empresa}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Agente (Opcional)</Label>
              <Select value={selectedAgent} onValueChange={setSelectedAgent}>
                <SelectTrigger>
                  <SelectValue placeholder="Nenhum agente" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Nenhum agente</SelectItem>
                  {loadingAgents ? (
                    <SelectItem value="loading" disabled>Carregando...</SelectItem>
                  ) : (
                    agents?.map((agent) => (
                      <SelectItem key={agent.id} value={agent.id}>
                        {agent.nome_agente}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <Button 
              onClick={handleCreateSession} 
              disabled={!selectedClient || connecting}
              className="w-full"
            >
              {connecting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Criando...
                </>
              ) : (
                'Criar Sessão'
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {showQR && session && (
        <QRCodeModal
          session={session}
          open={showQR}
          onClose={() => setShowQR(false)}
        />
      )}
    </>
  );
}