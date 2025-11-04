import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useAgents } from "@/hooks/useAgents";
import { useWhatsAppClients } from "@/hooks/useWhatsAppClients";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Plus, Pencil, Trash2, Bot, Activity, MessageSquare } from "lucide-react";
import { Agent } from "@/types/database";

export default function Agents() {
  const { userSession } = useAuth();
  const { agentes, loading, stats, criarAgente, atualizarAgente, deletarAgente, toggleStatus } =
    useAgents();
  const { clientes } = useWhatsAppClients();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);
  const [formData, setFormData] = useState({
    client_id: "",
    workflow_id: "",
    nome_agente: "Assistente",
    limite_mensagens_mes: 1000,
    saudacao_inicial: "Olá! Como posso ajudar?",
    script_atendimento: "",
    codigo_transferencia: "",
    codigo_envio_grupo: "",
    codigo_pausar_ia: "",
    codigo_ativar_ia: "",
    codigo_resetar_bd: "",
    codigo_avaliacao: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingAgent) {
        await atualizarAgente(editingAgent.id, formData);
      } else {
        await criarAgente({
          ...formData,
          tenant_id: userSession?.tenant?.id!,
        });
      }
      setDialogOpen(false);
      resetForm();
    } catch (error) {
      console.error("Error saving agent:", error);
    }
  };

  const resetForm = () => {
    setFormData({
      client_id: "",
      workflow_id: "",
      nome_agente: "Assistente",
      limite_mensagens_mes: 1000,
      saudacao_inicial: "Olá! Como posso ajudar?",
      script_atendimento: "",
      codigo_transferencia: "",
      codigo_envio_grupo: "",
      codigo_pausar_ia: "",
      codigo_ativar_ia: "",
      codigo_resetar_bd: "",
      codigo_avaliacao: "",
    });
    setEditingAgent(null);
  };

  const openEditDialog = (agent: Agent) => {
    setEditingAgent(agent);
    setFormData({
      client_id: agent.client_id,
      workflow_id: agent.workflow_id || "",
      nome_agente: agent.nome_agente,
      limite_mensagens_mes: agent.limite_mensagens_mes || 1000,
      saudacao_inicial: agent.saudacao_inicial || "",
      script_atendimento: agent.script_atendimento,
      codigo_transferencia: agent.codigo_transferencia || "",
      codigo_envio_grupo: agent.codigo_envio_grupo || "",
      codigo_pausar_ia: agent.codigo_pausar_ia || "",
      codigo_ativar_ia: agent.codigo_ativar_ia || "",
      codigo_resetar_bd: agent.codigo_resetar_bd || "",
      codigo_avaliacao: agent.codigo_avaliacao || "",
    });
    setDialogOpen(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Agentes</h1>
          <p className="text-muted-foreground mt-1">
            Configure agentes de IA para seus clientes
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="mr-2 h-4 w-4" />
              Novo Agente
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingAgent ? "Editar Agente" : "Novo Agente"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="client_id">Cliente *</Label>
                  <Select
                    value={formData.client_id}
                    onValueChange={(value) =>
                      setFormData({ ...formData, client_id: value })
                    }
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um cliente" />
                    </SelectTrigger>
                    <SelectContent>
                      {clientes.map((client) => (
                        <SelectItem key={client.id} value={client.id}>
                          {client.nome_empresa}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="workflow_id">ID do Workflow</Label>
                  <Input
                    id="workflow_id"
                    value={formData.workflow_id}
                    onChange={(e) =>
                      setFormData({ ...formData, workflow_id: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="nome_agente">Nome do Agente *</Label>
                  <Input
                    id="nome_agente"
                    required
                    value={formData.nome_agente}
                    onChange={(e) =>
                      setFormData({ ...formData, nome_agente: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="limite_mensagens_mes">Limite Mensal de Mensagens</Label>
                  <Input
                    id="limite_mensagens_mes"
                    type="number"
                    value={formData.limite_mensagens_mes}
                    onChange={(e) =>
                      setFormData({ ...formData, limite_mensagens_mes: parseInt(e.target.value) })
                    }
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="saudacao_inicial">Saudação Inicial</Label>
                <Input
                  id="saudacao_inicial"
                  value={formData.saudacao_inicial}
                  onChange={(e) =>
                    setFormData({ ...formData, saudacao_inicial: e.target.value })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="script_atendimento">Script de Atendimento *</Label>
                <Textarea
                  id="script_atendimento"
                  required
                  rows={4}
                  value={formData.script_atendimento}
                  onChange={(e) =>
                    setFormData({ ...formData, script_atendimento: e.target.value })
                  }
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="codigo_transferencia">Código de Transferência</Label>
                  <Input
                    id="codigo_transferencia"
                    value={formData.codigo_transferencia}
                    onChange={(e) =>
                      setFormData({ ...formData, codigo_transferencia: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="codigo_envio_grupo">Código de Envio para Grupo</Label>
                  <Input
                    id="codigo_envio_grupo"
                    value={formData.codigo_envio_grupo}
                    onChange={(e) =>
                      setFormData({ ...formData, codigo_envio_grupo: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="codigo_pausar_ia">Código Pausar IA</Label>
                  <Input
                    id="codigo_pausar_ia"
                    value={formData.codigo_pausar_ia}
                    onChange={(e) =>
                      setFormData({ ...formData, codigo_pausar_ia: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="codigo_ativar_ia">Código Ativar IA</Label>
                  <Input
                    id="codigo_ativar_ia"
                    value={formData.codigo_ativar_ia}
                    onChange={(e) =>
                      setFormData({ ...formData, codigo_ativar_ia: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="codigo_resetar_bd">Código de Resetar Banco de Dados</Label>
                  <Input
                    id="codigo_resetar_bd"
                    value={formData.codigo_resetar_bd}
                    onChange={(e) =>
                      setFormData({ ...formData, codigo_resetar_bd: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="codigo_avaliacao">Código de Avaliação</Label>
                  <Input
                    id="codigo_avaliacao"
                    value={formData.codigo_avaliacao}
                    onChange={(e) =>
                      setFormData({ ...formData, codigo_avaliacao: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit">Salvar</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Agentes</CardTitle>
            <Bot className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Agentes Ativos</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.ativos}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Mensagens (mês)</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalMensagens}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lista de Agentes</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Workflow ID</TableHead>
                <TableHead>Mensagens (mês)</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {agentes.map((agent: any) => (
                <TableRow key={agent.id}>
                  <TableCell className="font-medium">{agent.nome_agente}</TableCell>
                  <TableCell>{agent.whatsapp_clients?.nome_empresa || "-"}</TableCell>
                  <TableCell className="font-mono text-xs">{agent.workflow_id || "-"}</TableCell>
                  <TableCell>
                    {agent.mensagens_usadas_mes || 0} / {agent.limite_mensagens_mes}
                  </TableCell>
                  <TableCell>
                    <Badge variant={agent.ativo ? "default" : "secondary"}>
                      {agent.ativo ? "Ativo" : "Inativo"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEditDialog(agent)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                            <AlertDialogDescription>
                              Tem certeza que deseja excluir o agente {agent.nome_agente}?
                              Esta ação não pode ser desfeita.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => deletarAgente(agent.id)}
                            >
                              Excluir
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
