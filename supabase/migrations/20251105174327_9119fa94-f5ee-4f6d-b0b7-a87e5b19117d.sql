-- Adicionar campo tempo_atendimento na tabela agents
ALTER TABLE public.agents 
ADD COLUMN tempo_atendimento INTEGER DEFAULT 30;

COMMENT ON COLUMN public.agents.tempo_atendimento IS 'Tempo máximo de atendimento em minutos';