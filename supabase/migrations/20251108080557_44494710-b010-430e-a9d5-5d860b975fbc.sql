-- Criar tabela de templates de workflows N8N
CREATE TABLE n8n_workflow_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(200) NOT NULL,
  description TEXT,
  category VARCHAR(100) NOT NULL, -- 'atendimento', 'conhecimento', 'aprovacao', 'integracao'
  difficulty_level VARCHAR(50) DEFAULT 'intermediario',
  icon TEXT,
  
  -- Template structure
  template_json JSONB NOT NULL,
  required_integrations TEXT[] DEFAULT '{}',
  configurable_params JSONB DEFAULT '{}',
  
  -- Features
  has_ai BOOLEAN DEFAULT true,
  has_knowledge_base BOOLEAN DEFAULT false,
  has_human_handoff BOOLEAN DEFAULT false,
  has_approval_flow BOOLEAN DEFAULT false,
  has_multi_channel BOOLEAN DEFAULT false,
  
  -- Meta
  is_public BOOLEAN DEFAULT true,
  created_by UUID,
  tenant_id BIGINT REFERENCES tenants(id),
  usage_count INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_templates_category ON n8n_workflow_templates(category);
CREATE INDEX idx_templates_tenant ON n8n_workflow_templates(tenant_id);

-- RLS
ALTER TABLE n8n_workflow_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can view public templates"
  ON n8n_workflow_templates FOR SELECT
  USING (is_public = true OR tenant_id = get_user_tenant_id(auth.uid()) OR is_super_admin(auth.uid()));

CREATE POLICY "Tenants can manage their templates"
  ON n8n_workflow_templates FOR ALL
  USING (tenant_id = get_user_tenant_id(auth.uid()) OR is_super_admin(auth.uid()));

CREATE POLICY "Super admins can manage all templates"
  ON n8n_workflow_templates FOR ALL
  USING (is_super_admin(auth.uid()));

-- Criar tabela de logs de execução N8N
CREATE TABLE n8n_execution_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id BIGINT NOT NULL REFERENCES tenants(id),
  workflow_id VARCHAR(100) NOT NULL,
  agent_id UUID REFERENCES agents(id),
  
  -- Dados da execução
  execution_id VARCHAR(100) UNIQUE NOT NULL,
  execution_status VARCHAR(50) NOT NULL,
  execution_mode VARCHAR(50),
  
  -- Timing
  started_at TIMESTAMPTZ NOT NULL,
  finished_at TIMESTAMPTZ,
  execution_time_ms INTEGER,
  
  -- Input/Output
  input_data JSONB,
  output_data JSONB,
  error_message TEXT,
  error_stack TEXT,
  
  -- Node details
  nodes_executed JSONB,
  total_nodes INTEGER,
  failed_node VARCHAR(200),
  
  -- Meta
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_execution_logs_workflow ON n8n_execution_logs(workflow_id, created_at DESC);
CREATE INDEX idx_execution_logs_tenant ON n8n_execution_logs(tenant_id, created_at DESC);
CREATE INDEX idx_execution_logs_agent ON n8n_execution_logs(agent_id);
CREATE INDEX idx_execution_logs_status ON n8n_execution_logs(execution_status);
CREATE INDEX idx_execution_logs_execution_id ON n8n_execution_logs(execution_id);

-- RLS
ALTER TABLE n8n_execution_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenants can view their execution logs"
  ON n8n_execution_logs FOR SELECT
  USING (tenant_id = get_user_tenant_id(auth.uid()) OR is_super_admin(auth.uid()));

CREATE POLICY "System can insert execution logs"
  ON n8n_execution_logs FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Super admins can manage all logs"
  ON n8n_execution_logs FOR ALL
  USING (is_super_admin(auth.uid()));

-- Função para atualizar estatísticas de workflow
CREATE OR REPLACE FUNCTION update_n8n_workflow_stats(
  p_workflow_id VARCHAR,
  p_execution_status VARCHAR,
  p_execution_time_ms INTEGER
) RETURNS VOID AS $$
BEGIN
  UPDATE n8n_workflows
  SET 
    total_executions = total_executions + 1,
    failed_executions = CASE 
      WHEN p_execution_status IN ('failed', 'error') 
      THEN failed_executions + 1 
      ELSE failed_executions 
    END,
    last_execution = NOW(),
    updated_at = NOW()
  WHERE workflow_id = p_workflow_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Popular templates iniciais
INSERT INTO n8n_workflow_templates (name, description, category, difficulty_level, icon, template_json, required_integrations, configurable_params, has_ai, has_knowledge_base) VALUES
('Atendimento Simples', 'Chatbot básico com IA para responder mensagens do WhatsApp', 'atendimento', 'basico', '🤖', 
'{"nodes": [{"type": "webhook"}, {"type": "process"}, {"type": "ai"}, {"type": "waha"}]}'::jsonb,
ARRAY['waha', 'openai'],
'{"modelo_ia": "gpt-4o-mini", "temperatura": 0.7, "max_tokens": 800}'::jsonb,
true, false),

('Atendimento com Base de Conhecimento', 'Chatbot que consulta sua base de conhecimento antes de responder', 'conhecimento', 'intermediario', '📚',
'{"nodes": [{"type": "webhook"}, {"type": "process"}, {"type": "search_kb"}, {"type": "ai"}, {"type": "waha"}]}'::jsonb,
ARRAY['waha', 'openai', 'supabase'],
'{"modelo_ia": "gpt-4o-mini", "similarity_threshold": 0.7, "max_tokens": 1000}'::jsonb,
true, true),

('Atendimento com Aprovação Humana', 'IA responde perguntas simples, mas escala para humanos quando necessário', 'aprovacao', 'avancado', '🙋',
'{"nodes": [{"type": "webhook"}, {"type": "evaluate"}, {"type": "ai"}, {"type": "human_handoff"}, {"type": "waha"}]}'::jsonb,
ARRAY['waha', 'openai'],
'{"complexity_threshold": 0.6, "wait_time_seconds": 300}'::jsonb,
true, false),

('Qualificação de Leads', 'Extrai informações e qualifica leads automaticamente', 'integracao', 'intermediario', '🎯',
'{"nodes": [{"type": "webhook"}, {"type": "extract_info"}, {"type": "classify"}, {"type": "crm"}, {"type": "notify"}]}'::jsonb,
ARRAY['waha', 'openai'],
'{"qualification_criteria": {}, "crm_webhook": ""}'::jsonb,
true, false);