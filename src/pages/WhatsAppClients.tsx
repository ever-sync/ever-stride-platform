import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useWhatsAppClients } from '@/hooks/useWhatsAppClients';
import { WhatsAppClient } from '@/types/database';
import { WhatsAppClientForm } from '@/components/WhatsAppClientForm';
import { WhatsAppQRModal } from '@/components/WhatsAppQRModal';
import { 
  Users, 
  UserCheck, 
  UserX, 
  MessageSquare, 
  Plus, 
  Search,
  Pencil,
  Trash2,
  QrCode,
  Copy,
  Check
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';

export default function WhatsAppClients() {
  const { 
    clientes, 
    loading, 
    stats, 
    criarCliente, 
    atualizarCliente, 
    deletarCliente, 
    toggleStatus 
  } = useWhatsAppClients();

  const [searchTerm, setSearchTerm] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [selectedCliente, setSelectedCliente] = useState<WhatsAppClient | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const filteredClientes = clientes.filter(c =>
    c.nome_empresa.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.whatsapp_numero.includes(searchTerm)
  );

  const handleCopyApiKey = (apiKey: string) => {
    navigator.clipboard.writeText(apiKey);
    setCopiedKey(apiKey);
    toast({
      title: 'API Key copiada!',
      description: 'A chave foi copiada para a área de transferência.',
    });
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleEdit = (cliente: WhatsAppClient) => {
    setSelectedCliente(cliente);
    setFormOpen(true);
  };

  const handleNew = () => {
    setSelectedCliente(null);
    setFormOpen(true);
  };

  const handleFormSubmit = async (data: Partial<WhatsAppClient>) => {
    if (selectedCliente) {
      await atualizarCliente(selectedCliente.id, data);
    } else {
      await criarCliente(data);
    }
  };

  const handleDeleteConfirm = async () => {
    if (selectedCliente) {
      await deletarCliente(selectedCliente.id, selectedCliente.waha_session_id);
      setDeleteDialogOpen(false);
      setSelectedCliente(null);
    }
  };

  const handleQrCode = (cliente: WhatsAppClient) => {
    setSelectedCliente(cliente);
    setQrModalOpen(true);
  };

  const getPlanoColor = (plano: string) => {
    switch (plano) {
      case 'basico': return 'bg-blue-500';
      case 'premium': return 'bg-purple-500';
      case 'enterprise': return 'bg-amber-500';
      default: return 'bg-gray-500';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Clientes WhatsApp</h1>
          <p className="text-muted-foreground">
            Gerencie os clientes com automação de WhatsApp via IA
          </p>
        </div>
        <Button onClick={handleNew} size="lg">
          <Plus className="mr-2 h-5 w-5" />
          Novo Cliente
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Clientes</CardTitle>
            <Users className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Clientes Ativos</CardTitle>
            <UserCheck className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.ativos}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Clientes Inativos</CardTitle>
            <UserX className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.inativos}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Mensagens no Mês</CardTitle>
            <MessageSquare className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalMensagens.toLocaleString()}</div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, email ou WhatsApp..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">Status</TableHead>
                <TableHead>Empresa</TableHead>
                <TableHead>WhatsApp</TableHead>
                <TableHead>Nome do Agente</TableHead>
                <TableHead>API Key</TableHead>
                <TableHead>Plano</TableHead>
                <TableHead>Mensagens</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredClientes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    {searchTerm ? 'Nenhum cliente encontrado.' : 'Nenhum cliente cadastrado. Clique em "Novo Cliente" para começar.'}
                  </TableCell>
                </TableRow>
              ) : (
                filteredClientes.map((cliente) => (
                  <TableRow key={cliente.id}>
                    <TableCell>
                      <input
                        type="checkbox"
                        checked={cliente.ativo}
                        onChange={(e) => toggleStatus(cliente.id, e.target.checked)}
                        className="h-4 w-4 rounded border-gray-300"
                      />
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{cliente.nome_empresa}</div>
                        <div className="text-sm text-muted-foreground">{cliente.email}</div>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-sm">{cliente.whatsapp_numero}</TableCell>
                    <TableCell>{cliente.nome_agente}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <code className="text-xs bg-muted px-2 py-1 rounded">
                          {cliente.api_key.substring(0, 12)}...
                        </code>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCopyApiKey(cliente.api_key)}
                        >
                          {copiedKey === cliente.api_key ? (
                            <Check className="h-4 w-4 text-green-500" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={getPlanoColor(cliente.plano)}>
                        {cliente.plano}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <span className="font-medium">{cliente.mensagens_usadas_mes}</span>
                        <span className="text-muted-foreground"> / {cliente.limite_mensagens_mes}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleQrCode(cliente)}
                          title="Vincular WhatsApp"
                        >
                          <QrCode className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(cliente)}
                          title="Editar"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedCliente(cliente);
                            setDeleteDialogOpen(true);
                          }}
                          title="Deletar"
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Modals */}
      <WhatsAppClientForm
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          setSelectedCliente(null);
        }}
        onSubmit={handleFormSubmit}
        cliente={selectedCliente}
      />

      <WhatsAppQRModal
        open={qrModalOpen}
        onClose={() => {
          setQrModalOpen(false);
          setSelectedCliente(null);
        }}
        clienteNome={selectedCliente?.nome_empresa || ''}
        sessionId={selectedCliente?.waha_session_id || null}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja deletar o cliente <strong>{selectedCliente?.nome_empresa}</strong>?
              Esta ação não pode ser desfeita e a sessão WhatsApp será encerrada.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setSelectedCliente(null)}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive hover:bg-destructive/90">
              Deletar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
