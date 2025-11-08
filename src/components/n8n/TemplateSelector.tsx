import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
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
  
  // Template specific customization fields
  const [scriptAtendimento, setScriptAtendimento] = useState("");
  const [saudacao, setSaudacao] = useState("");
  const [codigoPausar, setCodigoPausar] = useState("PAUSAR_ATENDIMENTO");
  const [codigoVendedor, setCodigoVendedor] = useState("TRANSFERIR_VENDEDOR");
  const [codigoGrupo, setCodigoGrupo] = useState("TRANSFERIR_GRUPO");
  const [codigoVerificarSistema, setCodigoVerificarSistema] = useState("CONSULTAR_ESTOQUE");
  const [codigoAvaliacao, setCodigoAvaliacao] = useState("AVALIACAO");
  
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
      // Prepare customizations based on template type
      let customizations = undefined;
      
      if (selectedTemplate?.name.includes('Carros')) {
        customizations = {
          script_atendimento: scriptAtendimento,
          codigo_pausar_ia: codigoPausar,
          codigo_transferir_vendedor: codigoVendedor,
          codigo_transferir_grupo: codigoGrupo,
          codigo_verificar_sistema: codigoVerificarSistema
        };
      } else if (selectedTemplate?.name.includes('Atendimento Humanizado')) {
        customizations = {
          script_atendimento: scriptAtendimento,
          saudacao: saudacao,
          codigo_pausar_ia: codigoPausar,
          codigo_transferir_vendedor: codigoVendedor,
          codigo_transferir_grupo: codigoGrupo,
          codigo_avaliacao: codigoAvaliacao
        };
      }

      await createFromTemplate(
        selectedTemplate.id,
        selectedAgentId,
        selectedAgent.client_id || selectedAgentId, // Use client_id or fallback to agent_id
        tenantId,
        workflowName,
        customizations
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

          {selectedAgentId && activeAgents.find(a => a.id === selectedAgentId) && (
            <Alert className="bg-primary/5 border-primary/20">
              <CheckCircle2 className="h-4 w-4 text-primary" />
              <AlertDescription>
                Este workflow será vinculado ao agente <strong>{activeAgents.find(a => a.id === selectedAgentId)?.nome_agente}</strong>.
                Todas as configurações do agente (script, modelo IA, parâmetros) serão usadas automaticamente pelo workflow.
                O ID do workflow será salvo no banco de dados para permitir consultas dinâmicas.
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

          {/* Template-specific configuration fields */}
          {selectedTemplate?.name.includes('Carros') && (
            <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
              <h4 className="font-semibold text-sm flex items-center gap-2">
                🚗 Configurações do Template de Carros
              </h4>
              
              <div className="space-y-2">
                <Label htmlFor="script">Script de Atendimento</Label>
                <Textarea
                  id="script"
                  placeholder="Olá! Sou a Amanda, assistente virtual da concessionária..."
                  rows={4}
                  value={scriptAtendimento}
                  onChange={(e) => setScriptAtendimento(e.target.value)}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="codigo-pausar">Código para Pausar IA</Label>
                  <Input
                    id="codigo-pausar"
                    placeholder="PAUSAR_ATENDIMENTO"
                    value={codigoPausar}
                    onChange={(e) => setCodigoPausar(e.target.value)}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="codigo-vendedor">Código Transferir Vendedor</Label>
                  <Input
                    id="codigo-vendedor"
                    placeholder="TRANSFERIR_VENDEDOR"
                    value={codigoVendedor}
                    onChange={(e) => setCodigoVendedor(e.target.value)}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="codigo-grupo">Código Transferir Grupo</Label>
                  <Input
                    id="codigo-grupo"
                    placeholder="TRANSFERIR_GRUPO"
                    value={codigoGrupo}
                    onChange={(e) => setCodigoGrupo(e.target.value)}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="codigo-verificar">Código Verificar Sistema</Label>
                  <Input
                    id="codigo-verificar"
                    placeholder="CONSULTAR_ESTOQUE"
                    value={codigoVerificarSistema}
                    onChange={(e) => setCodigoVerificarSistema(e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}
          
          {selectedTemplate?.name.includes('Atendimento Humanizado') && (
            <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
              <h4 className="font-semibold text-sm flex items-center gap-2">
                🤝 Configurações do Atendimento Humanizado
              </h4>
              
              <div className="space-y-2">
                <Label htmlFor="saudacao">Saudação Inicial</Label>
                <Textarea
                  id="saudacao"
                  placeholder="Olá! Tudo bem? Seja bem-vindo(a)..."
                  rows={2}
                  value={saudacao}
                  onChange={(e) => setSaudacao(e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="script-humanizado">Script de Atendimento</Label>
                <Textarea
                  id="script-humanizado"
                  placeholder="Você é um assistente humanizado. Seja empático, educado e ajude o cliente..."
                  rows={4}
                  value={scriptAtendimento}
                  onChange={(e) => setScriptAtendimento(e.target.value)}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="codigo-pausar-h">Código Pausar IA</Label>
                  <Input
                    id="codigo-pausar-h"
                    placeholder="PAUSAR_ATENDIMENTO"
                    value={codigoPausar}
                    onChange={(e) => setCodigoPausar(e.target.value)}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="codigo-vendedor-h">Código Transferir Vendedor</Label>
                  <Input
                    id="codigo-vendedor-h"
                    placeholder="TRANSFERIR_VENDEDOR"
                    value={codigoVendedor}
                    onChange={(e) => setCodigoVendedor(e.target.value)}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="codigo-grupo-h">Código Transferir Grupo</Label>
                  <Input
                    id="codigo-grupo-h"
                    placeholder="TRANSFERIR_GRUPO"
                    value={codigoGrupo}
                    onChange={(e) => setCodigoGrupo(e.target.value)}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="codigo-avaliacao">Código Avaliação</Label>
                  <Input
                    id="codigo-avaliacao"
                    placeholder="AVALIACAO"
                    value={codigoAvaliacao}
                    onChange={(e) => setCodigoAvaliacao(e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}

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
                
                {/* Lista de funcionalidades específicas por template */}
                {template.name.includes('Carros') && (
                  <div className="mt-3 space-y-1">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <CheckCircle2 className="h-3 w-3 text-green-500" />
                      Consulta de estoque automatizada
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <CheckCircle2 className="h-3 w-3 text-green-500" />
                      Simulação de financiamento
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <CheckCircle2 className="h-3 w-3 text-green-500" />
                      Transferência inteligente para vendedores
                    </div>
                  </div>
                )}
                
                {template.name.includes('Atendimento Humanizado') && (
                  <div className="mt-3 space-y-1">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <CheckCircle2 className="h-3 w-3 text-green-500" />
                      Múltiplos fluxos de atendimento
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <CheckCircle2 className="h-3 w-3 text-green-500" />
                      Transferência para vendedor/grupo
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <CheckCircle2 className="h-3 w-3 text-green-500" />
                      Sistema de avaliação integrado
                    </div>
                  </div>
                )}
                
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
                  {template.difficulty_level === 'avancado' && (
                    <Badge className="text-xs bg-gradient-to-r from-purple-500 to-pink-500">
                      Premium
                    </Badge>
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
