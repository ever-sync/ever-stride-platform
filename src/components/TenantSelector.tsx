import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useIsSuperAdmin } from "@/hooks/useIsSuperAdmin";
import { useAuth } from "@/hooks/useAuth";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Building2 } from "lucide-react";
import type { Tenant } from "@/types/database";

export function TenantSelector() {
  const { isSuperAdmin } = useIsSuperAdmin();
  const { userSession } = useAuth();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [selectedTenantId, setSelectedTenantId] = useState<string>("");

  useEffect(() => {
    if (isSuperAdmin) {
      loadTenants();
    }
  }, [isSuperAdmin]);

  useEffect(() => {
    if (userSession?.tenant) {
      setSelectedTenantId(userSession.tenant.id.toString());
    }
  }, [userSession]);

  const loadTenants = async () => {
    const { data } = await supabase
      .from("tenants")
      .select("*")
      .order("nome");

    if (data) {
      setTenants(data);
    }
  };

  const handleTenantChange = (tenantId: string) => {
    setSelectedTenantId(tenantId);
    // Refresh page to reload with new tenant context
    window.location.reload();
  };

  if (!isSuperAdmin) {
    return null;
  }

  return (
    <div className="flex items-center gap-2">
      <Building2 className="h-4 w-4 text-muted-foreground" />
      <Select value={selectedTenantId} onValueChange={handleTenantChange}>
        <SelectTrigger className="w-[200px]">
          <SelectValue placeholder="Selecionar Tenant" />
        </SelectTrigger>
        <SelectContent>
          {tenants.map((tenant) => (
            <SelectItem key={tenant.id} value={tenant.id.toString()}>
              {tenant.nome}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
