-- Criar tabela de agentes
CREATE TABLE IF NOT EXISTS public.agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id BIGINT NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.whatsapp_clients(id) ON DELETE CASCADE,
  workflow_id TEXT,
  nome_agente TEXT NOT NULL DEFAULT 'Assistente',
  limite_mensagens_mes INTEGER DEFAULT 1000,
  mensagens_usadas_mes INTEGER DEFAULT 0,
  saudacao_inicial TEXT DEFAULT 'Olá! Como posso ajudar?',
  script_atendimento TEXT NOT NULL,
  codigo_transferencia TEXT,
  codigo_envio_grupo TEXT,
  codigo_pausar_ia TEXT,
  codigo_ativar_ia TEXT,
  codigo_resetar_bd TEXT,
  codigo_avaliacao TEXT,
  ativo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS para agents
ALTER TABLE public.agents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view agents of their tenant"
  ON public.agents FOR SELECT
  USING (tenant_id = get_user_tenant_id(auth.uid()));

CREATE POLICY "OWNER/ADMIN can manage agents"
  ON public.agents FOR ALL
  USING (can_user_write(auth.uid(), tenant_id));

-- Adicionar agent_id à tabela documents
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS agent_id UUID REFERENCES public.agents(id) ON DELETE CASCADE;

-- Criar índices
CREATE INDEX IF NOT EXISTS idx_agents_tenant_id ON public.agents(tenant_id);
CREATE INDEX IF NOT EXISTS idx_agents_client_id ON public.agents(client_id);
CREATE INDEX IF NOT EXISTS idx_documents_agent_id ON public.documents(agent_id);

-- Remover colunas da tabela whatsapp_clients que agora estão em agents
ALTER TABLE public.whatsapp_clients 
  DROP COLUMN IF EXISTS script_atendimento,
  DROP COLUMN IF EXISTS nome_agente,
  DROP COLUMN IF EXISTS saudacao_inicial,
  DROP COLUMN IF EXISTS mensagens_usadas_mes,
  DROP COLUMN IF EXISTS plano,
  DROP COLUMN IF EXISTS limite_mensagens_mes;