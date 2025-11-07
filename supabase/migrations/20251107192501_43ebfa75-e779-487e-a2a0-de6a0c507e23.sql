-- ============================================
-- FUNCTION: resetar_limites_mensais
-- Reseta contadores todo mês (executar via CRON)
-- ============================================
CREATE OR REPLACE FUNCTION resetar_limites_mensais()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    UPDATE limites_tokens
    SET 
        tokens_usados_mes = 0,
        custo_brl_usado_mes = 0,
        conversas_mes = 0,
        alerta_enviado_80 = false,
        alerta_enviado_90 = false,
        alerta_enviado_100 = false,
        ultimo_reset = CURRENT_DATE,
        updated_at = NOW()
    WHERE proximo_reset <= CURRENT_DATE;
    
    -- Log
    RAISE NOTICE 'Limites resetados para % clientes', 
        (SELECT COUNT(*) FROM limites_tokens WHERE ultimo_reset = CURRENT_DATE);
END;
$$;