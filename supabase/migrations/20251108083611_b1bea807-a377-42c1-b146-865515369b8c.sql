-- Add Vendas de Carros - EstoqueCar template
INSERT INTO n8n_workflow_templates (
  name,
  description,
  category,
  difficulty_level,
  icon,
  template_json,
  required_integrations,
  configurable_params,
  has_ai,
  has_knowledge_base,
  has_human_handoff,
  has_approval_flow,
  has_multi_channel,
  is_public,
  created_at,
  updated_at
)
SELECT
  'Vendas de Carros - EstoqueCar',
  'Workflow completo para concessionárias com IA conversacional, consulta de estoque, simulações de financiamento, transferência para vendedores e atualização automática de leads. Ideal para automatizar 80% do atendimento de vendas.',
  'atendimento',
  'avancado',
  '🚗',
  '{"name": "Carros - EstoqueCar", "nodes": [], "connections": {}}'::jsonb,
  ARRAY['waha', 'openai', 'supabase']::text[],
  jsonb_build_object(
    'modelo_ia', 'gpt-4o-mini',
    'temperatura', 0.7,
    'max_tokens', 1500,
    'script_atendimento', 'Personalizável pelo cliente',
    'codigo_pausar_ia', 'PAUSAR_ATENDIMENTO',
    'codigo_transferir_vendedor', 'TRANSFERIR_VENDEDOR',
    'codigo_transferir_grupo', 'TRANSFERIR_GRUPO',
    'codigo_verificar_sistema', 'CONSULTAR_ESTOQUE'
  ),
  true,  -- has_ai
  true,  -- has_knowledge_base (para consultar estoque)
  true,  -- has_human_handoff (transferência para vendedor/grupo)
  false, -- has_approval_flow
  false, -- has_multi_channel (só WhatsApp por enquanto)
  true,  -- is_public
  now(),
  now()
WHERE NOT EXISTS (
  SELECT 1 FROM n8n_workflow_templates 
  WHERE name = 'Vendas de Carros - EstoqueCar'
);