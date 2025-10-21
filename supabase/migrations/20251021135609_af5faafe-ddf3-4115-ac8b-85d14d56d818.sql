-- =====================================================
-- EverSync Multi-Tenant RBAC & Auth Setup (Fixed)
-- =====================================================

-- 1. Create profiles table if not exists
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Create tenant_users table
CREATE TABLE IF NOT EXISTS public.tenant_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id BIGINT NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'SUPPORT',
  invited_by UUID REFERENCES auth.users(id),
  invited_at TIMESTAMPTZ DEFAULT NOW(),
  joined_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, tenant_id)
);

-- 3. Create user_invitations table
CREATE TABLE IF NOT EXISTS public.user_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  tenant_id BIGINT NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'SUPPORT',
  invited_by UUID NOT NULL REFERENCES auth.users(id),
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.end_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ia_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_billing_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.relatorios_custos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.relatorios_execucoes ENABLE ROW LEVEL SECURITY;

-- 5. Security definer functions
CREATE OR REPLACE FUNCTION public.get_user_tenant_id(_user_id UUID)
RETURNS BIGINT
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT tenant_id
  FROM public.tenant_users
  WHERE user_id = _user_id
    AND is_active = TRUE
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.can_user_write(_user_id UUID, _tenant_id BIGINT)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.tenant_users
    WHERE user_id = _user_id
      AND tenant_id = _tenant_id
      AND role IN ('OWNER', 'ADMIN')
      AND is_active = TRUE
  );
$$;

-- 6. RLS Policies for profiles
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- 7. RLS for tenant_users
DROP POLICY IF EXISTS "Users can view tenant members" ON public.tenant_users;
CREATE POLICY "Users can view tenant members"
  ON public.tenant_users FOR SELECT
  USING (tenant_id = public.get_user_tenant_id(auth.uid()));

DROP POLICY IF EXISTS "Admins manage members" ON public.tenant_users;
CREATE POLICY "Admins manage members"
  ON public.tenant_users FOR ALL
  USING (public.can_user_write(auth.uid(), tenant_id));

-- 8. RLS for invitations
DROP POLICY IF EXISTS "View invitations" ON public.user_invitations;
CREATE POLICY "View invitations"
  ON public.user_invitations FOR SELECT
  USING (tenant_id = public.get_user_tenant_id(auth.uid()));

DROP POLICY IF EXISTS "Manage invitations" ON public.user_invitations;
CREATE POLICY "Manage invitations"
  ON public.user_invitations FOR ALL
  USING (public.can_user_write(auth.uid(), tenant_id));

-- 9. RLS for end_users
DROP POLICY IF EXISTS "View end_users" ON public.end_users;
CREATE POLICY "View end_users"
  ON public.end_users FOR SELECT
  USING (tenant_id = public.get_user_tenant_id(auth.uid()));

DROP POLICY IF EXISTS "Manage end_users" ON public.end_users;
CREATE POLICY "Manage end_users"
  ON public.end_users FOR ALL
  USING (public.can_user_write(auth.uid(), tenant_id));

-- 10. RLS for chats
DROP POLICY IF EXISTS "View chats" ON public.chats;
CREATE POLICY "View chats"
  ON public.chats FOR SELECT
  USING (tenant_id = public.get_user_tenant_id(auth.uid()));

DROP POLICY IF EXISTS "Manage chats" ON public.chats;
CREATE POLICY "Manage chats"
  ON public.chats FOR ALL
  USING (public.can_user_write(auth.uid(), tenant_id));

-- 11. RLS for chat_messages
DROP POLICY IF EXISTS "View messages" ON public.chat_messages;
CREATE POLICY "View messages"
  ON public.chat_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.chats c
      WHERE c.id = chat_messages.chat_id
        AND c.tenant_id = public.get_user_tenant_id(auth.uid())
    )
  );

DROP POLICY IF EXISTS "Manage messages" ON public.chat_messages;
CREATE POLICY "Manage messages"
  ON public.chat_messages FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.chats c
      WHERE c.id = chat_messages.chat_id
        AND public.can_user_write(auth.uid(), c.tenant_id)
    )
  );

-- 12. RLS for ia_config
DROP POLICY IF EXISTS "View ia_config" ON public.ia_config;
CREATE POLICY "View ia_config"
  ON public.ia_config FOR SELECT
  USING (tenant_id = public.get_user_tenant_id(auth.uid()));

DROP POLICY IF EXISTS "Manage ia_config" ON public.ia_config;
CREATE POLICY "Manage ia_config"
  ON public.ia_config FOR ALL
  USING (public.can_user_write(auth.uid(), tenant_id));

-- 13. RLS for billing
DROP POLICY IF EXISTS "View billing" ON public.tenant_billing_config;
CREATE POLICY "View billing"
  ON public.tenant_billing_config FOR SELECT
  USING (tenant_id = public.get_user_tenant_id(auth.uid()));

DROP POLICY IF EXISTS "Manage billing" ON public.tenant_billing_config;
CREATE POLICY "Manage billing"
  ON public.tenant_billing_config FOR ALL
  USING (public.can_user_write(auth.uid(), tenant_id));

-- 14. RLS for cost reports
DROP POLICY IF EXISTS "View cost reports" ON public.relatorios_custos;
CREATE POLICY "View cost reports"
  ON public.relatorios_custos FOR SELECT
  USING (tenant_id = public.get_user_tenant_id(auth.uid()));

DROP POLICY IF EXISTS "Manage cost reports" ON public.relatorios_custos;
CREATE POLICY "Manage cost reports"
  ON public.relatorios_custos FOR ALL
  USING (public.can_user_write(auth.uid(), tenant_id));

-- 15. RLS for execution reports
DROP POLICY IF EXISTS "View execution reports" ON public.relatorios_execucoes;
CREATE POLICY "View execution reports"
  ON public.relatorios_execucoes FOR SELECT
  USING (tenant_id = public.get_user_tenant_id(auth.uid()));

DROP POLICY IF EXISTS "Manage execution reports" ON public.relatorios_execucoes;
CREATE POLICY "Manage execution reports"
  ON public.relatorios_execucoes FOR ALL
  USING (public.can_user_write(auth.uid(), tenant_id));

-- 16. Trigger for new users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 17. Function to create tenant with owner
CREATE OR REPLACE FUNCTION public.create_tenant_with_owner(
  p_tenant_name TEXT,
  p_tenant_email TEXT,
  p_user_id UUID
)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_id BIGINT;
BEGIN
  INSERT INTO public.tenants (nome, email, status)
  VALUES (p_tenant_name, p_tenant_email, 'ativo')
  RETURNING id INTO v_tenant_id;
  
  INSERT INTO public.tenant_users (user_id, tenant_id, role, joined_at)
  VALUES (p_user_id, v_tenant_id, 'OWNER', NOW());
  
  INSERT INTO public.ia_config (tenant_id, ativo)
  VALUES (v_tenant_id, TRUE)
  ON CONFLICT DO NOTHING;
  
  INSERT INTO public.tenant_billing_config (tenant_id, valor_por_token, ativo)
  VALUES (v_tenant_id, 0.000001, TRUE)
  ON CONFLICT DO NOTHING;
  
  RETURN v_tenant_id;
END;
$$;