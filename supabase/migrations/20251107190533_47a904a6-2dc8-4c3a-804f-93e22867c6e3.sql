-- ============================================
-- FUNCTION: incrementar_uso_tokens
-- Incrementa contadores de forma atômica
-- ============================================
CREATE OR REPLACE FUNCTION incrementar_uso_tokens(
    p_client_id UUID,
    p_tokens INTEGER,
    p_custo_brl DECIMAL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Atualizar limites
    UPDATE limites_tokens
    SET 
        tokens_usados_mes = tokens_usados_mes + p_tokens,
        custo_brl_usado_mes = custo_brl_usado_mes + p_custo_brl,
        conversas_mes = conversas_mes + 1,
        updated_at = NOW()
    WHERE client_id = p_client_id;
    
    -- Se não existe registro, criar
    IF NOT FOUND THEN
        INSERT INTO limites_tokens (
            client_id,
            tokens_usados_mes,
            custo_brl_usado_mes,
            conversas_mes
        ) VALUES (
            p_client_id,
            p_tokens,
            p_custo_brl,
            1
        );
    END IF;
    
    -- Verificar se precisa enviar alertas
    PERFORM pg_notify(
        'check_limites',
        json_build_object(
            'client_id', p_client_id,
            'action', 'check_limit'
        )::text
    );
END;
$$;