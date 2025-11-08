export interface Agent {
  id: string
  tenant_id: number
  client_id: string
  workflow_id?: string
  n8n_workflow_id?: string
  
  nome_agente: string
  script_atendimento: string
  saudacao_inicial: string
  
  limite_mensagens_mes: number
  mensagens_usadas_mes: number
  tempo_atendimento: number
  
  // Config IA
  modelo_ia: string
  temperatura: number
  max_tokens: number
  prompt_sistema?: string
  webhook_url?: string
  
  ativo: boolean
  created_at: string
  updated_at: string
  
  // Relações
  whatsapp_clients?: {
    nome_empresa: string
    status_pagamento: string
  }
  
  n8n_workflows?: {
    workflow_id: string
    webhook_url: string
    is_active: boolean
  }
}

export interface AgentFormData {
  client_id: string
  tenant_id: number
  nome_agente: string
  script_atendimento: string
  saudacao_inicial: string
  limite_mensagens_mes: number
  tempo_atendimento: number
  modelo_ia: string
  temperatura: number
  max_tokens: number
  prompt_sistema?: string
}

export const MODELOS_IA = [
  { value: 'gpt-4o-mini', label: 'GPT-4o Mini (Econômico)', custo: 'Baixo' },
  { value: 'gpt-4o', label: 'GPT-4o (Equilibrado)', custo: 'Médio' },
  { value: 'gpt-4-turbo', label: 'GPT-4 Turbo (Premium)', custo: 'Alto' },
  { value: 'claude-haiku-4', label: 'Claude Haiku (Rápido)', custo: 'Baixo' },
  { value: 'claude-sonnet-4', label: 'Claude Sonnet (Recomendado)', custo: 'Médio' },
  { value: 'claude-opus-4', label: 'Claude Opus (Máximo)', custo: 'Muito Alto' }
] as const;
