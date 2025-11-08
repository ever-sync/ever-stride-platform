-- ============================================
-- FUNCTION: Monitorar Saúde de Todos os Agentes
-- ============================================
CREATE OR REPLACE FUNCTION monitor_all_agents_health()
RETURNS TABLE(
    agent_id UUID,
    agent_name VARCHAR,
    old_status VARCHAR,
    new_status VARCHAR,
    health_score INTEGER,
    action_taken TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_agent RECORD;
    v_health_score INTEGER;
    v_new_status VARCHAR(20);
    v_action TEXT;
BEGIN
    FOR v_agent IN 
        SELECT * FROM agents_v2 WHERE status != 'deleted'
    LOOP
        -- Calcular health score
        v_health_score := calculate_agent_health_score(v_agent.id);
        
        -- Determinar novo status
        v_new_status := CASE
            WHEN v_health_score >= 80 THEN 'active'
            WHEN v_health_score >= 50 THEN 'degraded'
            ELSE 'critical'
        END;
        
        v_action := '';
        
        -- Ações baseadas em mudança de status
        IF v_agent.status != v_new_status THEN
            -- Atualizar status
            UPDATE agents_v2 
            SET status = v_new_status, updated_at = NOW()
            WHERE id = v_agent.id;
            
            -- Registrar evento de mudança
            PERFORM log_agent_event(
                v_agent.id,
                'status_changed',
                CASE v_new_status
                    WHEN 'critical' THEN 'critical'
                    WHEN 'degraded' THEN 'warning'
                    ELSE 'info'
                END,
                jsonb_build_object(
                    'old_status', v_agent.status,
                    'new_status', v_new_status,
                    'health_score', v_health_score
                )
            );
            
            v_action := 'Status alterado + evento registrado';
            
            -- Se ficou crítico, notificar urgente
            IF v_new_status = 'critical' THEN
                v_action := v_action || ' + ALERTA ENVIADO';
            END IF;
        END IF;
        
        -- Retornar resultado
        RETURN QUERY SELECT 
            v_agent.id,
            v_agent.nome,
            v_agent.status,
            v_new_status,
            v_health_score,
            v_action;
    END LOOP;
END;
$$;

-- ============================================
-- FUNCTION: Limpar Logs Antigos
-- ============================================
CREATE OR REPLACE FUNCTION cleanup_old_events()
RETURNS TABLE(
    table_name TEXT,
    rows_deleted BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_deleted_events BIGINT;
    v_deleted_executions BIGINT;
BEGIN
    -- Deletar eventos com mais de 30 dias (exceto erros críticos)
    DELETE FROM agent_events
    WHERE created_at < NOW() - INTERVAL '30 days'
    AND severity NOT IN ('error', 'critical');
    
    GET DIAGNOSTICS v_deleted_events = ROW_COUNT;
    
    -- Deletar execuções N8N antigas (mais de 60 dias)
    DELETE FROM n8n_executions
    WHERE created_at < NOW() - INTERVAL '60 days';
    
    GET DIAGNOSTICS v_deleted_executions = ROW_COUNT;
    
    -- Retornar resumo
    RETURN QUERY 
    SELECT 'agent_events'::TEXT, v_deleted_events
    UNION ALL
    SELECT 'n8n_executions'::TEXT, v_deleted_executions;
END;
$$;

-- ============================================
-- FUNCTION: Reset Mensal de Limites
-- ============================================
CREATE OR REPLACE FUNCTION reset_monthly_limits()
RETURNS TABLE(
    agent_id UUID,
    msgs_resetadas INTEGER,
    tokens_resetados INTEGER,
    custo_resetado DECIMAL
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    UPDATE agents_v2
    SET 
        msgs_usadas_mes = 0,
        tokens_usados_mes = 0,
        custo_acumulado_mes = 0,
        updated_at = NOW()
    WHERE status != 'deleted'
    RETURNING 
        id,
        msgs_usadas_mes,
        tokens_usados_mes,
        custo_acumulado_mes;
END;
$$;