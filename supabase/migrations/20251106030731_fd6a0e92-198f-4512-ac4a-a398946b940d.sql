-- ============================================
-- 1. AGENTS: Remover campos desnecessários
-- ============================================
ALTER TABLE agents DROP COLUMN IF EXISTS codigo_transferencia CASCADE;
ALTER TABLE agents DROP COLUMN IF EXISTS codigo_envio_grupo CASCADE;
ALTER TABLE agents DROP COLUMN IF EXISTS codigo_pausar_ia CASCADE;
ALTER TABLE agents DROP COLUMN IF EXISTS codigo_ativar_ia CASCADE;
ALTER TABLE agents DROP COLUMN IF EXISTS codigo_resetar_bd CASCADE;
ALTER TABLE agents DROP COLUMN IF EXISTS codigo_avaliacao CASCADE;

-- ============================================
-- 2. AGENTS: Adicionar novos campos essenciais
-- ============================================
ALTER TABLE agents ADD COLUMN IF NOT EXISTS modelo_ia VARCHAR(50) DEFAULT 'gpt-4o-mini';
ALTER TABLE agents ADD COLUMN IF NOT EXISTS temperatura DECIMAL(3,2) DEFAULT 0.7 CHECK (temperatura >= 0 AND temperatura <= 2);
ALTER TABLE agents ADD COLUMN IF NOT EXISTS max_tokens INTEGER DEFAULT 800;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS prompt_sistema TEXT;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS webhook_url TEXT;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS n8n_workflow_id VARCHAR(100);

-- ============================================
-- 3. AGENTS: Ajustar defaults
-- ============================================
ALTER TABLE agents ALTER COLUMN mensagens_usadas_mes SET DEFAULT 0;
ALTER TABLE agents ALTER COLUMN limite_mensagens_mes SET DEFAULT 1000;
ALTER TABLE agents ALTER COLUMN tempo_atendimento SET DEFAULT 30;

-- ============================================
-- 4. AGENTS: Adicionar índices para performance
-- ============================================
CREATE INDEX IF NOT EXISTS idx_agents_client_id ON agents(client_id);
CREATE INDEX IF NOT EXISTS idx_agents_tenant_id ON agents(tenant_id);
CREATE INDEX IF NOT EXISTS idx_agents_workflow_id ON agents(n8n_workflow_id);

-- ============================================
-- 5. WHATSAPP_CLIENTS: Adicionar campos de plano e billing
-- ============================================
ALTER TABLE whatsapp_clients ADD COLUMN IF NOT EXISTS plano_id UUID;
ALTER TABLE whatsapp_clients ADD COLUMN IF NOT EXISTS plano_nome VARCHAR(100);
ALTER TABLE whatsapp_clients ADD COLUMN IF NOT EXISTS plano_valor DECIMAL(10,2) DEFAULT 0;
ALTER TABLE whatsapp_clients ADD COLUMN IF NOT EXISTS data_inicio DATE DEFAULT CURRENT_DATE;
ALTER TABLE whatsapp_clients ADD COLUMN IF NOT EXISTS data_vencimento DATE;
ALTER TABLE whatsapp_clients ADD COLUMN IF NOT EXISTS status_pagamento VARCHAR(20) DEFAULT 'ativo';

-- Adicionar constraints
ALTER TABLE whatsapp_clients ADD CONSTRAINT chk_status_pagamento 
    CHECK (status_pagamento IN ('ativo', 'pendente', 'vencido', 'suspenso'));

-- Índices
CREATE INDEX IF NOT EXISTS idx_clients_status ON whatsapp_clients(status_pagamento);
CREATE INDEX IF NOT EXISTS idx_clients_vencimento ON whatsapp_clients(data_vencimento);

-- ============================================
-- 6. TABELA: n8n_workflows
-- Armazena workflows criados no N8N
-- ============================================
CREATE TABLE IF NOT EXISTS n8n_workflows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id BIGINT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,
    
    -- Dados do N8N
    workflow_id VARCHAR(100) UNIQUE NOT NULL,
    workflow_name VARCHAR(200) NOT NULL,
    webhook_url TEXT NOT NULL,
    webhook_test_url TEXT,
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    last_execution TIMESTAMPTZ,
    total_executions INTEGER DEFAULT 0,
    failed_executions INTEGER DEFAULT 0,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_n8n_workflows_tenant ON n8n_workflows(tenant_id);
CREATE INDEX IF NOT EXISTS idx_n8n_workflows_agent ON n8n_workflows(agent_id);
CREATE INDEX IF NOT EXISTS idx_n8n_workflows_workflow_id ON n8n_workflows(workflow_id);

-- RLS
ALTER TABLE n8n_workflows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenants can manage their workflows"
    ON n8n_workflows FOR ALL
    USING (
        tenant_id = get_user_tenant_id(auth.uid()) OR is_super_admin(auth.uid())
    );

CREATE POLICY "Super admins can manage all workflows"
    ON n8n_workflows FOR ALL
    USING (is_super_admin(auth.uid()));

-- Trigger de updated_at
CREATE TRIGGER update_n8n_workflows_updated_at
    BEFORE UPDATE ON n8n_workflows
    FOR EACH ROW
    EXECUTE FUNCTION touch_updated_at();