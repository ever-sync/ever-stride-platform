import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useIsSuperAdmin } from "@/hooks/useIsSuperAdmin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Building2, Users, MessageSquare, TrendingUp, Shield } from "lucide-react";
import type { Tenant } from "@/types/database";

interface TenantStats {
  tenant: Tenant;
  usersCount: number;
  chatsCount: number;
  agentsCount: number;
}

export default function MasterAdmin() {
  const navigate = useNavigate();
  const { isSuperAdmin, loading } = useIsSuperAdmin();
  const [tenantStats, setTenantStats] = useState<TenantStats[]>([]);
  const [statsLoading, setStatsLoading] = useState(true);

  useEffect(() => {
    if (!loading && !isSuperAdmin) {
      navigate("/dashboard");
    }
  }, [isSuperAdmin, loading, navigate]);

  useEffect(() => {
    if (isSuperAdmin) {
      loadTenantStats();
    }
  }, [isSuperAdmin]);

  const loadTenantStats = async () => {
    try {
      const { data: tenants } = await supabase
        .from("tenants")
        .select("*")
        .order("nome");

      if (!tenants) return;

      const statsPromises = tenants.map(async (tenant) => {
        const [usersResult, chatsResult, agentsResult] = await Promise.all([
          supabase
            .from("tenant_users")
            .select("id", { count: "exact", head: true })
            .eq("tenant_id", tenant.id),
          supabase
            .from("chats")
            .select("id", { count: "exact", head: true })
            .eq("tenant_id", tenant.id),
          supabase
            .from("agents")
            .select("id", { count: "exact", head: true })
            .eq("tenant_id", tenant.id),
        ]);

        return {
          tenant,
          usersCount: usersResult.count || 0,
          chatsCount: chatsResult.count || 0,
          agentsCount: agentsResult.count || 0,
        };
      });

      const stats = await Promise.all(statsPromises);
      setTenantStats(stats);
    } catch (error) {
      console.error("Error loading tenant stats:", error);
    } finally {
      setStatsLoading(false);
    }
  };

  if (loading || !isSuperAdmin) {
    return null;
  }

  const totalTenants = tenantStats.length;
  const totalUsers = tenantStats.reduce((sum, stat) => sum + stat.usersCount, 0);
  const totalChats = tenantStats.reduce((sum, stat) => sum + stat.chatsCount, 0);
  const totalAgents = tenantStats.reduce((sum, stat) => sum + stat.agentsCount, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Shield className="h-8 w-8" />
            Painel Master
          </h1>
          <p className="text-muted-foreground mt-1">
            Visão global do sistema
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tenants</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalTenants}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Usuários</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalUsers}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Chats</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalChats}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Agentes</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalAgents}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Tenants do Sistema</CardTitle>
        </CardHeader>
        <CardContent>
          {statsLoading ? (
            <p className="text-muted-foreground">Carregando...</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tenant</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Usuários</TableHead>
                  <TableHead className="text-right">Chats</TableHead>
                  <TableHead className="text-right">Agentes</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tenantStats.map(({ tenant, usersCount, chatsCount, agentsCount }) => (
                  <TableRow key={tenant.id}>
                    <TableCell className="font-medium">{tenant.nome}</TableCell>
                    <TableCell>{tenant.email || "-"}</TableCell>
                    <TableCell>
                      <Badge variant={tenant.status === "ativo" ? "default" : "secondary"}>
                        {tenant.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">{usersCount}</TableCell>
                    <TableCell className="text-right">{chatsCount}</TableCell>
                    <TableCell className="text-right">{agentsCount}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate(`/dashboard?tenant=${tenant.id}`)}
                      >
                        Acessar
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
