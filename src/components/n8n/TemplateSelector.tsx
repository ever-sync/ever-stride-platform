import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Brain, 
  BookOpen, 
  UserCheck, 
  Zap,
  CheckCircle2,
  TrendingUp,
  Search
} from "lucide-react";
import type { N8NWorkflowTemplate } from "@/types/n8n";
import { DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useN8NWorkflows } from "@/hooks/useN8NWorkflows";
import { toast } from "sonner";

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
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const { createFromTemplate, operationLoading } = useN8NWorkflows();

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

    // For demo purposes, using placeholder IDs
    // In production, these should come from the agent/client selection
    try {
      await createFromTemplate(
        selectedTemplate.id,
        "placeholder-agent-id",
        "placeholder-client-id",
        1, // tenant_id
        workflowName
      );
      onSelect();
    } catch (error) {
      // Error handled in hook
    }
  };

  if (selectedTemplate) {
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

          <div className="space-y-2">
            <Label htmlFor="workflow-name">Nome do Workflow</Label>
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
              }}
              disabled={operationLoading}
            >
              Voltar
            </Button>
            <Button 
              className="flex-1" 
              onClick={handleCreate}
              disabled={operationLoading || !workflowName.trim()}
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
