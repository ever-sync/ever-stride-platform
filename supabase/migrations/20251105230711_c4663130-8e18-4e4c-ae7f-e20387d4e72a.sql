-- 1. Adicionar role MASTER ao enum app_role
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'MASTER';

-- 2. Criar tabela super_admins
CREATE TABLE public.super_admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  is_active BOOLEAN NOT NULL DEFAULT TRUE
);

ALTER TABLE public.super_admins ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.super_admins IS 'Gerencia usuários com acesso master ao sistema';

-- 3. Criar função security definer para verificar super admin
CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.super_admins
    WHERE user_id = _user_id
      AND is_active = TRUE
  );
$$;

-- 4. Policies para super_admins (apenas super admins podem gerenciar)
CREATE POLICY "Super admins can view all super_admins"
ON public.super_admins
FOR SELECT
USING (is_super_admin(auth.uid()));

CREATE POLICY "Super admins can manage super_admins"
ON public.super_admins
FOR ALL
USING (is_super_admin(auth.uid()));

-- 5. Atualizar políticas existentes para incluir acesso master

-- tenants
DROP POLICY IF EXISTS "Super admins can view all tenants" ON public.tenants;
CREATE POLICY "Super admins can view all tenants"
ON public.tenants
FOR SELECT
USING (is_super_admin(auth.uid()));

DROP POLICY IF EXISTS "Super admins can manage all tenants" ON public.tenants;
CREATE POLICY "Super admins can manage all tenants"
ON public.tenants
FOR ALL
USING (is_super_admin(auth.uid()));

-- agents
DROP POLICY IF EXISTS "Super admins can manage all agents" ON public.agents;
CREATE POLICY "Super admins can manage all agents"
ON public.agents
FOR ALL
USING (is_super_admin(auth.uid()));

-- whatsapp_clients
DROP POLICY IF EXISTS "Super admins can manage all whatsapp_clients" ON public.whatsapp_clients;
CREATE POLICY "Super admins can manage all whatsapp_clients"
ON public.whatsapp_clients
FOR ALL
USING (is_super_admin(auth.uid()));

-- documents
DROP POLICY IF EXISTS "Super admins can manage all documents" ON public.documents;
CREATE POLICY "Super admins can manage all documents"
ON public.documents
FOR ALL
USING (is_super_admin(auth.uid()));

-- ia_config
DROP POLICY IF EXISTS "Super admins can manage all ia_config" ON public.ia_config;
CREATE POLICY "Super admins can manage all ia_config"
ON public.ia_config
FOR ALL
USING (is_super_admin(auth.uid()));

-- end_users
DROP POLICY IF EXISTS "Super admins can manage all end_users" ON public.end_users;
CREATE POLICY "Super admins can manage all end_users"
ON public.end_users
FOR ALL
USING (is_super_admin(auth.uid()));

-- chats
DROP POLICY IF EXISTS "Super admins can manage all chats" ON public.chats;
CREATE POLICY "Super admins can manage all chats"
ON public.chats
FOR ALL
USING (is_super_admin(auth.uid()));

-- chat_messages
DROP POLICY IF EXISTS "Super admins can manage all chat_messages" ON public.chat_messages;
CREATE POLICY "Super admins can manage all chat_messages"
ON public.chat_messages
FOR ALL
USING (is_super_admin(auth.uid()));

-- relatorios_custos
DROP POLICY IF EXISTS "Super admins can manage all relatorios_custos" ON public.relatorios_custos;
CREATE POLICY "Super admins can manage all relatorios_custos"
ON public.relatorios_custos
FOR ALL
USING (is_super_admin(auth.uid()));

-- relatorios_execucoes
DROP POLICY IF EXISTS "Super admins can manage all relatorios_execucoes" ON public.relatorios_execucoes;
CREATE POLICY "Super admins can manage all relatorios_execucoes"
ON public.relatorios_execucoes
FOR ALL
USING (is_super_admin(auth.uid()));

-- tenant_billing_config
DROP POLICY IF EXISTS "Super admins can manage all tenant_billing_config" ON public.tenant_billing_config;
CREATE POLICY "Super admins can manage all tenant_billing_config"
ON public.tenant_billing_config
FOR ALL
USING (is_super_admin(auth.uid()));

-- tenant_users
DROP POLICY IF EXISTS "Super admins can manage all tenant_users" ON public.tenant_users;
CREATE POLICY "Super admins can manage all tenant_users"
ON public.tenant_users
FOR ALL
USING (is_super_admin(auth.uid()));

-- n8n_chat_histories
DROP POLICY IF EXISTS "Super admins can manage all n8n_chat_histories" ON public.n8n_chat_histories;
CREATE POLICY "Super admins can manage all n8n_chat_histories"
ON public.n8n_chat_histories
FOR ALL
USING (is_super_admin(auth.uid()));