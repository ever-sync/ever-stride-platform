-- Tabela para métricas de edge functions (se não existir)
CREATE TABLE IF NOT EXISTS public.edge_function_metrics (
  id BIGSERIAL PRIMARY KEY,
  function_name TEXT NOT NULL,
  execution_time_ms INTEGER NOT NULL,
  status TEXT NOT NULL,
  retry_count INTEGER DEFAULT 0,
  error_message TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Índices para métricas (com IF NOT EXISTS)
CREATE INDEX IF NOT EXISTS idx_edge_metrics_function_name ON public.edge_function_metrics(function_name);
CREATE INDEX IF NOT EXISTS idx_edge_metrics_created_at ON public.edge_function_metrics(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_edge_metrics_status_new ON public.edge_function_metrics(status);

-- RLS para métricas
ALTER TABLE public.edge_function_metrics ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'edge_function_metrics' 
    AND policyname = 'Super admins podem ver todas as métricas'
  ) THEN
    CREATE POLICY "Super admins podem ver todas as métricas"
    ON public.edge_function_metrics FOR SELECT
    USING (is_super_admin(auth.uid()));
  END IF;
END $$;

-- Tabela para estado do circuit breaker
CREATE TABLE IF NOT EXISTS public.circuit_breaker_state (
  service_name TEXT PRIMARY KEY,
  state TEXT NOT NULL DEFAULT 'CLOSED',
  failure_count INTEGER DEFAULT 0,
  last_failure_time TIMESTAMPTZ,
  last_success_time TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Função para obter métricas agregadas
CREATE OR REPLACE FUNCTION get_edge_function_stats(
  p_function_name TEXT,
  p_hours INTEGER DEFAULT 24
)
RETURNS TABLE(
  total_calls BIGINT,
  success_calls BIGINT,
  error_calls BIGINT,
  avg_execution_time NUMERIC,
  p95_execution_time NUMERIC,
  success_rate NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT as total_calls,
    COUNT(*) FILTER (WHERE status = 'success')::BIGINT as success_calls,
    COUNT(*) FILTER (WHERE status = 'error')::BIGINT as error_calls,
    ROUND(AVG(execution_time_ms)::NUMERIC, 2) as avg_execution_time,
    ROUND(PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY execution_time_ms)::NUMERIC, 2) as p95_execution_time,
    ROUND((COUNT(*) FILTER (WHERE status = 'success')::NUMERIC / NULLIF(COUNT(*), 0)::NUMERIC * 100), 2) as success_rate
  FROM public.edge_function_metrics
  WHERE function_name = p_function_name
  AND created_at >= now() - (p_hours || ' hours')::INTERVAL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;