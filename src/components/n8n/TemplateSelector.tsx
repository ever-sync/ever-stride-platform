import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Brain, 
  BookOpen, 
  UserCheck, 
  Zap,
  CheckCircle2,
  TrendingUp,
  Search,
  AlertCircle
} from "lucide-react";
import type { N8NWorkflowTemplate } from "@/types/n8n";
import { DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useN8NWorkflows } from "@/hooks/useN8NWorkflows";
import { useAgents } from "@/hooks/useAgents";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface TemplateSelectorProps {
  templates: N8NWorkflowTemplate[];
  onSelect: () => void;
}

const categoryIcons: Record<string, any> = {
  atendimento: Brain,
  conhecimento: BookOpen,
  aprovacao: UserCheck,
  integracao: Zap
};

const difficultyColors: Record<string, string> = {
  basico: "bg-green-500",
  intermediario: "bg-yellow-500",
  avancado: "bg-red-500"
};

export function TemplateSelector({ templates, onSelect }: TemplateSelectorProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<N8NWorkflowTemplate | null>(null);
  const [workflowName, setWorkflowName] = useState("");
  const [selectedAgentId, setSelectedAgentId] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const { createFromTemplate, operationLoading } = useN8NWorkflows();
  const { agentes, loading: loadingAgents } = useAgents();
  const { userSession } = useAuth();
  
  const tenantId = userSession?.tenantUser?.tenant_id;

  const filteredTemplates = templates.filter(template => {
    const matchesSearch = template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === "all" || template.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const handleCreate = async () => {
    if (!selectedTemplate || !workflowName.trim()) {
      toast.error("Preencha o nome do workflow");
      return;
    }

    if (!selectedAgentId) {
      toast.error("Selecione um agente");
      return;
    }

    if (!tenantId) {
      toast.error("Tenant não identificado");
      return;
    }

    const selectedAgent = agentes.find(a => a.id === selectedAgentId);
    if (!selectedAgent) {
      toast.error("Agente selecionado não encontrado");
      return;
    }

    try {
      await createFromTemplate(
        selectedTemplate.id,
        selectedAgentId,
        selectedAgent.client_id || selectedAgentId, // Use client_id or fallback to agent_id
        tenantId,
        workflowName
      );
      onSelect();
    } catch (error) {
      // Error handled in hook
    }
  };

  if (selectedTemplate) {
    const activeAgents = agentes.filter(a => a.ativo);
    
    return (
      <div className="space-y-6">
        <DialogHeader>
          <DialogTitle>Configurar Workflow: {selectedTemplate.name}</DialogTitle>
          <DialogDescription>{selectedTemplate.description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex gap-2">
            <Badge>{selectedTemplate.category}</Badge>
            <Badge variant="outline">{selectedTemplate.difficulty_level}</Badge>
            {selectedTemplate.has_ai && <Badge variant="secondary">IA</Badge>}
            {selectedTemplate.has_knowledge_base && <Badge variant="secondary">Base de Conhecimento</Badge>}
          </div>

          {activeAgents.length === 0 && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Nenhum agente ativo encontrado. Crie e ative um agente antes de criar workflows.
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="agent-select">Agente *</Label>
            <Select value={selectedAgentId} onValueChange={setSelectedAgentId} disabled={loadingAgents || activeAgents.length === 0}>
              <SelectTrigger id="agent-select">
                <SelectValue placeholder="Selecione um agente" />
              </SelectTrigger>
              <SelectContent>
                {activeAgents.map((agent) => (
                  <SelectItem key={agent.id} value={agent.id}>
                    {agent.nome_agente}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="workflow-name">Nome do Workflow *</Label>
            <Input
              id="workflow-name"
              placeholder="Ex: Atendimento Cliente - Vendas"
              value={workflowName}
              onChange={(e) => setWorkflowName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Integrações Necessárias</Label>
            <div className="flex flex-wrap gap-2">
              {selectedTemplate.required_integrations.map((integration) => (
                <Badge key={integration} variant="outline">
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                  {integration}
                </Badge>
              ))}
            </div>
          </div>

          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={() => {
                setSelectedTemplate(null);
                setWorkflowName("");
                setSelectedAgentId("");
              }}
              disabled={operationLoading}
            >
              Voltar
            </Button>
            <Button 
              className="flex-1" 
              onClick={handleCreate}
              disabled={operationLoading || !workflowName.trim() || !selectedAgentId || activeAgents.length === 0}
            >
              Criar Workflow
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <DialogHeader>
        <DialogTitle>Escolha um Template</DialogTitle>
        <DialogDescription>
          Selecione um template pré-configurado para começar rapidamente
        </DialogDescription>
      </DialogHeader>

      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar templates..."
            className="pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <Tabs value={categoryFilter} onValueChange={setCategoryFilter}>
        <TabsList className="grid grid-cols-5 w-full">
          <TabsTrigger value="all">Todos</TabsTrigger>
          <TabsTrigger value="atendimento">Atendimento</TabsTrigger>
          <TabsTrigger value="conhecimento">Conhecimento</TabsTrigger>
          <TabsTrigger value="aprovacao">Aprovação</TabsTrigger>
          <TabsTrigger value="integracao">Integração</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="grid gap-4 md:grid-cols-2 max-h-[400px] overflow-y-auto">
        {filteredTemplates.map((template) => {
          const Icon = categoryIcons[template.category] || Brain;
          return (
            <Card 
              key={template.id} 
              className="cursor-pointer hover:border-primary transition-colors"
              onClick={() => setSelectedTemplate(template)}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-base">{template.icon} {template.name}</CardTitle>
                      <div className="flex gap-1 mt-1">
                        <div className={`w-2 h-2 rounded-full ${difficultyColors[template.difficulty_level]}`} />
                        <span className="text-xs text-muted-foreground capitalize">
                          {template.difficulty_level}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <TrendingUp className="h-3 w-3" />
                    {template.usage_count}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {template.description}
                </p>
                <div className="flex flex-wrap gap-1 mt-3">
                  {template.has_ai && (
                    <Badge variant="secondary" className="text-xs">IA</Badge>
                  )}
                  {template.has_knowledge_base && (
                    <Badge variant="secondary" className="text-xs">KB</Badge>
                  )}
                  {template.has_human_handoff && (
                    <Badge variant="secondary" className="text-xs">Humano</Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {filteredTemplates.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">Nenhum template encontrado</p>
        </div>
      )}
    </div>
  );
}
