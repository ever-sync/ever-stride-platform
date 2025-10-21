import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { FileText, Download } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { CostReport } from "@/types/database";

export default function Reports() {
  const { userSession } = useAuth();
  const [reports, setReports] = useState<CostReport[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userSession?.tenant) {
      loadReports();
    }
  }, [userSession]);

  const loadReports = async () => {
    if (!userSession?.tenant?.id) return;

    try {
      const { data, error } = await supabase
        .from("relatorios_custos")
        .select("*")
        .eq("tenant_id", userSession.tenant.id)
        .order("periodo_fim", { ascending: false })
        .limit(10);

      if (error) throw error;
      setReports(data || []);
    } catch (error) {
      console.error("Error loading reports:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Relatórios de Custos</h1>
          <p className="text-muted-foreground mt-1">Acompanhe seus gastos</p>
        </div>
        <Button>
          <FileText className="mr-2 h-4 w-4" />
          Gerar Relatório
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Relatórios Recentes</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Carregando...</div>
          ) : reports.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum relatório encontrado
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Período</TableHead>
                  <TableHead>Modelo</TableHead>
                  <TableHead className="text-right">Conversas</TableHead>
                  <TableHead className="text-right">Mensagens</TableHead>
                  <TableHead className="text-right">Tokens</TableHead>
                  <TableHead className="text-right">Custo</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reports.map((report) => (
                  <TableRow key={report.id}>
                    <TableCell>
                      {format(new Date(report.periodo_inicio), "dd/MM/yyyy", {
                        locale: ptBR,
                      })}{" "}
                      -{" "}
                      {format(new Date(report.periodo_fim), "dd/MM/yyyy", { locale: ptBR })}
                    </TableCell>
                    <TableCell>{report.llm_modelo || "N/A"}</TableCell>
                    <TableCell className="text-right">
                      {report.conversas.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right">
                      {report.mensagens.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right">
                      {report.tokens_total.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      R$ {Number(report.custo_final).toFixed(2)}
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm">
                        <Download className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
