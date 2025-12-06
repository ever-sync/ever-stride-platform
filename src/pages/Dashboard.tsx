import { useAuth } from "@/hooks/useAuth";
import { useDashboardData } from "@/hooks/useDashboardData";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageSquare, Users, Zap, DollarSign, RefreshCw } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { TokenUsageChart } from "@/components/dashboard/TokenUsageChart";
import { MonthlyCostChart } from "@/components/dashboard/MonthlyCostChart";
import { ActivityHeatmap } from "@/components/dashboard/ActivityHeatmap";
import { AgentHealthWidget } from "@/components/dashboard/AgentHealthWidget";
import { SystemHealthWidget, defaultSystemStatuses } from "@/components/dashboard/SystemHealthWidget";

export default function Dashboard() {
  const { userSession } = useAuth();
  const { stats, tokenData, costData, heatmapData, agentHealth, loading, refresh } = useDashboardData();

  const statCards = [
    {
      title: "Conversas",
      value: stats?.totalChats.toLocaleString() || "0",
      icon: MessageSquare,
      description: "Total de chats",
      color: "text-primary",
    },
    {
      title: "Mensagens",
      value: stats?.totalMessages.toLocaleString() || "0",
      icon: Users,
      description: "Mensagens processadas",
      color: "text-accent",
    },
    {
      title: "Tokens",
      value: stats?.totalTokens.toLocaleString() || "0",
      icon: Zap,
      description: `Modelo: ${stats?.activeModel}`,
      color: "text-yellow-500",
    },
    {
      title: "Custo Mensal",
      value: `R$ ${stats?.monthlyCost.toFixed(2) || "0.00"}`,
      icon: DollarSign,
      description: "Mês atual",
      color: "text-green-500",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Bem-vindo, {userSession?.profile?.full_name}!
          </p>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={refresh}
          disabled={loading}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Atualizar
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card) => (
          <Card key={card.title} className="transition-all hover:shadow-md hover:scale-[1.02]">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
              <card.icon className={`h-5 w-5 ${card.color}`} />
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                <>
                  <div className="text-2xl font-bold">{card.value}</div>
                  <p className="text-xs text-muted-foreground mt-1">{card.description}</p>
                </>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid gap-4 md:grid-cols-3">
        <TokenUsageChart data={tokenData} loading={loading} />
        <MonthlyCostChart data={costData} loading={loading} />
      </div>

      {/* Heatmap & Widgets Row */}
      <div className="grid gap-4 md:grid-cols-4">
        <ActivityHeatmap data={heatmapData} loading={loading} />
        <AgentHealthWidget agents={agentHealth} loading={loading} />
        <SystemHealthWidget statuses={defaultSystemStatuses} loading={loading} />
      </div>

      {/* Organization Info */}
      <Card>
        <CardHeader>
          <CardTitle>Visão Geral</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <h3 className="font-semibold mb-2">Organização</h3>
              <p className="text-sm text-muted-foreground">{userSession?.tenant?.nome}</p>
              <p className="text-xs text-muted-foreground mt-1">
                Status: {userSession?.tenant?.status}
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Seu Papel</h3>
              <p className="text-sm text-muted-foreground capitalize">
                {userSession?.role?.toLowerCase()}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
