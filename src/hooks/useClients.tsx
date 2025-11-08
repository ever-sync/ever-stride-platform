import { useState, useEffect } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/components/ui/use-toast'

export interface WhatsAppClient {
  id: string
  tenant_id: number
  nome_empresa: string
  telefone?: string
  email?: string
  status_pagamento: string
  plano_id?: string
  created_at: string
  updated_at: string
}

export function useClients() {
  const [clients, setClients] = useState<WhatsAppClient[]>([])
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  const carregarClients = async () => {
    try {
      setLoading(true)
      
      const { data, error } = await supabase
        .from('whatsapp_clients')
        .select('*')
        .order('nome_empresa', { ascending: true })

      if (error) throw error
      setClients(data || [])
    } catch (error: any) {
      toast({
        title: 'Erro ao carregar clientes',
        description: error.message,
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    carregarClients()
  }, [])

  return {
    clients,
    loading,
    refresh: carregarClients
  }
}
