import { useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Search, 
  Plus, 
  Activity, 
  Workflow, 
  Webhook, 
  Link as LinkIcon,
  Filter,
  TrendingUp,
  ExternalLink,
  Upload
} from "lucide-react";
import { useN8NWorkflows } from "@/hooks/useN8NWorkflows";
import { WorkflowCard } from "@/components/n8n/WorkflowCard";
import { TemplateSelector } from "@/components/n8n/TemplateSelector";
import { N8NHealthStatus } from "@/components/n8n/N8NHealthStatus";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { loadCarrosTemplateToDatabase } from "@/lib/load-template-helper";
import { loadAtendimentoHumanizadoTemplateToDatabase } from "@/lib/load-atendimento-humanizado-helper";
import { toast } from "sonner";

export default function Integrations() {
  const { workflows, templates, loading, operationLoading, reload } = useN8NWorkflows();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [templateFilter, setTemplateFilter] = useState<string>("all");
  const [showTemplateSelector, setShowTemplateSelector] = useState(false);
  const [loadingTemplate, setLoadingTemplate] = useState(false);

  const handleLoadCarrosTemplate = async () => {
    try {
      setLoadingTemplate(true);
      await loadCarrosTemplateToDatabase();
      toast.success("Template de Carros carregado com sucesso!");
      reload(); // Reload workflows and templates
    } catch (error) {
      console.error("Error loading template:", error);
      toast.error("Erro ao carregar template");
    } finally {
      setLoadingTemplate(false);
    }
  };

  const handleLoadAtendimentoHumanizadoTemplate = async () => {
    try {
      setLoadingTemplate(true);
      await loadAtendimentoHumanizadoTemplateToDatabase();
      toast.success("Template de Atendimento Humanizado carregado com sucesso!");
      reload(); // Reload workflows and templates
    } catch (error) {
      console.error("Error loading template:", error);
      toast.error("Erro ao carregar template");
    } finally {
      setLoadingTemplate(false);
    }
  };

  const filteredWorkflows = workflows.filter(workflow => {
    const matchesSearch = workflow.workflow_name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = 
      statusFilter === "all" ||
      (statusFilter === "active" && workflow.is_active) ||
      (statusFilter === "inactive" && !workflow.is_active) ||
      (statusFilter === "errors" && (workflow.error_rate || 0) > 20);
    
    return matchesSearch && matchesStatus;
  });

  const activeWorkflowsCount = workflows.filter(w => w.is_active).length;
  const n8nUrl = import.meta.env.VITE_N8N_URL || 'http://localhost:5678';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Integrações</h1>
          <p className="text-muted-foreground mt-1">
            Gerencie workflows, webhooks e integrações externas
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="secondary" 
            size="sm"
            onClick={handleLoadCarrosTemplate}
            disabled={loadingTemplate}
          >
            <Upload className="mr-2 h-4 w-4" />
            {loadingTemplate ? "Carregando..." : "Template Carros"}
          </Button>
          <Button 
            variant="secondary" 
            size="sm"
            onClick={handleLoadAtendimentoHumanizadoTemplate}
            disabled={loadingTemplate}
          >
            <Upload className="mr-2 h-4 w-4" />
            {loadingTemplate ? "Carregando..." : "Template Humanizado"}
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link to="/n8n-monitoring">
              <Activity className="mr-2 h-4 w-4" />
              Monitoring
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <a href={`${n8nUrl}/workflow/new`} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="mr-2 h-4 w-4" />
              N8N Editor
            </a>
          </Button>
        </div>
      </div>

      {/* N8N Health Status */}
      <N8NHealthStatus />

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Workflows</CardTitle>
            <Workflow className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{workflows.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Workflows Ativos</CardTitle>
            <Activity className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeWorkflowsCount}</div>
            <p className="text-xs text-muted-foreground mt-1">
              de {workflows.length} total
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Templates Disponíveis</CardTitle>
            <TrendingUp className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{templates.length}</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="workflows" className="space-y-4">
        <TabsList>
          <TabsTrigger value="workflows">
            <Workflow className="mr-2 h-4 w-4" />
            Workflows N8N
          </TabsTrigger>
          <TabsTrigger value="webhooks">
            <Webhook className="mr-2 h-4 w-4" />
            Webhooks
          </TabsTrigger>
          <TabsTrigger value="apis">
            <LinkIcon className="mr-2 h-4 w-4" />
            APIs Externas
          </TabsTrigger>
        </TabsList>

        <TabsContent value="workflows" className="space-y-4">
          {/* Actions Bar */}
          <div className="flex items-center gap-4">
            <div className="flex-1 flex items-center gap-2">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar workflows..."
                  className="pl-8"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]">
                  <Filter className="mr-2 h-4 w-4" />
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="active">Ativos</SelectItem>
                  <SelectItem value="inactive">Inativos</SelectItem>
                  <SelectItem value="errors">Com Erros</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <Dialog open={showTemplateSelector} onOpenChange={setShowTemplateSelector}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Novo Workflow
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                <TemplateSelector 
                  templates={templates}
                  onSelect={() => setShowTemplateSelector(false)}
                />
              </DialogContent>
            </Dialog>
          </div>

          {/* Workflows List */}
          {loading ? (
            <div className="grid gap-4 md:grid-cols-2">
              {[1, 2, 3, 4].map((i) => (
                <Card key={i} className="animate-pulse">
                  <CardHeader>
                    <div className="h-6 bg-muted rounded w-3/4" />
                    <div className="h-4 bg-muted rounded w-1/2 mt-2" />
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="h-4 bg-muted rounded" />
                      <div className="h-4 bg-muted rounded w-5/6" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : filteredWorkflows.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Workflow className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">
                  {searchQuery || statusFilter !== "all"
                    ? "Nenhum workflow encontrado"
                    : "Nenhum workflow criado"}
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  {searchQuery || statusFilter !== "all"
                    ? "Tente ajustar os filtros de busca"
                    : "Comece criando seu primeiro workflow a partir de um template"}
                </p>
                {!searchQuery && statusFilter === "all" && (
                  <Button onClick={() => setShowTemplateSelector(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Criar Primeiro Workflow
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {filteredWorkflows.map((workflow) => (
                <WorkflowCard key={workflow.id} workflow={workflow} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="webhooks">
          <Card>
            <CardHeader>
              <CardTitle>Webhooks</CardTitle>
              <CardDescription>
                Configure webhooks para receber notificações de eventos
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Em desenvolvimento...</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="apis">
          <Card>
            <CardHeader>
              <CardTitle>APIs Externas</CardTitle>
              <CardDescription>
                Conecte serviços externos como CRMs, e-commerce, etc.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Em desenvolvimento...</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
