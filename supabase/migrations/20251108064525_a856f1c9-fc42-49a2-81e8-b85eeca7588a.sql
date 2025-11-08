-- Add session_id column to chats table to link chats to WAHA sessions
ALTER TABLE public.chats 
ADD COLUMN session_id UUID REFERENCES public.waha_sessions(id) ON DELETE SET NULL;

-- Create index for better query performance
CREATE INDEX idx_chats_session_id ON public.chats(session_id);

-- Add comment to document the relationship
COMMENT ON COLUMN public.chats.session_id IS 'Links chat to the WAHA session that received the messages';