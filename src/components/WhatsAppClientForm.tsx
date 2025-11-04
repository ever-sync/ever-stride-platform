import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { WhatsAppClient } from '@/types/database';
import { useAuth } from '@/hooks/useAuth';

interface WhatsAppClientFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: Partial<WhatsAppClient>) => Promise<void>;
  cliente?: WhatsAppClient | null;
}

export function WhatsAppClientForm({ open, onClose, onSubmit, cliente }: WhatsAppClientFormProps) {
  const { userSession } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    nome_empresa: '',
    cnpj: '',
    email: '',
    telefone: '',
    whatsapp_numero: '',
  });

  useEffect(() => {
    if (cliente) {
      setFormData({
        nome_empresa: cliente.nome_empresa,
        cnpj: cliente.cnpj || '',
        email: cliente.email,
        telefone: cliente.telefone || '',
        whatsapp_numero: cliente.whatsapp_numero,
      });
    } else {
      setFormData({
        nome_empresa: '',
        cnpj: '',
        email: '',
        telefone: '',
        whatsapp_numero: '',
      });
    }
  }, [cliente, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.nome_empresa || !formData.email || !formData.whatsapp_numero) {
      return;
    }

    setLoading(true);
    try {
      const data = {
        ...formData,
        tenant_id: userSession?.tenant?.id,
      };
      
      await onSubmit(data);
      onClose();
    } catch (error) {
      console.error('Error submitting form:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {cliente ? 'Editar Cliente' : 'Novo Cliente'}
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label htmlFor="nome_empresa">Nome da Empresa *</Label>
              <Input
                id="nome_empresa"
                value={formData.nome_empresa}
                onChange={(e) => handleChange('nome_empresa', e.target.value)}
                required
                placeholder="Empresa Exemplo Ltda"
              />
            </div>
            
            <div>
              <Label htmlFor="cnpj">CNPJ</Label>
              <Input
                id="cnpj"
                value={formData.cnpj}
                onChange={(e) => handleChange('cnpj', e.target.value)}
                placeholder="00.000.000/0000-00"
              />
            </div>
            
            <div>
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleChange('email', e.target.value)}
                required
                placeholder="contato@empresa.com"
              />
            </div>
            
            <div>
              <Label htmlFor="telefone">Telefone</Label>
              <Input
                id="telefone"
                value={formData.telefone}
                onChange={(e) => handleChange('telefone', e.target.value)}
                placeholder="(21) 98765-4321"
              />
            </div>
            
            <div>
              <Label htmlFor="whatsapp_numero">Número WhatsApp *</Label>
              <Input
                id="whatsapp_numero"
                value={formData.whatsapp_numero}
                onChange={(e) => handleChange('whatsapp_numero', e.target.value)}
                required
                placeholder="5521987654321"
              />
              <p className="text-sm text-muted-foreground mt-1">
                Formato: 5521987654321 (código país + DDD + número)
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
