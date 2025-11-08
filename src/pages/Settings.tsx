import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { N8NNotificationSettings } from "@/components/n8n/N8NNotificationSettings";
import { useIsSuperAdmin } from "@/hooks/useIsSuperAdmin";
import { loadCarrosTemplateToDatabase } from "@/lib/load-template-helper";
import { loadAtendimentoHumanizadoTemplateToDatabase } from "@/lib/load-atendimento-humanizado-helper";
import { Upload, CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function Settings() {
  const { isSuperAdmin } = useIsSuperAdmin();
  const [loadingCarros, setLoadingCarros] = useState(false);
  const [loadingHumanizado, setLoadingHumanizado] = useState(false);
  const [carrosLoaded, setCarrosLoaded] = useState(false);
  const [humanizadoLoaded, setHumanizadoLoaded] = useState(false);

  const handleLoadCarrosTemplate = async () => {
    try {
      setLoadingCarros(true);
      await loadCarrosTemplateToDatabase();
      setCarrosLoaded(true);
      toast.success("Template de Carros carregado com sucesso!");
    } catch (error) {
      console.error("Error loading Carros template:", error);
      toast.error("Erro ao carregar template de Carros");
    } finally {
      setLoadingCarros(false);
    }
  };

  const handleLoadAtendimentoHumanizadoTemplate = async () => {
    try {
      setLoadingHumanizado(true);
      await loadAtendimentoHumanizadoTemplateToDatabase();
      setHumanizadoLoaded(true);
      toast.success("Template de Atendimento Humanizado carregado com sucesso!");
    } catch (error) {
      console.error("Error loading Atendimento Humanizado template:", error);
      toast.error("Erro ao carregar template de Atendimento Humanizado");
    } finally {
      setLoadingHumanizado(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Configurações</h1>
        <p className="text-muted-foreground mt-1">Gerencie suas configurações</p>
      </div>

      <Tabs defaultValue={isSuperAdmin ? "templates" : "notifications"} className="space-y-4">
        <TabsList>
          {isSuperAdmin && <TabsTrigger value="templates">Templates N8N</TabsTrigger>}
          <TabsTrigger value="notifications">Notificações</TabsTrigger>
          <TabsTrigger value="ai">IA</TabsTrigger>
          <TabsTrigger value="billing">Faturamento</TabsTrigger>
        </TabsList>
        
        {isSuperAdmin && (
          <TabsContent value="templates" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Templates de Workflow N8N</CardTitle>
                <CardDescription>
                  Carregue templates pré-configurados no banco de dados para uso em workflows
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Alert>
                  <AlertDescription>
                    ℹ️ <strong>Passo a passo:</strong>
                    <ol className="list-decimal ml-6 mt-2 space-y-1">
                      <li>Carregue os templates aqui clicando em "Carregar Template"</li>
                      <li>Vá para <strong>Integrações</strong> e clique em "Novo Workflow"</li>
                      <li>Selecione um template e <strong>escolha um agente</strong></li>
                      <li>Configure os parâmetros personalizados (opcional)</li>
                      <li>O workflow será <strong>automaticamente vinculado</strong> ao agente e cliente</li>
                    </ol>
                  </AlertDescription>
                </Alert>

                <div className="grid gap-4 md:grid-cols-2">
                  {/* Template Carros */}
                  <Card className={carrosLoaded ? "border-green-500 bg-green-50/50 dark:bg-green-950/20" : ""}>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        🚗 Vendas de Carros
                        {carrosLoaded && <CheckCircle2 className="h-5 w-5 text-green-500" />}
                      </CardTitle>
                      <CardDescription>
                        Template para concessionárias com consulta de estoque e simulação de financiamento
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Button 
                        onClick={handleLoadCarrosTemplate}
                        disabled={loadingCarros || carrosLoaded}
                        className="w-full"
                      >
                        {loadingCarros ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Carregando...
                          </>
                        ) : carrosLoaded ? (
                          <>
                            <CheckCircle2 className="mr-2 h-4 w-4" />
                            Template Carregado
                          </>
                        ) : (
                          <>
                            <Upload className="mr-2 h-4 w-4" />
                            Carregar Template
                          </>
                        )}
                      </Button>
                    </CardContent>
                  </Card>

                  {/* Template Atendimento Humanizado */}
                  <Card className={humanizadoLoaded ? "border-green-500 bg-green-50/50 dark:bg-green-950/20" : ""}>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        🤝 Atendimento Humanizado
                        {humanizadoLoaded && <CheckCircle2 className="h-5 w-5 text-green-500" />}
                      </CardTitle>
                      <CardDescription>
                        Template completo com IA, transferências, pausar bot e avaliação de atendimento
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Button 
                        onClick={handleLoadAtendimentoHumanizadoTemplate}
                        disabled={loadingHumanizado || humanizadoLoaded}
                        className="w-full"
                      >
                        {loadingHumanizado ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Carregando...
                          </>
                        ) : humanizadoLoaded ? (
                          <>
                            <CheckCircle2 className="mr-2 h-4 w-4" />
                            Template Carregado
                          </>
                        ) : (
                          <>
                            <Upload className="mr-2 h-4 w-4" />
                            Carregar Template
                          </>
                        )}
                      </Button>
                    </CardContent>
                  </Card>
                </div>

                <Alert className="bg-primary/5 border-primary/20">
                  <AlertDescription>
                    <strong>✅ Vinculação Automática:</strong> Quando você criar um workflow, ele será automaticamente vinculado ao agente selecionado. O <code>workflow_id</code> será salvo no banco de dados, permitindo que os nodes do N8N busquem as configurações do agente dinamicamente usando <code>${'$'}workflow.id</code>.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </TabsContent>
        )}
        <TabsContent value="notifications" className="space-y-4">
          {isSuperAdmin && <N8NNotificationSettings />}
        </TabsContent>
        <TabsContent value="ai">
          <Card>
            <CardHeader>
              <CardTitle>Configurações de IA</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Em desenvolvimento...</p>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="billing">
          <Card>
            <CardHeader>
              <CardTitle>Configurações de Faturamento</CardTitle>
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
