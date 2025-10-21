-- =====================================================
-- EverSync Multi-Tenant RBAC & Auth Setup
-- =====================================================

-- 1. Create enum for app roles
CREATE TYPE public.app_role AS ENUM ('OWNER', 'ADMIN', 'ANALYST', 'SUPPORT');

-- 2. Create profiles table (linked to auth.users)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Create tenant_users table (join users to tenants with roles)
CREATE TABLE public.tenant_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id BIGINT NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  role public.app_role NOT NULL DEFAULT 'SUPPORT',
  invited_by UUID REFERENCES auth.users(id),
  invited_at TIMESTAMPTZ DEFAULT NOW(),
  joined_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, tenant_id)
);

-- 4. Create user_invitations table (for pending invites)
CREATE TABLE public.user_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  tenant_id BIGINT NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  role public.app_role NOT NULL DEFAULT 'SUPPORT',
  invited_by UUID NOT NULL REFERENCES auth.users(id),
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(email, tenant_id, accepted_at)
);

-- 5. Enable RLS on all new tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_invitations ENABLE ROW LEVEL SECURITY;

-- 6. Create security definer function to check user role
CREATE OR REPLACE FUNCTION public.has_tenant_role(_user_id UUID, _tenant_id BIGINT, _role public.app_role)
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
      AND role = _role
      AND is_active = TRUE
  );
$$;

-- 7. Create security definer function to get user's tenant_id
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

-- 8. Create security definer function to check if user can write
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

-- 9. RLS Policies for profiles
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- 10. RLS Policies for tenant_users
CREATE POLICY "Users can view tenant members of their tenant"
  ON public.tenant_users FOR SELECT
  USING (
    tenant_id = public.get_user_tenant_id(auth.uid())
  );

CREATE POLICY "OWNER/ADMIN can manage tenant members"
  ON public.tenant_users FOR ALL
  USING (
    public.can_user_write(auth.uid(), tenant_id)
  );

-- 11. RLS Policies for user_invitations
CREATE POLICY "Users can view invitations for their tenant"
  ON public.user_invitations FOR SELECT
  USING (
    tenant_id = public.get_user_tenant_id(auth.uid())
  );

CREATE POLICY "OWNER/ADMIN can manage invitations"
  ON public.user_invitations FOR ALL
  USING (
    public.can_user_write(auth.uid(), tenant_id)
  );

-- 12. Enable RLS on existing tenant-scoped tables
ALTER TABLE public.end_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ia_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_billing_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.relatorios_custos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.relatorios_execucoes ENABLE ROW LEVEL SECURITY;

-- 13. RLS Policies for end_users (multi-tenant)
CREATE POLICY "Users can view end_users of their tenant"
  ON public.end_users FOR SELECT
  USING (tenant_id = public.get_user_tenant_id(auth.uid()));

CREATE POLICY "OWNER/ADMIN can manage end_users"
  ON public.end_users FOR ALL
  USING (public.can_user_write(auth.uid(), tenant_id));

-- 14. RLS Policies for chats (multi-tenant via end_users)
CREATE POLICY "Users can view chats of their tenant"
  ON public.chats FOR SELECT
  USING (
    tenant_id = public.get_user_tenant_id(auth.uid())
  );

CREATE POLICY "OWNER/ADMIN can manage chats"
  ON public.chats FOR ALL
  USING (
    public.can_user_write(auth.uid(), tenant_id)
  );

-- 15. RLS Policies for chat_messages (via chats)
CREATE POLICY "Users can view messages of their tenant chats"
  ON public.chat_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.chats c
      WHERE c.id = chat_messages.chat_id
        AND c.tenant_id = public.get_user_tenant_id(auth.uid())
    )
  );

CREATE POLICY "OWNER/ADMIN can manage messages"
  ON public.chat_messages FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.chats c
      WHERE c.id = chat_messages.chat_id
        AND public.can_user_write(auth.uid(), c.tenant_id)
    )
  );

-- 16. RLS Policies for ia_config
CREATE POLICY "Users can view ia_config of their tenant"
  ON public.ia_config FOR SELECT
  USING (tenant_id = public.get_user_tenant_id(auth.uid()));

CREATE POLICY "OWNER/ADMIN can manage ia_config"
  ON public.ia_config FOR ALL
  USING (public.can_user_write(auth.uid(), tenant_id));

-- 17. RLS Policies for tenant_billing_config
CREATE POLICY "Users can view billing config of their tenant"
  ON public.tenant_billing_config FOR SELECT
  USING (tenant_id = public.get_user_tenant_id(auth.uid()));

CREATE POLICY "OWNER/ADMIN can manage billing config"
  ON public.tenant_billing_config FOR ALL
  USING (public.can_user_write(auth.uid(), tenant_id));

-- 18. RLS Policies for relatorios_custos (reports)
CREATE POLICY "Users can view cost reports of their tenant"
  ON public.relatorios_custos FOR SELECT
  USING (tenant_id = public.get_user_tenant_id(auth.uid()));

CREATE POLICY "OWNER/ADMIN can manage cost reports"
  ON public.relatorios_custos FOR ALL
  USING (public.can_user_write(auth.uid(), tenant_id));

-- 19. RLS Policies for relatorios_execucoes
CREATE POLICY "Users can view execution reports of their tenant"
  ON public.relatorios_execucoes FOR SELECT
  USING (tenant_id = public.get_user_tenant_id(auth.uid()));

CREATE POLICY "OWNER/ADMIN can manage execution reports"
  ON public.relatorios_execucoes FOR ALL
  USING (public.can_user_write(auth.uid(), tenant_id));

-- 20. Trigger to auto-create profile on user signup
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

-- 21. Function to create tenant with owner
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
  -- Create tenant
  INSERT INTO public.tenants (nome, email, status)
  VALUES (p_tenant_name, p_tenant_email, 'ativo')
  RETURNING id INTO v_tenant_id;
  
  -- Create tenant_user with OWNER role
  INSERT INTO public.tenant_users (user_id, tenant_id, role, joined_at)
  VALUES (p_user_id, v_tenant_id, 'OWNER', NOW());
  
  -- Create default IA config
  INSERT INTO public.ia_config (tenant_id, ativo, modelo, temperatura, idioma, tom_de_voz, prompt_sistema)
  VALUES (
    v_tenant_id,
    TRUE,
    'gpt-4o-mini',
    0.30,
    'pt-BR',
    'profissional',
    'Você é o assistente da empresa. Responda de forma clara e objetiva.'
  );
  
  -- Create default billing config
  INSERT INTO public.tenant_billing_config (
    tenant_id,
    valor_por_token,
    moeda,
    ativo
  )
  VALUES (
    v_tenant_id,
    0.000001,
    'BRL',
    TRUE
  );
  
  RETURN v_tenant_id;
END;
$$;