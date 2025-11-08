import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Copy,
  ExternalLink,
  MoreVertical,
  Pause,
  Play,
  TestTube,
  Trash2,
  TrendingUp,
  Clock,
  CheckCircle2,
  XCircle
} from "lucide-react";
import { toast } from "sonner";
import type { N8NWorkflow } from "@/types/n8n";
import { useN8NWorkflows } from "@/hooks/useN8NWorkflows";
import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface WorkflowCardProps {
  workflow: N8NWorkflow;
}

export function WorkflowCard({ workflow }: WorkflowCardProps) {
  const { toggleActive, deleteWorkflow, operationLoading } = useN8NWorkflows();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(workflow.webhook_url);
    toast.success("URL do webhook copiada!");
  };

  const handleEditInN8N = () => {
    const n8nUrl = import.meta.env.VITE_N8N_URL;
    if (n8nUrl) {
      window.open(`${n8nUrl}/workflow/${workflow.workflow_id}`, '_blank');
    } else {
      toast.error("URL do N8N não configurada");
    }
  };

  const handleToggle = async () => {
    try {
      await toggleActive(workflow.workflow_id, !workflow.is_active);
    } catch (error) {
      // Error is handled in the hook
    }
  };

  const handleDelete = async () => {
    try {
      await deleteWorkflow(workflow.id, workflow.workflow_id);
      setShowDeleteDialog(false);
    } catch (error) {
      // Error is handled in the hook
    }
  };

  const errorRate = workflow.error_rate || 0;
  const successRate = workflow.success_rate || 100;

  return (
    <>
      <Card className={!workflow.is_active ? "opacity-60" : ""}>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <CardTitle className="text-lg">{workflow.workflow_name}</CardTitle>
                {workflow.is_active ? (
                  <Badge variant="default" className="bg-success">
                    <Play className="w-3 h-3 mr-1" />
                    Ativo
                  </Badge>
                ) : (
                  <Badge variant="secondary">
                    <Pause className="w-3 h-3 mr-1" />
                    Inativo
                  </Badge>
                )}
                {errorRate > 20 && (
                  <Badge variant="destructive">
                    {errorRate.toFixed(1)}% erros
                  </Badge>
                )}
              </div>
              <CardDescription className="text-xs">
                {workflow.last_execution
                  ? `Última execução: ${new Date(workflow.last_execution).toLocaleString('pt-BR')}`
                  : 'Nunca executado'}
              </CardDescription>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleCopyUrl}>
                  <Copy className="mr-2 h-4 w-4" />
                  Copiar URL
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleEditInN8N}>
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Editar no N8N
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleToggle} disabled={operationLoading}>
                  {workflow.is_active ? (
                    <>
                      <Pause className="mr-2 h-4 w-4" />
                      Desativar
                    </>
                  ) : (
                    <>
                      <Play className="mr-2 h-4 w-4" />
                      Ativar
                    </>
                  )}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={() => setShowDeleteDialog(true)}
                  className="text-destructive"
                  disabled={operationLoading}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Excluir
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Statistics */}
          <div className="grid grid-cols-4 gap-2 text-center">
            <div>
              <div className="text-2xl font-bold">{workflow.total_executions}</div>
              <div className="text-xs text-muted-foreground">Total</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-success">{successRate.toFixed(1)}%</div>
              <div className="text-xs text-muted-foreground">Sucesso</div>
            </div>
            <div>
              <div className="text-2xl font-bold">{workflow.avg_execution_time_ms || 0}ms</div>
              <div className="text-xs text-muted-foreground">Tempo</div>
            </div>
            <div>
              <div className="text-2xl font-bold">{workflow.total_executions - workflow.failed_executions}</div>
              <div className="text-xs text-muted-foreground">Hoje</div>
            </div>
          </div>

          {/* Webhook URL */}
          <div className="space-y-2">
            <div className="text-xs font-medium text-muted-foreground">Webhook URL:</div>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-xs bg-muted p-2 rounded truncate">
                {workflow.webhook_url}
              </code>
              <Button size="sm" variant="outline" onClick={handleCopyUrl}>
                <Copy className="h-3 w-3" />
              </Button>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="flex-1" onClick={handleCopyUrl}>
              <Copy className="mr-2 h-3 w-3" />
              Copiar URL
            </Button>
            <Button size="sm" variant="outline" className="flex-1" onClick={handleEditInN8N}>
              <ExternalLink className="mr-2 h-3 w-3" />
              Editar
            </Button>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Workflow?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O workflow será excluído do N8N e do banco de dados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
