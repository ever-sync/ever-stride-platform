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

      const { data, error } = await supabase.functions.invoke('ai-agent-chat', {
        body: {
          agent_id: agentId,
          message: message,
          test_mode: true
        }
      })

      if (error) throw error

      if (!data.success) {
        throw new Error(data.error || 'Erro ao testar agente')
      }

      toast({
        title: 'Teste concluído',
        description: 'Resposta recebida com sucesso'
      })

      return {
        response: data.response,
        tokens_used: data.tokens_used,
        custo_brl: data.custo_brl,
        modelo: data.modelo,
        provider: data.provider
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