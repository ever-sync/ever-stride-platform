import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bot, CheckCircle, AlertTriangle, XCircle, ArrowRight } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Link } from "react-router-dom";

interface AgentHealth {
  id: string;
  nome: string;
  status: "healthy" | "warning" | "critical";
  successRate: number;
  messagesLast24h: number;
  lastActivity: string;
}

interface AgentHealthWidgetProps {
  agents: AgentHealth[];
  loading?: boolean;
}

export function AgentHealthWidget({ agents, loading }: AgentHealthWidgetProps) {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case "healthy":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "warning":
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case "critical":
        return <XCircle className="h-4 w-4 text-destructive" />;
      default:
        return <CheckCircle className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "healthy":
        return <Badge variant="outline" className="text-green-500 border-green-500/50">Saudável</Badge>;
      case "warning":
        return <Badge variant="outline" className="text-yellow-500 border-yellow-500/50">Atenção</Badge>;
      case "critical":
        return <Badge variant="destructive">Crítico</Badge>;
      default:
        return <Badge variant="secondary">Desconhecido</Badge>;
    }
  };

  const getProgressColor = (rate: number) => {
    if (rate >= 90) return "bg-green-500";
    if (rate >= 70) return "bg-yellow-500";
    return "bg-destructive";
  };

  if (loading) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Saúde dos Agentes</CardTitle>
          <Bot className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="animate-pulse">
                <div className="h-4 bg-muted rounded w-3/4 mb-2" />
                <div className="h-2 bg-muted rounded w-full" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (agents.length === 0) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Saúde dos Agentes</CardTitle>
          <Bot className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-center py-6 text-muted-foreground">
            <Bot className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Nenhum agente configurado</p>
            <Link to="/agents/new" className="text-primary text-sm hover:underline mt-2 inline-block">
              Criar primeiro agente
            </Link>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium">Saúde dos Agentes</CardTitle>
        <Bot className="h-4 w-4 text-primary" />
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {agents.slice(0, 5).map((agent) => (
            <Link 
              key={agent.id} 
              to={`/agents/${agent.id}`}
              className="block group"
            >
              <div className="flex items-start justify-between mb-1">
                <div className="flex items-center gap-2">
                  {getStatusIcon(agent.status)}
                  <span className="text-sm font-medium group-hover:text-primary transition-colors">
                    {agent.nome}
                  </span>
                </div>
                {getStatusBadge(agent.status)}
              </div>
              <div className="flex items-center gap-2 mb-1">
                <Progress 
                  value={agent.successRate} 
                  className="h-1.5 flex-1"
                />
                <span className="text-xs text-muted-foreground w-10 text-right">
                  {agent.successRate.toFixed(0)}%
                </span>
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{agent.messagesLast24h} msgs (24h)</span>
                <span className="flex items-center gap-1 group-hover:text-primary transition-colors">
                  Ver detalhes <ArrowRight className="h-3 w-3" />
                </span>
              </div>
            </Link>
          ))}
        </div>
        
        {agents.length > 5 && (
          <Link 
            to="/agents" 
            className="block text-center text-sm text-primary hover:underline mt-4"
          >
            Ver todos os {agents.length} agentes
          </Link>
        )}
      </CardContent>
    </Card>
  );
}
