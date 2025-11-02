import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { WhatsAppClient } from '@/types/database';
import { useAuth } from '@/hooks/useAuth';

interface WhatsAppClientFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: Partial<WhatsAppClient>) => Promise<void>;
  cliente?: WhatsAppClient | null;
}

const DEFAULT_SCRIPT = `Você é [NOME_AGENTE], assistente virtual da [EMPRESA].

Sua função é atender os clientes de forma cordial, profissional e eficiente.

Diretrizes:
- Seja educado e atencioso
- Responda de forma clara e objetiva
- Caso não saiba uma informação, solicite aguardar enquanto verifica
- Sempre finalize com uma pergunta para engajar o cliente

Como posso ajudar você hoje?`;

export function WhatsAppClientForm({ open, onClose, onSubmit, cliente }: WhatsAppClientFormProps) {
  const { userSession } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    nome_empresa: '',
    cnpj: '',
    email: '',
    telefone: '',
    whatsapp_numero: '',
    plano: 'basico' as 'basico' | 'premium' | 'enterprise',
    nome_agente: 'Assistente',
    saudacao_inicial: 'Olá! Como posso ajudar?',
    script_atendimento: DEFAULT_SCRIPT,
    limite_mensagens_mes: 1000,
  });

  useEffect(() => {
    if (cliente) {
      setFormData({
        nome_empresa: cliente.nome_empresa,
        cnpj: cliente.cnpj || '',
        email: cliente.email,
        telefone: cliente.telefone || '',
        whatsapp_numero: cliente.whatsapp_numero,
        plano: (cliente.plano as 'basico' | 'premium' | 'enterprise') || 'basico',
        nome_agente: cliente.nome_agente,
        saudacao_inicial: cliente.saudacao_inicial,
        script_atendimento: cliente.script_atendimento,
        limite_mensagens_mes: cliente.limite_mensagens_mes,
      });
    } else {
      setFormData({
        nome_empresa: '',
        cnpj: '',
        email: '',
        telefone: '',
        whatsapp_numero: '',
        plano: 'basico',
        nome_agente: 'Assistente',
        saudacao_inicial: 'Olá! Como posso ajudar?',
        script_atendimento: DEFAULT_SCRIPT,
        limite_mensagens_mes: 1000,
      });
    }
  }, [cliente, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.nome_empresa || !formData.email || !formData.whatsapp_numero || !formData.script_atendimento) {
      return;
    }

    if (formData.script_atendimento.length < 50) {
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

  const handleChange = (field: string, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {cliente ? 'Editar Cliente' : 'Novo Cliente WhatsApp'}
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Company Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Informações da Empresa</h3>
            
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
                <Label htmlFor="whatsapp_numero">WhatsApp Number *</Label>
                <Input
                  id="whatsapp_numero"
                  value={formData.whatsapp_numero}
                  onChange={(e) => handleChange('whatsapp_numero', e.target.value)}
                  required
                  placeholder="5521987654321"
                  minLength={12}
                  maxLength={13}
                />
                <p className="text-sm text-muted-foreground mt-1">
                  Formato: 5521987654321 (código país + DDD + número)
                </p>
              </div>
              
              <div>
                <Label htmlFor="plano">Plano</Label>
                <Select value={formData.plano} onValueChange={(value) => handleChange('plano', value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="basico">Básico</SelectItem>
                    <SelectItem value="premium">Premium</SelectItem>
                    <SelectItem value="enterprise">Enterprise</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* AI Agent Configuration */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Configuração do Agente Virtual</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="nome_agente">Nome do Agente</Label>
                <Input
                  id="nome_agente"
                  value={formData.nome_agente}
                  onChange={(e) => handleChange('nome_agente', e.target.value)}
                  placeholder="Assistente"
                />
              </div>
              
              <div>
                <Label htmlFor="limite_mensagens_mes">Limite Mensal de Mensagens</Label>
                <Input
                  id="limite_mensagens_mes"
                  type="number"
                  value={formData.limite_mensagens_mes}
                  onChange={(e) => handleChange('limite_mensagens_mes', parseInt(e.target.value))}
                  min={100}
                  placeholder="1000"
                />
              </div>
              
              <div className="col-span-2">
                <Label htmlFor="saudacao_inicial">Saudação Inicial</Label>
                <Input
                  id="saudacao_inicial"
                  value={formData.saudacao_inicial}
                  onChange={(e) => handleChange('saudacao_inicial', e.target.value)}
                  placeholder="Olá! Como posso ajudar?"
                />
              </div>
              
              <div className="col-span-2">
                <Label htmlFor="script_atendimento">Script de Atendimento *</Label>
                <Textarea
                  id="script_atendimento"
                  value={formData.script_atendimento}
                  onChange={(e) => handleChange('script_atendimento', e.target.value)}
                  required
                  minLength={50}
                  rows={15}
                  className="font-mono text-sm"
                  placeholder={DEFAULT_SCRIPT}
                />
                <p className="text-sm text-muted-foreground mt-1">
                  Mínimo de 50 caracteres. Use [NOME_AGENTE] e [EMPRESA] como variáveis.
                </p>
              </div>
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
