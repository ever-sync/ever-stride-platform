import { useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/hooks/useAuth'

interface CreateAgentData {
  nome: string
  descricao?: string
  tipo?: string
  modelo_ia?: string
  temperatura?: number
  max_tokens?: number
  prompt_sistema: string
  saudacao_inicial?: string
  client_id?: string
}

export function useCreateAgent() {
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()
  const { userSession } = useAuth()

  const createAgent = async (data: CreateAgentData) => {
    if (!userSession?.tenant?.id) {
      toast({
        title: 'Erro',
        description: 'Tenant não identificado',
        variant: 'destructive'
      })
      return null
    }

    try {
      setLoading(true)

      const { data: newAgent, error } = await supabase
        .from('agents_v2')
        .insert({
          tenant_id: userSession.tenant.id,
          nome: data.nome,
          descricao: data.descricao || 'Novo agente',
          tipo: data.tipo || 'atendimento',
          modelo_ia: data.modelo_ia || 'gpt-4o-mini',
          temperatura: data.temperatura || 0.7,
          max_tokens: data.max_tokens || 800,
          prompt_sistema: data.prompt_sistema,
          saudacao_inicial: data.saudacao_inicial || 'Olá! Como posso ajudar?',
          client_id: data.client_id,
          status: 'active',
          created_by: userSession.user.id
        })
        .select()
        .single()

      if (error) throw error

      toast({
        title: 'Sucesso',
        description: 'Agente criado com sucesso!'
      })

      return newAgent
    } catch (error: any) {
      console.error('Erro ao criar agente:', error)
      toast({
        title: 'Erro ao criar agente',
        description: error.message,
        variant: 'destructive'
      })
      return null
    } finally {
      setLoading(false)
    }
  }

  return {
    createAgent,
    loading
  }
}
