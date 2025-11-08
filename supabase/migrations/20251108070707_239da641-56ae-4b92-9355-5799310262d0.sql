-- Adicionar campos para controle de transferência e pausar bot
ALTER TABLE public.chats 
ADD COLUMN IF NOT EXISTS bot_paused BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS transferred_to_human BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS transferred_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS transferred_by UUID REFERENCES auth.users(id);

-- Criar tabela de templates de respostas rápidas
CREATE TABLE IF NOT EXISTS public.quick_reply_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id BIGINT NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  content TEXT NOT NULL,
  category VARCHAR(50),
  shortcut VARCHAR(20),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(tenant_id, shortcut)
);

-- Habilitar RLS na tabela de templates
ALTER TABLE public.quick_reply_templates ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para templates
CREATE POLICY "Users can view templates of their tenant"
  ON public.quick_reply_templates
  FOR SELECT
  USING (tenant_id = get_user_tenant_id(auth.uid()));

CREATE POLICY "OWNER/ADMIN can manage templates"
  ON public.quick_reply_templates
  FOR ALL
  USING (can_user_write(auth.uid(), tenant_id));

CREATE POLICY "Super admins can manage all templates"
  ON public.quick_reply_templates
  FOR ALL
  USING (is_super_admin(auth.uid()));

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_quick_reply_templates_tenant ON public.quick_reply_templates(tenant_id);
CREATE INDEX IF NOT EXISTS idx_quick_reply_templates_category ON public.quick_reply_templates(tenant_id, category);
CREATE INDEX IF NOT EXISTS idx_chats_bot_paused ON public.chats(bot_paused) WHERE bot_paused = true;
CREATE INDEX IF NOT EXISTS idx_chats_transferred ON public.chats(transferred_to_human) WHERE transferred_to_human = true;

-- Trigger para atualizar updated_at
CREATE TRIGGER update_quick_reply_templates_updated_at
  BEFORE UPDATE ON public.quick_reply_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_updated_at();