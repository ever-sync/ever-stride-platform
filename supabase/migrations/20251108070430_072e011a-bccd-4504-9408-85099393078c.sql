-- Fix RLS issues identified in security scan

-- 1. Add RLS policies to circuit_breaker_state table
CREATE POLICY "Super admins can view circuit breaker state"
  ON public.circuit_breaker_state
  FOR SELECT
  TO authenticated
  USING (public.is_super_admin(auth.uid()));

CREATE POLICY "System can manage circuit breaker state"
  ON public.circuit_breaker_state
  FOR ALL
  TO service_role
  USING (true);

-- 2. Fix tenants table - restrict public access
-- Remove any overly permissive policies and add proper restrictions
DROP POLICY IF EXISTS "Public can view tenants" ON public.tenants;

-- Only super admins should view all tenants
-- (existing policies already handle this correctly)