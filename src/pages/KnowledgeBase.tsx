import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useAgents } from "@/hooks/useAgents";
import { useWhatsAppClients } from "@/hooks/useWhatsAppClients";
import { supabase } from "@/integrations/supabase/client";
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
import { Plus, Pencil, Trash2, BookOpen, FileText, Layers } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface Document {
  id: number;
  content: string;
  metadata: any;
  agent_id: string | null;
  tenant_id: number;
  created_at: string;
}

export default function KnowledgeBase() {
  const { userSession } = useAuth();
  const { agentes } = useAgents();
  const { clientes } = useWhatsAppClients();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingDoc, setEditingDoc] = useState<Document | null>(null);
  const [formData, setFormData] = useState({
    client_id: "",
    agent_id: "",
    content: "",
    title: "",
  });
  const [filteredAgents, setFilteredAgents] = useState<any[]>([]);

  useEffect(() => {
    loadDocuments();
  }, []);

  useEffect(() => {
    if (formData.client_id) {
      const filtered = agentes.filter((a: any) => a.client_id === formData.client_id);
      setFilteredAgents(filtered);
    } else {
      setFilteredAgents([]);
    }
  }, [formData.client_id, agentes]);

  const loadDocuments = async () => {
    try {
      const { data, error } = await supabase
        .from("documents")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setDocuments(data || []);
    } catch (error) {
      console.error("Error loading documents:", error);
      toast({
        title: "Erro ao carregar documentos",
        description: "Não foi possível carregar a base de conhecimento.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const docData = {
        content: formData.content,
        metadata: { title: formData.title, client_id: formData.client_id },
        agent_id: formData.agent_id || null,
        tenant_id: userSession?.tenant?.id!,
      };

      if (editingDoc) {
        const { error } = await supabase
          .from("documents")
          .update(docData)
          .eq("id", editingDoc.id);

        if (error) throw error;
        toast({
          title: "Documento atualizado!",
          description: "As informações foram salvas com sucesso.",
        });
      } else {
        const { error } = await supabase.from("documents").insert([docData]);

        if (error) throw error;
        toast({
          title: "Documento criado!",
          description: "O documento foi adicionado à base de conhecimento.",
        });
      }

      setDialogOpen(false);
      resetForm();
      loadDocuments();
    } catch (error: any) {
      console.error("Error saving document:", error);
      toast({
        title: "Erro ao salvar documento",
        description: error.message || "Não foi possível salvar o documento.",
        variant: "destructive",
      });
    }
  };

  const deleteDocument = async (id: number) => {
    try {
      const { error } = await supabase.from("documents").delete().eq("id", id);

      if (error) throw error;

      toast({
        title: "Documento excluído",
        description: "O documento foi removido da base de conhecimento.",
      });
      loadDocuments();
    } catch (error: any) {
      console.error("Error deleting document:", error);
      toast({
        title: "Erro ao excluir documento",
        description: error.message || "Não foi possível excluir o documento.",
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setFormData({
      client_id: "",
      agent_id: "",
      content: "",
      title: "",
    });
    setEditingDoc(null);
  };

  const openEditDialog = (doc: Document) => {
    setEditingDoc(doc);
    setFormData({
      client_id: doc.metadata?.client_id || "",
      agent_id: doc.agent_id || "",
      content: doc.content,
      title: doc.metadata?.title || "",
    });
    setDialogOpen(true);
  };

  const getAgentName = (agentId: string | null) => {
    if (!agentId) return "-";
    const agent = agentes.find((a: any) => a.id === agentId);
    return agent ? agent.nome_agente : "-";
  };

  const getClientName = (metadata: any) => {
    if (!metadata?.client_id) return "-";
    const client = clientes.find((c) => c.id === metadata.client_id);
    return client ? client.nome_empresa : "-";
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
          <h1 className="text-3xl font-bold">Base de Conhecimento</h1>
          <p className="text-muted-foreground mt-1">
            Gerencie documentos vinculados a agentes e clientes
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="mr-2 h-4 w-4" />
              Novo Documento
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>
                {editingDoc ? "Editar Documento" : "Novo Documento"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Título *</Label>
                <Input
                  id="title"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="client_id">Cliente *</Label>
                  <Select
                    value={formData.client_id}
                    onValueChange={(value) =>
                      setFormData({ ...formData, client_id: value, agent_id: "" })
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
                  <Label htmlFor="agent_id">Agente *</Label>
                  <Select
                    value={formData.agent_id}
                    onValueChange={(value) => setFormData({ ...formData, agent_id: value })}
                    required
                    disabled={!formData.client_id}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um agente" />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredAgents.map((agent: any) => (
                        <SelectItem key={agent.id} value={agent.id}>
                          {agent.nome_agente}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="content">Conteúdo *</Label>
                <Textarea
                  id="content"
                  required
                  rows={10}
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  placeholder="Digite o conteúdo do documento..."
                />
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
            <CardTitle className="text-sm font-medium">Total de Documentos</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{documents.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Agentes Vinculados</CardTitle>
            <Layers className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Set(documents.filter((d) => d.agent_id).map((d) => d.agent_id)).size}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Clientes Atendidos</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Set(documents.map((d) => d.metadata?.client_id).filter(Boolean)).size}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Documentos</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Título</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Agente</TableHead>
                <TableHead>Criado em</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {documents.map((doc) => (
                <TableRow key={doc.id}>
                  <TableCell className="font-medium">{doc.metadata?.title || "Sem título"}</TableCell>
                  <TableCell>{getClientName(doc.metadata)}</TableCell>
                  <TableCell>{getAgentName(doc.agent_id)}</TableCell>
                  <TableCell>{new Date(doc.created_at).toLocaleDateString()}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="icon" onClick={() => openEditDialog(doc)}>
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
                              Tem certeza que deseja excluir este documento? Esta ação não pode ser
                              desfeita.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => deleteDocument(doc.id)}>
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
