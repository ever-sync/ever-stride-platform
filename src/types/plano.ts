export interface Plano {
  id: string
  tenant_id?: number
  
  nome: string
  descricao?: string
  preco_mensal: number
  
  limite_conversas_mes: number
  limite_tokens_mes: number
  limite_agentes: number
  limite_usuarios: number
  
  recursos: string[]
  integracoes_permitidas: string[]
  
  ativo: boolean
  is_publico: boolean
  is_default: boolean
  
  created_at: string
  updated_at: string
}

export const RECURSOS_DISPONIVEIS = [
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'instagram', label: 'Instagram Direct' },
  { value: 'telegram', label: 'Telegram' },
  { value: 'webchat', label: 'Chat Web' },
  { value: 'api', label: 'API Personalizada' },
  { value: 'analytics', label: 'Analytics Avançado' },
  { value: 'multi_agentes', label: 'Múltiplos Agentes' },
  { value: 'transferencia_humana', label: 'Transferência Humana' }
] as const;

export const INTEGRACOES_DISPONIVEIS = [
  { value: 'shopify', label: 'Shopify' },
  { value: 'woocommerce', label: 'WooCommerce' },
  { value: 'rd_station', label: 'RD Station' },
  { value: 'pipedrive', label: 'Pipedrive' },
  { value: 'hubspot', label: 'HubSpot' },
  { value: 'google_sheets', label: 'Google Sheets' },
  { value: 'stripe', label: 'Stripe' },
  { value: 'mercado_pago', label: 'Mercado Pago' }
] as const;
