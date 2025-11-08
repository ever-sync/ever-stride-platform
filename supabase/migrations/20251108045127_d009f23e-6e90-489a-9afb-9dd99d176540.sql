-- ============================================
-- VIEW: vw_custos_cliente_mensal
-- Agregação de custos por cliente (mensal)
-- ============================================
CREATE MATERIALIZED VIEW IF NOT EXISTS vw_custos_cliente_mensal AS
SELECT 
    t.client_id,
    c.nome_empresa as cliente_nome,
    c.tenant_id,
    DATE_TRUNC('month', t.created_at) as mes,
    COUNT(*) as total_chamadas,
    SUM(t.tokens_total) as tokens_total,
    SUM(t.custo_total_usd) as custo_total_usd,
    SUM(t.custo_total_brl) as custo_total_brl,
    AVG(t.tokens_total) as media_tokens_chamada,
    AVG(t.latencia_ms) as latencia_media_ms,
    COUNT(DISTINCT t.agent_id) as agentes_usados,
    SUM(CASE WHEN t.sucesso = false THEN 1 ELSE 0 END) as chamadas_com_erro
FROM token_usage t
JOIN whatsapp_clients c ON c.id = t.client_id
GROUP BY t.client_id, c.nome_empresa, c.tenant_id, DATE_TRUNC('month', t.created_at);

-- Índices para otimizar consultas
CREATE INDEX idx_vw_custos_cliente_mensal_client ON vw_custos_cliente_mensal(client_id, mes);
CREATE INDEX idx_vw_custos_cliente_mensal_tenant ON vw_custos_cliente_mensal(tenant_id, mes);

-- Comentário: Refresh automático pode ser configurado via pg_cron
-- SELECT cron.schedule(
--     'refresh-custos-view',
--     '0 */6 * * *', -- A cada 6 horas
--     'REFRESH MATERIALIZED VIEW vw_custos_cliente_mensal'
-- );