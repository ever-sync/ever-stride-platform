-- ============================================
-- FUNCTION: verificar_limite_cliente
-- Retorna se cliente pode usar o agente
-- ============================================
CREATE OR REPLACE FUNCTION verificar_limite_cliente(
    p_client_id UUID
)
RETURNS TABLE(
    pode_usar BOOLEAN,
    percentual_usado DECIMAL,
    tokens_restantes INTEGER,
    motivo TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_limite RECORD;
    v_client RECORD;
    v_percentual DECIMAL;
BEGIN
    -- Buscar dados do cliente
    SELECT * INTO v_client
    FROM whatsapp_clients
    WHERE id = p_client_id;
    
    -- Verificar status de pagamento
    IF v_client.status_pagamento != 'ativo' THEN
        RETURN QUERY SELECT 
            false,
            100.0::DECIMAL,
            0,
            'Cliente com pagamento ' || v_client.status_pagamento;
        RETURN;
    END IF;
    
    -- Buscar limites
    SELECT * INTO v_limite
    FROM limites_tokens
    WHERE client_id = p_client_id;
    
    -- Se não tem limite configurado, permitir
    IF v_limite IS NULL THEN
        RETURN QUERY SELECT 
            true,
            0.0::DECIMAL,
            999999,
            'Sem limites configurados';
        RETURN;
    END IF;
    
    -- Calcular percentual
    v_percentual := (v_limite.tokens_usados_mes::DECIMAL / NULLIF(v_limite.limite_tokens_mes, 0)::DECIMAL) * 100;
    
    IF v_percentual >= 100 THEN
        RETURN QUERY SELECT 
            false,
            v_percentual,
            0,
            'Limite de tokens atingido';
    ELSE
        RETURN QUERY SELECT 
            true,
            v_percentual,
            v_limite.limite_tokens_mes - v_limite.tokens_usados_mes,
            'OK';
    END IF;
END;
$$;