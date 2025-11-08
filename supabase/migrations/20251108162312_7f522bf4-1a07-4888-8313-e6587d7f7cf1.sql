-- ============================================
-- ESTRUTURA LIMPA E PROFISSIONAL
-- ============================================

-- ============================================
-- CORE: Agentes (Tudo em um lugar)
-- ============================================
CREATE TABLE agents_v2 (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id BIGINT NOT NULL,
    client_id UUID,
    
    -- Identificação
    nome VARCHAR(200) NOT NULL,
    descricao TEXT,
    tipo VARCHAR(50) DEFAULT 'atendimento',
    
    -- IA Config
    modelo_ia VARCHAR(50) DEFAULT 'gpt-4o-mini',
    temperatura DECIMAL(3,2) DEFAULT 0.7,
    max_tokens INTEGER DEFAULT 800,
    prompt_sistema TEXT NOT NULL,
    saudacao_inicial TEXT,
    
    -- N8N Integration (SIMPLIFICADO)
    n8n_workflow_id VARCHAR(100) UNIQUE,
    n8n_webhook_url TEXT,
    n8n_status VARCHAR(20) DEFAULT 'inactive',
    n8n_last_sync TIMESTAMPTZ,
    
    -- WhatsApp Integration
    waha_session_id UUID,
    whatsapp_connected BOOLEAN DEFAULT false,
    whatsapp_phone VARCHAR(20),
    
    -- Limites e Controle
    limite_msgs_mes INTEGER DEFAULT 1000,
    msgs_usadas_mes INTEGER DEFAULT 0,
    limite_tokens_mes INTEGER DEFAULT 100000,
    tokens_usados_mes INTEGER DEFAULT 0,
    custo_acumulado_mes DECIMAL(10,2) DEFAULT 0,
    
    -- Status Operacional
    status VARCHAR(20) DEFAULT 'active',
    ultimo_erro TEXT,
    ultimo_erro_em TIMESTAMPTZ,
    ultima_conversa_em TIMESTAMPTZ,
    
    -- Métricas Rápidas (cache)
    total_conversas INTEGER DEFAULT 0,
    total_msgs_enviadas INTEGER DEFAULT 0,
    taxa_sucesso DECIMAL(5,2) DEFAULT 100.00,
    tempo_medio_resposta INTEGER DEFAULT 0,
    
    -- Auditoria
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT chk_temperatura CHECK (temperatura >= 0 AND temperatura <= 2),
    CONSTRAINT chk_taxa_sucesso CHECK (taxa_sucesso >= 0 AND taxa_sucesso <= 100)
);

-- Índices estratégicos
CREATE INDEX idx_agents_v2_tenant ON agents_v2(tenant_id) WHERE status = 'active';
CREATE INDEX idx_agents_v2_n8n_workflow ON agents_v2(n8n_workflow_id) WHERE n8n_workflow_id IS NOT NULL;
CREATE INDEX idx_agents_v2_status ON agents_v2(status);
CREATE INDEX idx_agents_v2_client ON agents_v2(client_id);

-- ============================================
-- MONITORAMENTO: Event Log Unificado
-- ============================================
CREATE TABLE agent_events (
    id BIGSERIAL PRIMARY KEY,
    agent_id UUID NOT NULL,
    tenant_id BIGINT NOT NULL,
    
    -- Tipo de Evento
    event_type VARCHAR(50) NOT NULL,
    severity VARCHAR(20) DEFAULT 'info',
    
    -- Dados do Evento
    event_data JSONB NOT NULL,
    
    -- Contexto
    chat_id BIGINT,
    session_id UUID,
    workflow_execution_id VARCHAR(100),
    
    -- Métricas
    tokens_used INTEGER,
    custo_brl DECIMAL(10,4),
    latencia_ms INTEGER,
    
    -- Erro
    error_message TEXT,
    error_stack TEXT,
    error_code VARCHAR(50),
    
    -- Timestamp
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para queries rápidas
CREATE INDEX idx_agent_events_agent_created ON agent_events(agent_id, created_at DESC);
CREATE INDEX idx_agent_events_tenant_created ON agent_events(tenant_id, created_at DESC);
CREATE INDEX idx_agent_events_type ON agent_events(event_type, created_at DESC);
CREATE INDEX idx_agent_events_severity ON agent_events(severity, created_at DESC) WHERE severity IN ('error', 'critical');

-- ============================================
-- MONITORAMENTO: Agent Health (Agregado)
-- ============================================
CREATE TABLE agent_health_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID NOT NULL,
    tenant_id BIGINT NOT NULL,
    
    -- Período
    snapshot_type VARCHAR(20) NOT NULL,
    period_start TIMESTAMPTZ NOT NULL,
    period_end TIMESTAMPTZ NOT NULL,
    
    -- Métricas de Performance
    total_messages INTEGER DEFAULT 0,
    successful_messages INTEGER DEFAULT 0,
    failed_messages INTEGER DEFAULT 0,
    success_rate DECIMAL(5,2),
    
    avg_response_time_ms INTEGER,
    p95_response_time_ms INTEGER,
    p99_response_time_ms INTEGER,
    
    -- Métricas de Uso
    total_tokens_used INTEGER DEFAULT 0,
    total_custo_brl DECIMAL(10,2) DEFAULT 0,
    avg_tokens_per_message INTEGER,
    
    -- Erros
    total_errors INTEGER DEFAULT 0,
    error_types JSONB,
    
    -- N8N
    workflow_executions INTEGER DEFAULT 0,
    workflow_failures INTEGER DEFAULT 0,
    
    -- Health Score (0-100)
    health_score INTEGER,
    status VARCHAR(20),
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_health_snapshots_agent ON agent_health_snapshots(agent_id, period_start DESC);
CREATE INDEX idx_health_snapshots_type ON agent_health_snapshots(snapshot_type, period_start DESC);

-- ============================================
-- EXECUÇÕES N8N (Simplificado)
-- ============================================
CREATE TABLE n8n_executions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID NOT NULL,
    tenant_id BIGINT NOT NULL,
    
    -- N8N Data
    n8n_execution_id VARCHAR(100) UNIQUE,
    n8n_workflow_id VARCHAR(100) NOT NULL,
    
    -- Status
    status VARCHAR(20) NOT NULL,
    
    -- Timing
    started_at TIMESTAMPTZ NOT NULL,
    finished_at TIMESTAMPTZ,
    duration_ms INTEGER,
    
    -- Input/Output
    input_summary JSONB,
    output_summary JSONB,
    
    -- Erros
    error_message TEXT,
    failed_node VARCHAR(100),
    
    -- Custo
    tokens_used INTEGER,
    custo_brl DECIMAL(10,4),
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_n8n_executions_agent ON n8n_executions(agent_id, created_at DESC);
CREATE INDEX idx_n8n_executions_status ON n8n_executions(status);
CREATE INDEX idx_n8n_executions_n8n_id ON n8n_executions(n8n_execution_id);

-- ============================================
-- FUNCTION: Registrar Evento e Atualizar Métricas
-- ============================================
CREATE OR REPLACE FUNCTION log_agent_event(
    p_agent_id UUID,
    p_event_type VARCHAR,
    p_severity VARCHAR,
    p_event_data JSONB,
    p_tokens_used INTEGER DEFAULT NULL,
    p_custo_brl DECIMAL DEFAULT NULL,
    p_latencia_ms INTEGER DEFAULT NULL,
    p_error_message TEXT DEFAULT NULL
)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_tenant_id BIGINT;
    v_event_id BIGINT;
BEGIN
    -- Buscar tenant_id
    SELECT tenant_id INTO v_tenant_id FROM agents_v2 WHERE id = p_agent_id;
    
    -- Inserir evento
    INSERT INTO agent_events (
        agent_id, tenant_id, event_type, severity, event_data,
        tokens_used, custo_brl, latencia_ms, error_message
    ) VALUES (
        p_agent_id, v_tenant_id, p_event_type, p_severity, p_event_data,
        p_tokens_used, p_custo_brl, p_latencia_ms, p_error_message
    ) RETURNING id INTO v_event_id;
    
    -- Atualizar métricas do agente
    CASE p_event_type
        WHEN 'message_sent' THEN
            UPDATE agents_v2 SET
                total_msgs_enviadas = total_msgs_enviadas + 1,
                msgs_usadas_mes = msgs_usadas_mes + 1,
                ultima_conversa_em = NOW(),
                updated_at = NOW()
            WHERE id = p_agent_id;
            
        WHEN 'token_usage' THEN
            UPDATE agents_v2 SET
                tokens_usados_mes = tokens_usados_mes + COALESCE(p_tokens_used, 0),
                custo_acumulado_mes = custo_acumulado_mes + COALESCE(p_custo_brl, 0),
                updated_at = NOW()
            WHERE id = p_agent_id;
            
        WHEN 'error' THEN
            UPDATE agents_v2 SET
                status = CASE 
                    WHEN p_severity = 'critical' THEN 'error'
                    ELSE status 
                END,
                ultimo_erro = p_error_message,
                ultimo_erro_em = NOW(),
                updated_at = NOW()
            WHERE id = p_agent_id;
            
        WHEN 'limit_reached' THEN
            UPDATE agents_v2 SET
                status = 'suspended',
                ultimo_erro = 'Limite de uso atingido',
                ultimo_erro_em = NOW(),
                updated_at = NOW()
            WHERE id = p_agent_id;
    END CASE;
    
    RETURN v_event_id;
END;
$$;

-- ============================================
-- FUNCTION: Calcular Health Score
-- ============================================
CREATE OR REPLACE FUNCTION calculate_agent_health_score(p_agent_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_score INTEGER := 100;
    v_success_rate DECIMAL;
    v_error_count INTEGER;
    v_last_error_hours NUMERIC;
BEGIN
    -- Taxa de sucesso (últimas 24h)
    SELECT 
        COALESCE(
            (COUNT(*) FILTER (WHERE severity NOT IN ('error', 'critical'))::DECIMAL / 
             NULLIF(COUNT(*), 0) * 100),
            100
        )
    INTO v_success_rate
    FROM agent_events
    WHERE agent_id = p_agent_id
    AND created_at > NOW() - INTERVAL '24 hours';
    
    -- Penalizar por baixa taxa de sucesso
    v_score := v_score - (100 - v_success_rate);
    
    -- Contar erros recentes
    SELECT COUNT(*)
    INTO v_error_count
    FROM agent_events
    WHERE agent_id = p_agent_id
    AND severity IN ('error', 'critical')
    AND created_at > NOW() - INTERVAL '1 hour';
    
    -- Penalizar por erros
    v_score := v_score - (v_error_count * 5);
    
    -- Verificar último erro
    SELECT EXTRACT(EPOCH FROM (NOW() - ultimo_erro_em)) / 3600
    INTO v_last_error_hours
    FROM agents_v2
    WHERE id = p_agent_id
    AND ultimo_erro_em IS NOT NULL;
    
    -- Penalizar se erro recente
    IF v_last_error_hours IS NOT NULL AND v_last_error_hours < 1 THEN
        v_score := v_score - 20;
    END IF;
    
    -- Garantir range 0-100
    v_score := GREATEST(0, LEAST(100, v_score));
    
    RETURN v_score;
END;
$$;

-- ============================================
-- FUNCTION: Gerar Snapshot de Saúde (Diário)
-- ============================================
CREATE OR REPLACE FUNCTION generate_daily_health_snapshot()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    INSERT INTO agent_health_snapshots (
        agent_id,
        tenant_id,
        snapshot_type,
        period_start,
        period_end,
        total_messages,
        successful_messages,
        failed_messages,
        success_rate,
        total_tokens_used,
        total_custo_brl,
        total_errors,
        health_score,
        status
    )
    SELECT 
        a.id,
        a.tenant_id,
        'daily',
        DATE_TRUNC('day', NOW() - INTERVAL '1 day'),
        DATE_TRUNC('day', NOW()),
        
        COUNT(*) FILTER (WHERE e.event_type = 'message_sent'),
        COUNT(*) FILTER (WHERE e.event_type = 'message_sent' AND e.severity NOT IN ('error', 'critical')),
        COUNT(*) FILTER (WHERE e.event_type = 'message_sent' AND e.severity IN ('error', 'critical')),
        
        COALESCE(
            (COUNT(*) FILTER (WHERE e.event_type = 'message_sent' AND e.severity NOT IN ('error', 'critical'))::DECIMAL / 
             NULLIF(COUNT(*) FILTER (WHERE e.event_type = 'message_sent'), 0) * 100),
            0
        ),
        
        SUM(COALESCE(e.tokens_used, 0)),
        SUM(COALESCE(e.custo_brl, 0)),
        COUNT(*) FILTER (WHERE e.severity IN ('error', 'critical')),
        
        calculate_agent_health_score(a.id),
        
        CASE 
            WHEN calculate_agent_health_score(a.id) >= 80 THEN 'healthy'
            WHEN calculate_agent_health_score(a.id) >= 50 THEN 'degraded'
            ELSE 'critical'
        END
        
    FROM agents_v2 a
    LEFT JOIN agent_events e ON e.agent_id = a.id 
        AND e.created_at >= DATE_TRUNC('day', NOW() - INTERVAL '1 day')
        AND e.created_at < DATE_TRUNC('day', NOW())
    WHERE a.status = 'active'
    GROUP BY a.id, a.tenant_id;
END;
$$;

-- Enable RLS
ALTER TABLE agents_v2 ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_health_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE n8n_executions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view agents of their tenant" ON agents_v2
    FOR SELECT USING (tenant_id = get_user_tenant_id(auth.uid()));

CREATE POLICY "OWNER/ADMIN can manage agents" ON agents_v2
    FOR ALL USING (can_user_write(auth.uid(), tenant_id));

CREATE POLICY "Super admins can manage all agents" ON agents_v2
    FOR ALL USING (is_super_admin(auth.uid()));

CREATE POLICY "Users can view events of their tenant" ON agent_events
    FOR SELECT USING (tenant_id = get_user_tenant_id(auth.uid()));

CREATE POLICY "System can insert events" ON agent_events
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can view health snapshots" ON agent_health_snapshots
    FOR SELECT USING (tenant_id = get_user_tenant_id(auth.uid()));

CREATE POLICY "Users can view executions" ON n8n_executions
    FOR SELECT USING (tenant_id = get_user_tenant_id(auth.uid()));

CREATE POLICY "System can insert executions" ON n8n_executions
    FOR INSERT WITH CHECK (true);