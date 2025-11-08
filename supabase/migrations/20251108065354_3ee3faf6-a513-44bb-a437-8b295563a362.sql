-- Create tags table
CREATE TABLE public.chat_tags (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id BIGINT NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name VARCHAR(50) NOT NULL,
  color VARCHAR(7) NOT NULL DEFAULT '#3B82F6',
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, name)
);

-- Create chat_tags_mapping table (many-to-many relationship)
CREATE TABLE public.chat_tags_mapping (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  chat_id BIGINT NOT NULL REFERENCES public.chats(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES public.chat_tags(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  UNIQUE(chat_id, tag_id)
);

-- Enable RLS
ALTER TABLE public.chat_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_tags_mapping ENABLE ROW LEVEL SECURITY;

-- RLS Policies for chat_tags
CREATE POLICY "Users can view tags of their tenant"
  ON public.chat_tags FOR SELECT
  USING (tenant_id = get_user_tenant_id(auth.uid()));

CREATE POLICY "OWNER/ADMIN can manage tags"
  ON public.chat_tags FOR ALL
  USING (can_user_write(auth.uid(), tenant_id));

CREATE POLICY "Super admins can manage all tags"
  ON public.chat_tags FOR ALL
  USING (is_super_admin(auth.uid()));

-- RLS Policies for chat_tags_mapping
CREATE POLICY "Users can view tag mappings of their tenant chats"
  ON public.chat_tags_mapping FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.chats
    WHERE chats.id = chat_tags_mapping.chat_id
      AND chats.tenant_id = get_user_tenant_id(auth.uid())
  ));

CREATE POLICY "OWNER/ADMIN can manage tag mappings"
  ON public.chat_tags_mapping FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.chats
    WHERE chats.id = chat_tags_mapping.chat_id
      AND can_user_write(auth.uid(), chats.tenant_id)
  ));

CREATE POLICY "Super admins can manage all tag mappings"
  ON public.chat_tags_mapping FOR ALL
  USING (is_super_admin(auth.uid()));

-- Create indexes
CREATE INDEX idx_chat_tags_tenant ON public.chat_tags(tenant_id);
CREATE INDEX idx_chat_tags_mapping_chat ON public.chat_tags_mapping(chat_id);
CREATE INDEX idx_chat_tags_mapping_tag ON public.chat_tags_mapping(tag_id);

-- Add trigger for updated_at
CREATE TRIGGER update_chat_tags_updated_at
  BEFORE UPDATE ON public.chat_tags
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_updated_at();