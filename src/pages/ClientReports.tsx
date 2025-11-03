import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Download, TrendingUp, MessageSquare, DollarSign, Activity } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

interface WhatsAppClient {
  id: string;
  nome_empresa: string;
}

interface ReportData {
  periodo_inicio: string;
  periodo_fim: string;
  conversas: number;
  mensagens: number;
  execucoes: number;
  tokens_total: number;
  custo_final: number;
  llm_modelo: string;
}

export default function ClientReports() {
  const { userSession } = useAuth();
  const [clients, setClients] = useState<WhatsAppClient[]>([]);
  const [selectedClient, setSelectedClient] = useState<string>("");
  const [reports, setReports] = useState<ReportData[]>([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({
    totalConversas: 0,
    totalMensagens: 0,
    totalCusto: 0,
    totalTokens: 0,
  });

  useEffect(() => {
    loadClients();
  }, [userSession]);

  const loadClients = async () => {
    if (!userSession?.tenant?.id) return;

    const { data, error } = await supabase
      .from("whatsapp_clients")
      .select("id, nome_empresa")
      .eq("tenant_id", userSession.tenant.id)
      .order("nome_empresa");

    if (error) {
      toast.error("Erro ao carregar clientes");
      return;
    }

    setClients(data || []);
  };

  const loadReports = async (clientId: string) => {
    if (!userSession?.tenant?.id || !clientId) return;

    setLoading(true);
    
    // Buscar relatórios de custos relacionados ao tenant
    const { data, error } = await supabase
      .from("relatorios_custos")
      .select("*")
      .eq("tenant_id", userSession.tenant.id)
      .order("periodo_fim", { ascending: false })
      .limit(10);

    if (error) {
      toast.error("Erro ao carregar relatórios");
      setLoading(false);
      return;
    }

    setReports(data || []);

    // Calcular estatísticas
    const totalConversas = data?.reduce((sum, r) => sum + (r.conversas || 0), 0) || 0;
    const totalMensagens = data?.reduce((sum, r) => sum + (r.mensagens || 0), 0) || 0;
    const totalCusto = data?.reduce((sum, r) => sum + (Number(r.custo_final) || 0), 0) || 0;
    const totalTokens = data?.reduce((sum, r) => sum + (Number(r.tokens_total) || 0), 0) || 0;

    setStats({
      totalConversas,
      totalMensagens,
      totalCusto,
      totalTokens,
    });

    setLoading(false);
  };

  const handleClientChange = (clientId: string) => {
    setSelectedClient(clientId);
    loadReports(clientId);
  };

  const downloadReport = (report: ReportData) => {
    const csv = `Período Início,Período Fim,Conversas,Mensagens,Execuções,Tokens,Custo,Modelo
${format(new Date(report.periodo_inicio), "dd/MM/yyyy", { locale: ptBR })},${format(new Date(report.periodo_fim), "dd/MM/yyyy", { locale: ptBR })},${report.conversas},${report.mensagens},${report.execucoes},${report.tokens_total},R$ ${Number(report.custo_final).toFixed(2)},${report.llm_modelo}`;

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `relatorio_${format(new Date(report.periodo_inicio), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold">Relatórios por Cliente</h1>
        <p className="text-muted-foreground mt-1">Visualize e analise dados de uso por cliente</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Selecionar Cliente</CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={selectedClient} onValueChange={handleClientChange}>
            <SelectTrigger className="w-full sm:w-[300px]">
              <SelectValue placeholder="Selecione um cliente" />
            </SelectTrigger>
            <SelectContent>
              {clients.map((client) => (
                <SelectItem key={client.id} value={client.id}>
                  {client.nome_empresa}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {selectedClient && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Conversas</CardTitle>
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalConversas}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Mensagens</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalMensagens}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Custo Total</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  R$ {stats.totalCusto.toFixed(2)}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Tokens</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {(stats.totalTokens / 1000).toFixed(1)}k
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Histórico de Relatórios</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-center text-muted-foreground py-8">Carregando...</p>
              ) : reports.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Nenhum relatório encontrado para este cliente
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Período</TableHead>
                        <TableHead className="hidden sm:table-cell">Modelo</TableHead>
                        <TableHead className="text-right">Conversas</TableHead>
                        <TableHead className="text-right hidden md:table-cell">Mensagens</TableHead>
                        <TableHead className="text-right hidden lg:table-cell">Tokens</TableHead>
                        <TableHead className="text-right">Custo</TableHead>
                        <TableHead className="text-center">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {reports.map((report, index) => (
                        <TableRow key={index}>
                          <TableCell className="font-medium text-sm">
                            {format(new Date(report.periodo_inicio), "dd/MM/yy", {
                              locale: ptBR,
                            })}{" "}
                            -{" "}
                            {format(new Date(report.periodo_fim), "dd/MM/yy", {
                              locale: ptBR,
                            })}
                          </TableCell>
                          <TableCell className="hidden sm:table-cell text-sm">
                            {report.llm_modelo}
                          </TableCell>
                          <TableCell className="text-right">{report.conversas}</TableCell>
                          <TableCell className="text-right hidden md:table-cell">
                            {report.mensagens}
                          </TableCell>
                          <TableCell className="text-right hidden lg:table-cell">
                            {(report.tokens_total / 1000).toFixed(1)}k
                          </TableCell>
                          <TableCell className="text-right">
                            R$ {Number(report.custo_final).toFixed(2)}
                          </TableCell>
                          <TableCell className="text-center">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => downloadReport(report)}
                              className="h-8 w-8"
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
