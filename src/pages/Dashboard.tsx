import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageSquare, Users, Zap, DollarSign } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface DashboardStats {
  totalChats: number;
  totalMessages: number;
  totalTokens: number;
  monthlyCost: number;
  activeModel: string;
}

export default function Dashboard() {
  const { userSession } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userSession?.tenant) {
      loadStats();
    }
  }, [userSession]);

  const loadStats = async () => {
    if (!userSession?.tenant?.id) return;

    try {
      const tenantId = userSession.tenant.id;

      // Get total chats
      const { count: chatCount } = await supabase
        .from("chats")
        .select("*", { count: "exact", head: true })
        .eq("tenant_id", tenantId);

      // Get total messages
      const { count: messageCount } = await supabase
        .from("chat_messages")
        .select("*, chats!inner(tenant_id)", { count: "exact", head: true })
        .eq("chats.tenant_id", tenantId);

      // Get active IA config
      const { data: iaConfig } = await supabase
        .from("ia_config")
        .select("modelo")
        .eq("tenant_id", tenantId)
        .eq("ativo", true)
        .single();

      // Get monthly cost
      const now = new Date();
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      const { data: costData } = await supabase
        .from("relatorios_custos")
        .select("custo_final")
        .eq("tenant_id", tenantId)
        .gte("periodo_inicio", firstDay.toISOString())
        .order("periodo_fim", { ascending: false })
        .limit(1)
        .maybeSingle();

      // Get total tokens
      const { data: execData } = await supabase
        .from("relatorios_execucoes")
        .select("total_tokens")
        .eq("tenant_id", tenantId);

      const totalTokens = execData?.reduce((sum, exec) => sum + (exec.total_tokens || 0), 0) || 0;

      setStats({
        totalChats: chatCount || 0,
        totalMessages: messageCount || 0,
        totalTokens,
        monthlyCost: costData?.custo_final || 0,
        activeModel: iaConfig?.modelo || "N/A",
      });
    } catch (error) {
      console.error("Error loading stats:", error);
    } finally {
      setLoading(false);
    }
  };

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
      color: "text-warning",
    },
    {
      title: "Custo Mensal",
      value: `R$ ${stats?.monthlyCost.toFixed(2)}`,
      icon: DollarSign,
      description: "Mês atual",
      color: "text-success",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Bem-vindo, {userSession?.profile?.full_name}!
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card) => (
          <Card key={card.title} className="transition-smooth hover:shadow-md">
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

      <Card>
        <CardHeader>
          <CardTitle>Visão Geral</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
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
