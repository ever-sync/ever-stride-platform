import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { TokenUsage, LimiteTokens, TokenStats } from '@/types/token-usage';

export function useTokenUsage(clientId?: string, agentId?: string) {
  const [usage, setUsage] = useState<TokenUsage[]>([]);
  const [limite, setLimite] = useState<LimiteTokens | null>(null);
  const [stats, setStats] = useState<TokenStats | null>(null);
  const [loading, setLoading] = useState(true);

  const carregarUsage = async () => {
    try {
      setLoading(true);
      
      let query = supabase
        .from('token_usage')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (clientId) query = query.eq('client_id', clientId);
      if (agentId) query = query.eq('agent_id', agentId);

      const { data, error } = await query;

      if (error) throw error;
      setUsage(data || []);
      
      // Calcular estatísticas
      if (data && data.length > 0) {
        const total_tokens = data.reduce((sum, u) => sum + (u.tokens_total || 0), 0);
        const total_custo_brl = data.reduce((sum, u) => sum + (u.custo_total_brl || 0), 0);
        const total_conversas = data.length;
        
        // Modelo mais usado
        const modeloCounts = data.reduce((acc: any, u) => {
          acc[u.modelo] = (acc[u.modelo] || 0) + 1;
          return acc;
        }, {});
        const modelo_mais_usado = Object.keys(modeloCounts).sort(
          (a, b) => modeloCounts[b] - modeloCounts[a]
        )[0] || 'N/A';

        setStats({
          total_tokens,
          total_custo_brl,
          total_conversas,
          percentual_usado: 0,
          tokens_restantes: 0,
          custo_medio_conversa: total_conversas > 0 ? total_custo_brl / total_conversas : 0,
          modelo_mais_usado
        });
      }
    } catch (error) {
      console.error('Erro ao carregar usage:', error);
    } finally {
      setLoading(false);
    }
  };

  const carregarLimite = async () => {
    if (!clientId) return;

    try {
      const { data, error } = await supabase
        .from('limites_tokens')
        .select('*')
        .eq('client_id', clientId)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      
      if (data) {
        setLimite(data);
        
        // Atualizar stats com percentual
        if (stats) {
          const percentual = data.limite_tokens_mes > 0 
            ? (data.tokens_usados_mes / data.limite_tokens_mes) * 100 
            : 0;
          
          setStats({
            ...stats,
            percentual_usado: percentual,
            tokens_restantes: data.limite_tokens_mes - data.tokens_usados_mes
          });
        }
      }
    } catch (error) {
      console.error('Erro ao carregar limite:', error);
    }
  };

  useEffect(() => {
    carregarUsage();
    if (clientId) carregarLimite();
  }, [clientId, agentId]);

  return {
    usage,
    limite,
    stats,
    loading,
    refresh: () => {
      carregarUsage();
      carregarLimite();
    }
  };
}
