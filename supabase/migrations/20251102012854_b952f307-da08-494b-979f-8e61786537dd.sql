-- Create whatsapp_clients table for multi-tenant WhatsApp automation
CREATE TABLE public.whatsapp_clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  tenant_id BIGINT NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  
  -- Company information
  nome_empresa TEXT NOT NULL,
  cnpj TEXT,
  email TEXT NOT NULL,
  telefone TEXT,
  whatsapp_numero TEXT NOT NULL,
  
  -- Waha integration
  waha_session_id TEXT,
  waha_webhook_url TEXT,
  waha_status TEXT DEFAULT 'STOPPED',
  
  -- AI Agent configuration
  script_atendimento TEXT NOT NULL,
  nome_agente TEXT DEFAULT 'Assistente',
  saudacao_inicial TEXT DEFAULT 'Olá! Como posso ajudar?',
  
  -- API and billing
  api_key TEXT UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  ativo BOOLEAN DEFAULT TRUE,
  plano TEXT DEFAULT 'basico' CHECK (plano IN ('basico', 'premium', 'enterprise')),
  limite_mensagens_mes INTEGER DEFAULT 1000,
  mensagens_usadas_mes INTEGER DEFAULT 0,
  
  UNIQUE(tenant_id, email),
  UNIQUE(tenant_id, whatsapp_numero)
);

-- Enable RLS
ALTER TABLE public.whatsapp_clients ENABLE ROW LEVEL SECURITY;

-- Policies: Users can only see and manage clients from their tenant
CREATE POLICY "Users can view whatsapp_clients of their tenant"
ON public.whatsapp_clients
FOR SELECT
USING (tenant_id = get_user_tenant_id(auth.uid()));

CREATE POLICY "OWNER/ADMIN can manage whatsapp_clients"
ON public.whatsapp_clients
FOR ALL
USING (can_user_write(auth.uid(), tenant_id));

-- Trigger for updated_at
CREATE TRIGGER update_whatsapp_clients_updated_at
BEFORE UPDATE ON public.whatsapp_clients
FOR EACH ROW
EXECUTE FUNCTION public.touch_updated_at();

-- Create index for better performance
CREATE INDEX idx_whatsapp_clients_tenant_id ON public.whatsapp_clients(tenant_id);
CREATE INDEX idx_whatsapp_clients_api_key ON public.whatsapp_clients(api_key);
CREATE INDEX idx_whatsapp_clients_whatsapp_numero ON public.whatsapp_clients(whatsapp_numero);