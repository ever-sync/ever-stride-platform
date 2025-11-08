import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, FileText, FileSpreadsheet } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

interface ExportDialogProps {
  data: any[];
  filename: string;
  type: "chats" | "messages";
}

export function ExportDialog({ data, filename, type }: ExportDialogProps) {
  const [format, setFormat] = useState<"csv" | "pdf">("csv");
  const [loading, setLoading] = useState(false);

  const exportToCSV = () => {
    if (data.length === 0) {
      toast.error("Não há dados para exportar");
      return;
    }

    setLoading(true);
    try {
      let csvContent = "";
      
      if (type === "chats") {
        // Header
        csvContent = "ID,Telefone,Data Criação,Status Bot,Transferido,Total Mensagens,Sessão\n";
        
        // Data rows
        data.forEach((chat: any) => {
          const row = [
            chat.id,
            chat.phone || "",
            new Date(chat.created_at).toLocaleString('pt-BR'),
            chat.bot_paused ? "Pausado" : "Ativo",
            chat.transferred_to_human ? "Sim" : "Não",
            chat.message_count || 0,
            chat.waha_sessions?.session_name || ""
          ];
          csvContent += row.map(field => `"${field}"`).join(",") + "\n";
        });
      } else {
        // Messages export
        csvContent = "ID Chat,Remetente,Tipo,Mensagem,Data\n";
        
        data.forEach((msg: any) => {
          const message = msg.user_message || msg.bot_message || "";
          const tipo = msg.user_message ? "Usuário" : "Bot";
          const row = [
            msg.chat_id,
            msg.phone || msg.nomewpp || "",
            tipo,
            message.replace(/"/g, '""'), // Escape quotes
            new Date(msg.created_at).toLocaleString('pt-BR')
          ];
          csvContent += row.map(field => `"${field}"`).join(",") + "\n";
        });
      }

      // Create and download file
      const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      
      link.setAttribute("href", url);
      link.setAttribute("download", `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success("Arquivo CSV exportado com sucesso!");
    } catch (error: any) {
      toast.error("Erro ao exportar: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const exportToPDF = () => {
    toast.info("Funcionalidade PDF em desenvolvimento. Use CSV por enquanto.");
  };

  const handleExport = () => {
    if (format === "csv") {
      exportToCSV();
    } else {
      exportToPDF();
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Download className="h-4 w-4 mr-2" />
          Exportar
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Exportar Dados</DialogTitle>
          <DialogDescription>
            Escolha o formato de exportação para os dados filtrados
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-3">
            <Label>Formato de Exportação</Label>
            <RadioGroup value={format} onValueChange={(v) => setFormat(v as "csv" | "pdf")}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="csv" id="csv" />
                <Label htmlFor="csv" className="flex items-center cursor-pointer">
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                  CSV (Excel, Google Sheets)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="pdf" id="pdf" />
                <Label htmlFor="pdf" className="flex items-center cursor-pointer">
                  <FileText className="h-4 w-4 mr-2" />
                  PDF (Em desenvolvimento)
                </Label>
              </div>
            </RadioGroup>
          </div>

          <div className="bg-muted p-3 rounded-lg">
            <p className="text-sm text-muted-foreground">
              <strong>{data.length}</strong> {type === "chats" ? "conversas" : "mensagens"} serão exportadas
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => {}}>
            Cancelar
          </Button>
          <Button onClick={handleExport} disabled={loading || data.length === 0}>
            {loading ? "Exportando..." : "Exportar"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
