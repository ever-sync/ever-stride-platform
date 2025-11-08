-- Tabela para histórico de ações nas sessões WhatsApp
CREATE TABLE IF NOT EXISTS public.waha_session_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.waha_sessions(id) ON DELETE CASCADE,
  action_type VARCHAR(50) NOT NULL, -- 'created', 'connected', 'disconnected', 'reconnect_attempt', 'message_sent', 'message_received', 'error'
  status VARCHAR(20) NOT NULL, -- 'success', 'error', 'pending'
  details JSONB DEFAULT '{}',
  error_message TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Índices para performance
CREATE INDEX idx_waha_session_logs_session ON public.waha_session_logs(session_id);
CREATE INDEX idx_waha_session_logs_action ON public.waha_session_logs(action_type);
CREATE INDEX idx_waha_session_logs_created ON public.waha_session_logs(created_at DESC);

-- Habilitar RLS
ALTER TABLE public.waha_session_logs ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Tenants can view their session logs"
  ON public.waha_session_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.waha_sessions ws
      WHERE ws.id = waha_session_logs.session_id
      AND ws.tenant_id = public.get_user_tenant_id(auth.uid())
    )
    OR public.is_super_admin(auth.uid())
  );

CREATE POLICY "Tenants can insert their session logs"
  ON public.waha_session_logs
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.waha_sessions ws
      WHERE ws.id = waha_session_logs.session_id
      AND ws.tenant_id = public.get_user_tenant_id(auth.uid())
    )
    OR public.is_super_admin(auth.uid())
  );

CREATE POLICY "Super admins can manage all session logs"
  ON public.waha_session_logs
  FOR ALL
  USING (public.is_super_admin(auth.uid()));

-- Adicionar campos para estatísticas na tabela waha_sessions (se não existirem)
ALTER TABLE public.waha_sessions 
ADD COLUMN IF NOT EXISTS avg_response_time_ms INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS success_rate NUMERIC(5,2) DEFAULT 100.00,
ADD COLUMN IF NOT EXISTS failed_messages INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_error TEXT,
ADD COLUMN IF NOT EXISTS last_error_at TIMESTAMPTZ;

-- Função para registrar log de ação
CREATE OR REPLACE FUNCTION public.log_waha_session_action(
  p_session_id UUID,
  p_action_type VARCHAR,
  p_status VARCHAR,
  p_details JSONB DEFAULT '{}',
  p_error_message TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_log_id UUID;
BEGIN
  INSERT INTO public.waha_session_logs (
    session_id,
    action_type,
    status,
    details,
    error_message,
    metadata,
    created_by
  ) VALUES (
    p_session_id,
    p_action_type,
    p_status,
    p_details,
    p_error_message,
    p_metadata,
    auth.uid()
  )
  RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
END;
$$;

-- Habilitar realtime na tabela de logs
ALTER PUBLICATION supabase_realtime ADD TABLE public.waha_session_logs;

-- Habilitar realtime na tabela de sessões (se ainda não estiver)
ALTER TABLE public.waha_sessions REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.waha_sessions;