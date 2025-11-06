-- ============================================
-- TABELA: waha_sessions
-- Gerencia conexões WhatsApp via WAHA
-- ============================================
CREATE TABLE IF NOT EXISTS waha_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id BIGINT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES whatsapp_clients(id) ON DELETE CASCADE,
    agent_id UUID REFERENCES agents(id) ON DELETE SET NULL,
    
    -- WAHA
    session_name VARCHAR(100) UNIQUE NOT NULL,
    phone_number VARCHAR(20),
    status VARCHAR(50) DEFAULT 'disconnected',
    -- status: 'disconnected', 'qr_code', 'connecting', 'connected', 'failed'
    
    -- QR Code
    qr_code TEXT,
    qr_expires_at TIMESTAMPTZ,
    
    -- Webhook
    webhook_url TEXT,
    
    -- Estatísticas
    total_messages_sent INTEGER DEFAULT 0,
    total_messages_received INTEGER DEFAULT 0,
    last_message_at TIMESTAMPTZ,
    
    -- Controle
    connected_at TIMESTAMPTZ,
    disconnected_at TIMESTAMPTZ,
    last_activity TIMESTAMPTZ,
    reconnect_attempts INTEGER DEFAULT 0,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Constraints
ALTER TABLE waha_sessions ADD CONSTRAINT chk_waha_status 
    CHECK (status IN ('disconnected', 'qr_code', 'connecting', 'connected', 'failed'));

-- Índices
CREATE INDEX idx_waha_sessions_tenant ON waha_sessions(tenant_id);
CREATE INDEX idx_waha_sessions_client ON waha_sessions(client_id);
CREATE INDEX idx_waha_sessions_status ON waha_sessions(status);
CREATE INDEX idx_waha_sessions_session_name ON waha_sessions(session_name);

-- RLS
ALTER TABLE waha_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenants can manage their sessions"
    ON waha_sessions FOR ALL
    USING (
        tenant_id = get_user_tenant_id(auth.uid()) OR is_super_admin(auth.uid())
    );

CREATE POLICY "Super admins can manage all sessions"
    ON waha_sessions FOR ALL
    USING (is_super_admin(auth.uid()));

-- Trigger
CREATE TRIGGER update_waha_sessions_updated_at
    BEFORE UPDATE ON waha_sessions
    FOR EACH ROW
    EXECUTE FUNCTION touch_updated_at();

-- ============================================
-- TABELA: token_usage
-- Tracking detalhado de uso de IA
-- ============================================
CREATE TABLE IF NOT EXISTS token_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id BIGINT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES whatsapp_clients(id) ON DELETE CASCADE,
    agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    chat_id BIGINT REFERENCES chats(id) ON DELETE SET NULL,
    message_id BIGINT REFERENCES chat_messages(id) ON DELETE SET NULL,
    
    -- Modelo
    modelo VARCHAR(50) NOT NULL,
    provider VARCHAR(20) NOT NULL, -- openai, anthropic, groq
    
    -- Tokens
    tokens_input INTEGER NOT NULL,
    tokens_output INTEGER NOT NULL,
    tokens_cache_read INTEGER DEFAULT 0,
    tokens_total INTEGER GENERATED ALWAYS AS (tokens_input + tokens_output) STORED,
    
    -- Custos (USD)
    custo_input_usd DECIMAL(10,6) NOT NULL,
    custo_output_usd DECIMAL(10,6) NOT NULL,
    custo_cache_usd DECIMAL(10,6) DEFAULT 0,
    custo_total_usd DECIMAL(10,6) GENERATED ALWAYS AS (
        custo_input_usd + custo_output_usd + custo_cache_usd
    ) STORED,
    
    -- Custos (BRL)
    cotacao_usd_brl DECIMAL(6,4) NOT NULL,
    custo_total_brl DECIMAL(10,4) NOT NULL,
    
    -- Performance
    latencia_ms INTEGER,
    
    -- Status
    sucesso BOOLEAN DEFAULT true,
    erro TEXT,
    
    -- Metadata
    prompt_length INTEGER,
    response_length INTEGER,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para queries rápidas
CREATE INDEX idx_token_usage_tenant_created ON token_usage(tenant_id, created_at DESC);
CREATE INDEX idx_token_usage_client_created ON token_usage(client_id, created_at DESC);
CREATE INDEX idx_token_usage_agent_created ON token_usage(agent_id, created_at DESC);
CREATE INDEX idx_token_usage_created ON token_usage(created_at DESC);
CREATE INDEX idx_token_usage_sucesso ON token_usage(sucesso);

-- RLS
ALTER TABLE token_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenants can view their token usage"
    ON token_usage FOR SELECT
    USING (
        tenant_id = get_user_tenant_id(auth.uid()) OR is_super_admin(auth.uid())
    );

CREATE POLICY "Super admins can view all token usage"
    ON token_usage FOR SELECT
    USING (is_super_admin(auth.uid()));

CREATE POLICY "System can insert token usage"
    ON token_usage FOR INSERT
    WITH CHECK (true); -- Permitir insert via service_role

-- ============================================
-- TABELA: limites_tokens
-- Controle de limites por cliente
-- ============================================
CREATE TABLE IF NOT EXISTS limites_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES whatsapp_clients(id) ON DELETE CASCADE UNIQUE,
    
    -- Limites mensais
    limite_tokens_mes INTEGER DEFAULT 100000,
    limite_custo_brl_mes DECIMAL(10,2) DEFAULT 50.00,
    limite_conversas_mes INTEGER DEFAULT 1000,
    
    -- Uso atual (resetado todo mês)
    tokens_usados_mes INTEGER DEFAULT 0,
    custo_brl_usado_mes DECIMAL(10,2) DEFAULT 0,
    conversas_mes INTEGER DEFAULT 0,
    
    -- Alertas
    alerta_enviado_80 BOOLEAN DEFAULT false,
    alerta_enviado_90 BOOLEAN DEFAULT false,
    alerta_enviado_100 BOOLEAN DEFAULT false,
    
    -- Controle
    ultimo_reset DATE DEFAULT CURRENT_DATE,
    proximo_reset DATE GENERATED ALWAYS AS (ultimo_reset + INTERVAL '1 month') STORED,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_limites_client ON limites_tokens(client_id);
CREATE INDEX idx_limites_proximo_reset ON limites_tokens(proximo_reset);

-- RLS
ALTER TABLE limites_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenants can manage limits"
    ON limites_tokens FOR ALL
    USING (
        client_id IN (
            SELECT id FROM whatsapp_clients WHERE tenant_id = get_user_tenant_id(auth.uid())
        ) OR is_super_admin(auth.uid())
    );

CREATE POLICY "Super admins can manage all limits"
    ON limites_tokens FOR ALL
    USING (is_super_admin(auth.uid()));

-- Trigger
CREATE TRIGGER update_limites_tokens_updated_at
    BEFORE UPDATE ON limites_tokens
    FOR EACH ROW
    EXECUTE FUNCTION touch_updated_at();

-- ============================================
-- TABELA: planos
-- Planos criados por técnicos para seus clientes
-- ============================================
CREATE TABLE IF NOT EXISTS planos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id BIGINT REFERENCES tenants(id) ON DELETE CASCADE,
    
    -- Plano
    nome VARCHAR(100) NOT NULL,
    descricao TEXT,
    preco_mensal DECIMAL(10,2) NOT NULL,
    
    -- Limites
    limite_conversas_mes INTEGER DEFAULT 1000,
    limite_tokens_mes INTEGER DEFAULT 100000,
    limite_agentes INTEGER DEFAULT 1,
    limite_usuarios INTEGER DEFAULT 1,
    
    -- Recursos (JSONB para flexibilidade)
    recursos JSONB DEFAULT '[]'::jsonb,
    -- Exemplo: ["whatsapp", "instagram", "telegram", "api", "analytics"]
    
    -- Integrações permitidas
    integracoes_permitidas JSONB DEFAULT '[]'::jsonb,
    -- Exemplo: ["shopify", "woocommerce", "rd_station"]
    
    -- Status
    ativo BOOLEAN DEFAULT true,
    is_publico BOOLEAN DEFAULT false, -- Se outros técnicos podem ver
    is_default BOOLEAN DEFAULT false, -- Plano padrão para novos clientes
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_planos_tenant ON planos(tenant_id);
CREATE INDEX idx_planos_ativo ON planos(ativo);
CREATE INDEX idx_planos_publico ON planos(is_publico);

-- RLS
ALTER TABLE planos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenants can manage their plans"
    ON planos FOR ALL
    USING (
        tenant_id = get_user_tenant_id(auth.uid()) OR is_super_admin(auth.uid())
    );

CREATE POLICY "Super admins can manage all plans"
    ON planos FOR ALL
    USING (is_super_admin(auth.uid()));

CREATE POLICY "Everyone can view public plans"
    ON planos FOR SELECT
    USING (is_publico = true OR is_super_admin(auth.uid()));

-- Trigger
CREATE TRIGGER update_planos_updated_at
    BEFORE UPDATE ON planos
    FOR EACH ROW
    EXECUTE FUNCTION touch_updated_at();

-- Constraint: Apenas 1 plano default por tenant
CREATE UNIQUE INDEX idx_planos_default_per_tenant 
    ON planos(tenant_id) 
    WHERE is_default = true;