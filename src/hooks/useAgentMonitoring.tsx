import { useState, useEffect } from 'react'
import { supabase } from '@/integrations/supabase/client'

export function useAgentMonitoring(agentId: string) {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const loadData = async () => {
    if (!agentId) return

    try {
      setLoading(true)

      // Buscar dados do agente
      const { data: agent, error: agentError } = await supabase
        .from('agents_v2')
        .select('*')
        .eq('id', agentId)
        .single()

      if (agentError) throw agentError

      setData({ agent })
    } catch (error) {
      console.error('Erro ao carregar monitoramento:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [agentId])

  return {
    data,
    loading,
    refresh: loadData
  }
}