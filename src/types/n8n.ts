export interface N8NWorkflow {
  id: string;
  tenant_id: number;
  agent_id?: string;
  workflow_id: string;
  workflow_name: string;
  webhook_url: string;
  webhook_test_url?: string;
  is_active: boolean;
  last_execution?: string;
  total_executions: number;
  failed_executions: number;
  created_at: string;
  updated_at: string;
  
  // Computed
  success_rate?: number;
  avg_execution_time_ms?: number;
  error_rate?: number;
}

export interface N8NExecutionLog {
  id: string;
  tenant_id: number;
  workflow_id: string;
  agent_id?: string;
  execution_id: string;
  execution_status: 'success' | 'failed' | 'running' | 'waiting' | 'error';
  execution_mode?: string;
  started_at: string;
  finished_at?: string;
  execution_time_ms?: number;
  input_data?: any;
  output_data?: any;
  error_message?: string;
  error_stack?: string;
  nodes_executed?: any;
  total_nodes?: number;
  failed_node?: string;
  created_at: string;
}

export interface N8NStats {
  total_workflows: number;
  active_workflows: number;
  total_executions: number;
  successful_executions: number;
  failed_executions: number;
  success_rate: number;
  avg_execution_time_ms: number;
  workflows_with_errors: number;
}

export interface ExecutionTrend {
  date: string;
  total: number;
  success: number;
  failed: number;
}

export interface N8NWorkflowTemplate {
  id: string;
  name: string;
  description?: string;
  category: 'atendimento' | 'conhecimento' | 'aprovacao' | 'integracao';
  difficulty_level: 'basico' | 'intermediario' | 'avancado';
  icon?: string;
  template_json: any;
  required_integrations: string[];
  configurable_params: Record<string, any>;
  has_ai: boolean;
  has_knowledge_base: boolean;
  has_human_handoff: boolean;
  has_approval_flow: boolean;
  has_multi_channel: boolean;
  is_public: boolean;
  created_by?: string;
  tenant_id?: number;
  usage_count: number;
  created_at: string;
  updated_at: string;
}

export interface ProblematicWorkflow {
  workflow_id: string;
  workflow_name: string;
  total_executions: number;
  failed_executions: number;
  error_rate: number;
}

export interface N8NMonitoringData {
  stats: N8NStats;
  trends: ExecutionTrend[];
  problematic_workflows: ProblematicWorkflow[];
  recent_logs: N8NExecutionLog[];
}
