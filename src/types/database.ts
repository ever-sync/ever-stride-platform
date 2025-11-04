import { Tables } from "@/integrations/supabase/types";

export type Profile = Tables<"profiles">;
export type TenantUser = Tables<"tenant_users">;
export type Tenant = Tables<"tenants">;
export type Chat = Tables<"chats">;
export type ChatMessage = Tables<"chat_messages">;
export type EndUser = Tables<"end_users">;
export type IAConfig = Tables<"ia_config">;
export type BillingConfig = Tables<"tenant_billing_config">;
export type CostReport = Tables<"relatorios_custos">;
export type ExecutionReport = Tables<"relatorios_execucoes">;
export type WhatsAppClient = Tables<"whatsapp_clients">;
export type Agent = Tables<"agents">;

export type UserRole = "OWNER" | "ADMIN" | "ANALYST" | "SUPPORT";

export interface UserSession {
  user: {
    id: string;
    email: string;
  };
  profile: Profile | null;
  tenantUser: TenantUser | null;
  tenant: Tenant | null;
  role: UserRole | null;
}
