import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Plano } from '@/types/plano';

export function usePlanos() {
  const [planos, setPlanos] = useState<Plano[]>([]);
  const [loading, setLoading] = useState(true);

  const carregarPlanos = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('planos')
        .select('*')
        .eq('ativo', true)
        .order('preco_mensal', { ascending: true });

      if (error) throw error;
      setPlanos((data || []) as Plano[]);
    } catch (error: any) {
      toast({
        title: 'Erro ao carregar planos',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const criarPlano = async (planoData: Omit<Plano, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const { data, error } = await supabase
        .from('planos')
        .insert(planoData)
        .select()
        .single();

      if (error) throw error;

      toast({
        title: 'Plano criado!',
        description: 'O plano foi criado com sucesso.'
      });

      await carregarPlanos();
      return data;
    } catch (error: any) {
      toast({
        title: 'Erro ao criar plano',
        description: error.message,
        variant: 'destructive'
      });
      throw error;
    }
  };

  const atualizarPlano = async (id: string, updates: Partial<Plano>) => {
    try {
      const { error } = await supabase
        .from('planos')
        .update(updates)
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Plano atualizado!',
        description: 'As alterações foram salvas.'
      });

      await carregarPlanos();
    } catch (error: any) {
      toast({
        title: 'Erro ao atualizar plano',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  const deletarPlano = async (id: string) => {
    try {
      const { error } = await supabase
        .from('planos')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Plano deletado',
        description: 'O plano foi removido com sucesso.'
      });

      await carregarPlanos();
    } catch (error: any) {
      toast({
        title: 'Erro ao deletar plano',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  useEffect(() => {
    carregarPlanos();
  }, []);

  return {
    planos,
    loading,
    carregarPlanos,
    criarPlano,
    atualizarPlano,
    deletarPlano,
    refresh: carregarPlanos
  };
}
