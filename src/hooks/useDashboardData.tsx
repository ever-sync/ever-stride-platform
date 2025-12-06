import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { format, subDays, startOfMonth, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";

interface DashboardStats {
  totalChats: number;
  totalMessages: number;
  totalTokens: number;
  monthlyCost: number;
  activeModel: string;
}

interface TokenData {
  date: string;
  tokens: number;
}

interface CostData {
  month: string;
  cost: number;
}

interface HeatmapData {
  hour: number;
  day: number;
  value: number;
}

interface AgentHealth {
  id: string;
  nome: string;
  status: "healthy" | "warning" | "critical";
  successRate: number;
  messagesLast24h: number;
  lastActivity: string;
}

export function useDashboardData() {
  const { userSession } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [tokenData, setTokenData] = useState<TokenData[]>([]);
  const [costData, setCostData] = useState<CostData[]>([]);
  const [heatmapData, setHeatmapData] = useState<HeatmapData[]>([]);
  const [agentHealth, setAgentHealth] = useState<AgentHealth[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userSession?.tenant) {
      loadAllData();
    }
  }, [userSession]);

  const loadAllData = async () => {
    if (!userSession?.tenant?.id) return;
    
    setLoading(true);
    
    await Promise.all([
      loadStats(),
      loadTokenData(),
      loadCostData(),
      loadHeatmapData(),
      loadAgentHealth(),
    ]);
    
    setLoading(false);
  };

  const loadStats = async () => {
    if (!userSession?.tenant?.id) return;

    try {
      const tenantId = userSession.tenant.id;

      const [chatResult, messageResult, iaConfig, costResult, execResult] = await Promise.all([
        supabase
          .from("chats")
          .select("*", { count: "exact", head: true })
          .eq("tenant_id", tenantId),
        supabase
          .from("chat_messages")
          .select("*, chats!inner(tenant_id)", { count: "exact", head: true })
          .eq("chats.tenant_id", tenantId),
        supabase
          .from("ia_config")
          .select("modelo")
          .eq("tenant_id", tenantId)
          .eq("ativo", true)
          .single(),
        supabase
          .from("relatorios_custos")
          .select("custo_final")
          .eq("tenant_id", tenantId)
          .gte("periodo_inicio", startOfMonth(new Date()).toISOString())
          .order("periodo_fim", { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from("relatorios_execucoes")
          .select("total_tokens")
          .eq("tenant_id", tenantId),
      ]);

      const totalTokens = execResult.data?.reduce((sum, exec) => sum + (exec.total_tokens || 0), 0) || 0;

      setStats({
        totalChats: chatResult.count || 0,
        totalMessages: messageResult.count || 0,
        totalTokens,
        monthlyCost: costResult.data?.custo_final || 0,
        activeModel: iaConfig.data?.modelo || "N/A",
      });
    } catch (error) {
      console.error("Error loading stats:", error);
    }
  };

  const loadTokenData = async () => {
    if (!userSession?.tenant?.id) return;

    try {
      const last7Days = Array.from({ length: 7 }, (_, i) => {
        const date = subDays(new Date(), 6 - i);
        return {
          date: format(date, "dd/MM"),
          fullDate: date,
          tokens: 0,
        };
      });

      const { data } = await supabase
        .from("relatorios_execucoes")
        .select("run_at, total_tokens")
        .eq("tenant_id", userSession.tenant.id)
        .gte("run_at", subDays(new Date(), 7).toISOString());

      if (data) {
        data.forEach(exec => {
          const execDate = format(new Date(exec.run_at), "dd/MM");
          const dayData = last7Days.find(d => d.date === execDate);
          if (dayData) {
            dayData.tokens += exec.total_tokens || 0;
          }
        });
      }

      setTokenData(last7Days.map(d => ({ date: d.date, tokens: d.tokens })));
    } catch (error) {
      console.error("Error loading token data:", error);
    }
  };

  const loadCostData = async () => {
    if (!userSession?.tenant?.id) return;

    try {
      const last6Months = Array.from({ length: 6 }, (_, i) => {
        const date = subMonths(new Date(), 5 - i);
        return {
          month: format(date, "MMM", { locale: ptBR }),
          startDate: startOfMonth(date),
          cost: 0,
        };
      });

      const { data } = await supabase
        .from("relatorios_custos")
        .select("periodo_inicio, custo_final")
        .eq("tenant_id", userSession.tenant.id)
        .gte("periodo_inicio", subMonths(new Date(), 6).toISOString());

      if (data) {
        data.forEach(cost => {
          const costMonth = format(new Date(cost.periodo_inicio), "MMM", { locale: ptBR });
          const monthData = last6Months.find(m => m.month === costMonth);
          if (monthData) {
            monthData.cost += cost.custo_final || 0;
          }
        });
      }

      setCostData(last6Months.map(m => ({ month: m.month, cost: m.cost })));
    } catch (error) {
      console.error("Error loading cost data:", error);
    }
  };

  const loadHeatmapData = async () => {
    if (!userSession?.tenant?.id) return;

    try {
      const { data } = await supabase
        .from("chat_messages")
        .select("created_at, chats!inner(tenant_id)")
        .eq("chats.tenant_id", userSession.tenant.id)
        .gte("created_at", subDays(new Date(), 7).toISOString());

      const heatmap: HeatmapData[] = [];
      
      // Initialize all cells
      for (let day = 0; day < 7; day++) {
        for (let hour = 0; hour < 24; hour++) {
          heatmap.push({ day, hour, value: 0 });
        }
      }

      if (data) {
        data.forEach(msg => {
          const date = new Date(msg.created_at!);
          const day = date.getDay();
          const hour = date.getHours();
          const cell = heatmap.find(h => h.day === day && h.hour === hour);
          if (cell) cell.value++;
        });
      }

      setHeatmapData(heatmap);
    } catch (error) {
      console.error("Error loading heatmap data:", error);
    }
  };

  const loadAgentHealth = async () => {
    if (!userSession?.tenant?.id) return;

    try {
      const { data: agents } = await supabase
        .from("agents_v2")
        .select("*")
        .eq("tenant_id", userSession.tenant.id)
        .limit(10);

      if (agents) {
        const healthData: AgentHealth[] = agents.map(agent => {
          const successRate = agent.taxa_sucesso || 95;
          let status: "healthy" | "warning" | "critical" = "healthy";
          
          if (successRate < 70) status = "critical";
          else if (successRate < 90) status = "warning";

          return {
            id: agent.id,
            nome: agent.nome,
            status,
            successRate,
            messagesLast24h: agent.msgs_usadas_mes || 0,
            lastActivity: agent.ultima_conversa_em || agent.updated_at || "",
          };
        });

        setAgentHealth(healthData);
      }
    } catch (error) {
      console.error("Error loading agent health:", error);
    }
  };

  return {
    stats,
    tokenData,
    costData,
    heatmapData,
    agentHealth,
    loading,
    refresh: loadAllData,
  };
}
