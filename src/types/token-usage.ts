export interface TokenUsage {
  id: string
  tenant_id: number
  client_id: string
  agent_id: string
  chat_id?: number
  message_id?: number
  
  modelo: string
  provider: string
  
  tokens_input: number
  tokens_output: number
  tokens_cache_read: number
  tokens_total: number
  
  custo_input_usd: number
  custo_output_usd: number
  custo_cache_usd: number
  custo_total_usd: number
  
  cotacao_usd_brl: number
  custo_total_brl: number
  
  latencia_ms?: number
  sucesso: boolean
  erro?: string
  
  prompt_length?: number
  response_length?: number
  
  created_at: string
}

export interface LimiteTokens {
  id: string
  client_id: string
  
  limite_tokens_mes: number
  limite_custo_brl_mes: number
  limite_conversas_mes: number
  
  tokens_usados_mes: number
  custo_brl_usado_mes: number
  conversas_mes: number
  
  alerta_enviado_80: boolean
  alerta_enviado_90: boolean
  alerta_enviado_100: boolean
  
  ultimo_reset: string
  proximo_reset: string
  
  created_at: string
  updated_at: string
}

export interface TokenStats {
  total_tokens: number
  total_custo_brl: number
  total_conversas: number
  percentual_usado: number
  tokens_restantes: number
  custo_medio_conversa: number
  modelo_mais_usado: string
}
