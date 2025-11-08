-- Migração de dados de agents para agents_v2 (corrigida)
-- Copia todos os dados da tabela antiga para a nova com valores padrão

INSERT INTO agents_v2 (
  id,
  tenant_id,
  client_id,
  nome,
  descricao,
  prompt_sistema,
  saudacao_inicial,
  modelo_ia,
  temperatura,
  max_tokens,
  n8n_workflow_id,
  n8n_webhook_url,
  limite_msgs_mes,
  msgs_usadas_mes,
  status,
  created_at,
  updated_at
)
SELECT 
  id,
  tenant_id,
  client_id,
  nome_agente,
  COALESCE(script_atendimento, 'Agente de atendimento'),
  COALESCE(prompt_sistema, 'Você é um assistente virtual prestativo e profissional. Responda de forma clara e objetiva às perguntas dos usuários.'),
  COALESCE(saudacao_inicial, 'Olá! Como posso ajudar?'),
  COALESCE(modelo_ia, 'gpt-4o-mini'),
  COALESCE(temperatura, 0.7),
  COALESCE(max_tokens, 800),
  n8n_workflow_id,
  webhook_url,
  COALESCE(limite_mensagens_mes, 1000),
  COALESCE(mensagens_usadas_mes, 0),
  CASE 
    WHEN ativo THEN 'active'::character varying
    ELSE 'paused'::character varying
  END,
  created_at,
  updated_at
FROM agents
WHERE NOT EXISTS (
  SELECT 1 FROM agents_v2 WHERE agents_v2.id = agents.id
)
ON CONFLICT (id) DO NOTHING;

-- Criar função para sincronizar automaticamente agents -> agents_v2
CREATE OR REPLACE FUNCTION sync_agents_to_v2()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO agents_v2 (
    id, tenant_id, client_id, nome, descricao, prompt_sistema,
    saudacao_inicial, modelo_ia, temperatura, max_tokens,
    n8n_workflow_id, n8n_webhook_url, limite_msgs_mes,
    msgs_usadas_mes, status, created_at, updated_at
  )
  VALUES (
    NEW.id,
    NEW.tenant_id,
    NEW.client_id,
    NEW.nome_agente,
    COALESCE(NEW.script_atendimento, 'Agente de atendimento'),
    COALESCE(NEW.prompt_sistema, 'Você é um assistente virtual prestativo e profissional. Responda de forma clara e objetiva às perguntas dos usuários.'),
    COALESCE(NEW.saudacao_inicial, 'Olá! Como posso ajudar?'),
    COALESCE(NEW.modelo_ia, 'gpt-4o-mini'),
    COALESCE(NEW.temperatura, 0.7),
    COALESCE(NEW.max_tokens, 800),
    NEW.n8n_workflow_id,
    NEW.webhook_url,
    COALESCE(NEW.limite_mensagens_mes, 1000),
    COALESCE(NEW.mensagens_usadas_mes, 0),
    CASE WHEN NEW.ativo THEN 'active'::character varying ELSE 'paused'::character varying END,
    NEW.created_at,
    NEW.updated_at
  )
  ON CONFLICT (id) DO UPDATE SET
    nome = EXCLUDED.nome,
    descricao = EXCLUDED.descricao,
    prompt_sistema = EXCLUDED.prompt_sistema,
    saudacao_inicial = EXCLUDED.saudacao_inicial,
    modelo_ia = EXCLUDED.modelo_ia,
    temperatura = EXCLUDED.temperatura,
    max_tokens = EXCLUDED.max_tokens,
    n8n_workflow_id = EXCLUDED.n8n_workflow_id,
    n8n_webhook_url = EXCLUDED.n8n_webhook_url,
    limite_msgs_mes = EXCLUDED.limite_msgs_mes,
    msgs_usadas_mes = EXCLUDED.msgs_usadas_mes,
    status = EXCLUDED.status,
    updated_at = EXCLUDED.updated_at;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Criar trigger para sincronização automática
DROP TRIGGER IF EXISTS sync_agents_trigger ON agents;
CREATE TRIGGER sync_agents_trigger
AFTER INSERT OR UPDATE ON agents
FOR EACH ROW
EXECUTE FUNCTION sync_agents_to_v2();