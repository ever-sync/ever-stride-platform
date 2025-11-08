import { useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/hooks/use-toast'

export function useAgentActions(agentId: string) {
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  const pauseAgent = async () => {
    try {
      setLoading(true)
      
      const { error } = await supabase
        .from('agents_v2')
        .update({ status: 'paused' })
        .eq('id', agentId)

      if (error) throw error

      toast({
        title: 'Agente pausado',
        description: 'O agente foi pausado com sucesso'
      })
    } catch (error: any) {
      toast({
        title: 'Erro ao pausar agente',
        description: error.message,
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const resumeAgent = async () => {
    try {
      setLoading(true)
      
      const { error } = await supabase
        .from('agents_v2')
        .update({ status: 'active' })
        .eq('id', agentId)

      if (error) throw error

      toast({
        title: 'Agente reativado',
        description: 'O agente foi reativado com sucesso'
      })
    } catch (error: any) {
      toast({
        title: 'Erro ao reativar agente',
        description: error.message,
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const testAgent = async (message: string) => {
    try {
      setLoading(true)

      // TODO: Implementar chamada ao agente de teste
      // Por enquanto, retorna dados mockados
      return {
        response: 'Resposta do agente de teste',
        tokens_used: 150,
        custo_brl: 0.0015,
        modelo: 'gpt-4o-mini'
      }
    } catch (error: any) {
      toast({
        title: 'Erro ao testar agente',
        description: error.message,
        variant: 'destructive'
      })
      return null
    } finally {
      setLoading(false)
    }
  }

  const syncN8NWorkflow = async () => {
    try {
      setLoading(true)

      // TODO: Implementar sincronização com N8N
      toast({
        title: 'Sincronização iniciada',
        description: 'O workflow N8N está sendo sincronizado'
      })
    } catch (error: any) {
      toast({
        title: 'Erro ao sincronizar',
        description: error.message,
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  return {
    loading,
    pauseAgent,
    resumeAgent,
    testAgent,
    syncN8NWorkflow
  }
}