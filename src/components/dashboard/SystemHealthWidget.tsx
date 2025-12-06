import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Server, Database, Wifi, Cloud, CheckCircle, AlertCircle } from "lucide-react";

interface SystemStatus {
  name: string;
  status: "operational" | "degraded" | "down";
  icon: React.ReactNode;
  latency?: number;
}

interface SystemHealthWidgetProps {
  statuses: SystemStatus[];
  loading?: boolean;
}

export function SystemHealthWidget({ statuses, loading }: SystemHealthWidgetProps) {
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "operational":
        return (
          <Badge variant="outline" className="text-green-500 border-green-500/50 gap-1">
            <CheckCircle className="h-3 w-3" />
            Operacional
          </Badge>
        );
      case "degraded":
        return (
          <Badge variant="outline" className="text-yellow-500 border-yellow-500/50 gap-1">
            <AlertCircle className="h-3 w-3" />
            Degradado
          </Badge>
        );
      case "down":
        return (
          <Badge variant="destructive" className="gap-1">
            <AlertCircle className="h-3 w-3" />
            Offline
          </Badge>
        );
      default:
        return <Badge variant="secondary">Desconhecido</Badge>;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Status do Sistema</CardTitle>
          <Server className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="animate-pulse flex items-center justify-between">
                <div className="h-4 bg-muted rounded w-24" />
                <div className="h-5 bg-muted rounded w-20" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const allOperational = statuses.every(s => s.status === "operational");

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium">Status do Sistema</CardTitle>
        {allOperational ? (
          <CheckCircle className="h-4 w-4 text-green-500" />
        ) : (
          <AlertCircle className="h-4 w-4 text-yellow-500" />
        )}
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {statuses.map((system) => (
            <div key={system.name} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="text-muted-foreground">
                  {system.icon}
                </div>
                <span className="text-sm">{system.name}</span>
                {system.latency && (
                  <span className="text-xs text-muted-foreground">
                    {system.latency}ms
                  </span>
                )}
              </div>
              {getStatusBadge(system.status)}
            </div>
          ))}
        </div>
        
        {allOperational && (
          <p className="text-xs text-muted-foreground mt-4 text-center">
            Todos os sistemas operando normalmente
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export const defaultSystemStatuses: SystemStatus[] = [
  { name: "API", status: "operational", icon: <Server className="h-4 w-4" />, latency: 45 },
  { name: "Banco de Dados", status: "operational", icon: <Database className="h-4 w-4" />, latency: 12 },
  { name: "WhatsApp", status: "operational", icon: <Wifi className="h-4 w-4" /> },
  { name: "n8n Workflows", status: "operational", icon: <Cloud className="h-4 w-4" /> },
];
