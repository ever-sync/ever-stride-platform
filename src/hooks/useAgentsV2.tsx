import { useState, useEffect } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/hooks/use-toast'

export function useAgentsV2() {
  const [agents, setAgents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  const loadAgents = async () => {
    try {
      setLoading(true)
      
      const { data, error } = await supabase
        .from('agents_v2')
        .select('*')
        .neq('status', 'deleted')
        .order('created_at', { ascending: false })

      if (error) throw error
      
      setAgents(data || [])
    } catch (error: any) {
      toast({
        title: 'Erro ao carregar agentes',
        description: error.message,
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAgents()
  }, [])

  return {
    agents,
    loading,
    refresh: loadAgents
  }
}