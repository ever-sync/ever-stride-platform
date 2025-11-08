import { supabase } from "@/integrations/supabase/client";

interface CreateWorkflowParams {
  agentId: string;
  clientId: string;
  nome: string;
}

interface WorkflowResponse {
  workflow_id: string;
  webhook_url: string;
  webhook_test_url: string;
}

interface HealthCheckResponse {
  status: 'healthy' | 'degraded' | 'down';
  healthy: boolean;
  responseTimeMs?: number;
  circuitBreaker?: {
    state: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
    failureCount: number;
  };
  timestamp: string;
  error?: string;
}

interface CircuitBreakerStatus {
  state: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
  failureCount: number;
  lastFailureTime: string | null;
  retryAfterSeconds: number | null;
  canRetry: boolean;
  message: string;
}

export class N8NClient {
  async createWorkflow(params: CreateWorkflowParams): Promise<WorkflowResponse> {
    const { data, error } = await supabase.functions.invoke('n8n-workflow-create', {
      body: params
    });

    if (error) throw error;
    return data;
  }

  async deleteWorkflow(workflowId: string): Promise<void> {
    const { error } = await supabase.functions.invoke('n8n-workflow-delete', {
      body: { workflowId }
    });

    if (error) throw error;
  }

  async activateWorkflow(workflowId: string, active: boolean): Promise<void> {
    const { error } = await supabase.functions.invoke('n8n-workflow-activate', {
      body: { workflowId, active }
    });

    if (error) throw error;
  }

  async checkHealth(): Promise<HealthCheckResponse> {
    const { data, error } = await supabase.functions.invoke('n8n-health-check');

    if (error) throw error;
    return data;
  }

  async getCircuitBreakerStatus(): Promise<CircuitBreakerStatus> {
    const { data, error } = await supabase.functions.invoke('n8n-circuit-status');

    if (error) throw error;
    return data;
  }

  async resetCircuitBreaker(): Promise<void> {
    const { error } = await supabase.functions.invoke('n8n-circuit-status', {
      body: { action: 'reset' }
    });

    if (error) throw error;
  }
}

export const n8nClient = new N8NClient();
