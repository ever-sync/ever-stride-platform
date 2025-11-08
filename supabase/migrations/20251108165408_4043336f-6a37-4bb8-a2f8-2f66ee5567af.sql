-- Habilitar Replica Identity Full para capturar todas as mudanças
ALTER TABLE public.agent_events REPLICA IDENTITY FULL;

-- Adicionar tabela à publicação do realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.agent_events;
