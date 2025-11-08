-- Tabela de versionamento de prompts
CREATE TABLE public.prompt_versions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id UUID NOT NULL,
  tenant_id BIGINT NOT NULL,
  
  version_number INTEGER NOT NULL,
  prompt_sistema TEXT NOT NULL,
  temperatura NUMERIC,
  max_tokens INTEGER,
  modelo_ia VARCHAR,
  
  change_description TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  is_active BOOLEAN DEFAULT false,
  backup_type VARCHAR DEFAULT 'manual', -- manual, auto, rollback
  
  UNIQUE(agent_id, version_number)
);

-- Tabela de testes A/B de prompts
CREATE TABLE public.prompt_ab_tests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id UUID NOT NULL,
  tenant_id BIGINT NOT NULL,
  
  test_name VARCHAR NOT NULL,
  description TEXT,
  status VARCHAR DEFAULT 'draft', -- draft, running, completed, stopped
  
  variant_a_id UUID REFERENCES public.prompt_versions(id),
  variant_b_id UUID REFERENCES public.prompt_versions(id),
  
  traffic_split_percent INTEGER DEFAULT 50, -- % para variant B
  
  started_at TIMESTAMP WITH TIME ZONE,
  ended_at TIMESTAMP WITH TIME ZONE,
  
  total_interactions_a INTEGER DEFAULT 0,
  total_interactions_b INTEGER DEFAULT 0,
  
  avg_tokens_a NUMERIC DEFAULT 0,
  avg_tokens_b NUMERIC DEFAULT 0,
  
  avg_cost_a NUMERIC DEFAULT 0,
  avg_cost_b NUMERIC DEFAULT 0,
  
  avg_latency_a NUMERIC DEFAULT 0,
  avg_latency_b NUMERIC DEFAULT 0,
  
  success_rate_a NUMERIC DEFAULT 0,
  success_rate_b NUMERIC DEFAULT 0,
  
  winner_variant VARCHAR, -- a, b, or null
  
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de interações do teste A/B
CREATE TABLE public.prompt_ab_interactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  test_id UUID NOT NULL REFERENCES public.prompt_ab_tests(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL,
  
  variant_used VARCHAR NOT NULL, -- a or b
  prompt_version_id UUID REFERENCES public.prompt_versions(id),
  
  tokens_used INTEGER,
  cost_brl NUMERIC,
  latency_ms INTEGER,
  success BOOLEAN,
  
  chat_id BIGINT,
  message_id BIGINT,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Índices
CREATE INDEX idx_prompt_versions_agent ON public.prompt_versions(agent_id);
CREATE INDEX idx_prompt_versions_active ON public.prompt_versions(agent_id, is_active);
CREATE INDEX idx_prompt_ab_tests_agent ON public.prompt_ab_tests(agent_id);
CREATE INDEX idx_prompt_ab_tests_status ON public.prompt_ab_tests(status);
CREATE INDEX idx_prompt_ab_interactions_test ON public.prompt_ab_interactions(test_id);

-- RLS Policies
ALTER TABLE public.prompt_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prompt_ab_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prompt_ab_interactions ENABLE ROW LEVEL SECURITY;

-- Prompt Versions Policies
CREATE POLICY "Users can view prompt versions of their tenant"
  ON public.prompt_versions FOR SELECT
  USING (tenant_id = get_user_tenant_id(auth.uid()));

CREATE POLICY "OWNER/ADMIN can manage prompt versions"
  ON public.prompt_versions FOR ALL
  USING (can_user_write(auth.uid(), tenant_id));

CREATE POLICY "Super admins can manage all prompt versions"
  ON public.prompt_ab_tests FOR ALL
  USING (is_super_admin(auth.uid()));

-- A/B Tests Policies
CREATE POLICY "Users can view AB tests of their tenant"
  ON public.prompt_ab_tests FOR SELECT
  USING (tenant_id = get_user_tenant_id(auth.uid()));

CREATE POLICY "OWNER/ADMIN can manage AB tests"
  ON public.prompt_ab_tests FOR ALL
  USING (can_user_write(auth.uid(), tenant_id));

CREATE POLICY "Super admins can manage all AB tests"
  ON public.prompt_ab_tests FOR ALL
  USING (is_super_admin(auth.uid()));

-- A/B Interactions Policies
CREATE POLICY "System can insert AB interactions"
  ON public.prompt_ab_interactions FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can view AB interactions of their tenant"
  ON public.prompt_ab_interactions FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.prompt_ab_tests
    WHERE id = prompt_ab_interactions.test_id
    AND tenant_id = get_user_tenant_id(auth.uid())
  ));

-- Função para criar versão automática antes de atualizar agente
CREATE OR REPLACE FUNCTION create_auto_prompt_backup()
RETURNS TRIGGER AS $$
BEGIN
  -- Se o prompt_sistema mudou, criar backup automático
  IF OLD.prompt_sistema IS DISTINCT FROM NEW.prompt_sistema 
     OR OLD.temperatura IS DISTINCT FROM NEW.temperatura
     OR OLD.max_tokens IS DISTINCT FROM NEW.max_tokens
     OR OLD.modelo_ia IS DISTINCT FROM NEW.modelo_ia THEN
    
    INSERT INTO public.prompt_versions (
      agent_id,
      tenant_id,
      version_number,
      prompt_sistema,
      temperatura,
      max_tokens,
      modelo_ia,
      backup_type,
      change_description
    )
    SELECT 
      OLD.id,
      OLD.tenant_id,
      COALESCE((
        SELECT MAX(version_number) + 1 
        FROM public.prompt_versions 
        WHERE agent_id = OLD.id
      ), 1),
      OLD.prompt_sistema,
      OLD.temperatura,
      OLD.max_tokens,
      OLD.modelo_ia,
      'auto',
      'Backup automático antes de atualização'
    WHERE NOT EXISTS (
      SELECT 1 FROM public.prompt_versions
      WHERE agent_id = OLD.id
      AND prompt_sistema = OLD.prompt_sistema
      AND version_number = (
        SELECT MAX(version_number)
        FROM public.prompt_versions
        WHERE agent_id = OLD.id
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Triggers para backup automático
CREATE TRIGGER auto_backup_agents_v2
  BEFORE UPDATE ON public.agents_v2
  FOR EACH ROW
  EXECUTE FUNCTION create_auto_prompt_backup();

CREATE TRIGGER auto_backup_agents
  BEFORE UPDATE ON public.agents
  FOR EACH ROW
  EXECUTE FUNCTION create_auto_prompt_backup();