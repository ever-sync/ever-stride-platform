import { useEffect, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/hooks/use-toast'
import { AlertTriangle, XCircle, AlertOctagon } from 'lucide-react'

interface AgentAlert {
  id: number
  agent_id: string
  agent_name: string
  event_type: string
  severity: 'info' | 'warning' | 'error' | 'critical'
  message: string
  created_at: string
}

export function useAgentAlerts() {
  const [alerts, setAlerts] = useState<AgentAlert[]>([])
  const { toast } = useToast()

  useEffect(() => {
    // Configurar realtime para escutar eventos críticos
    const channel = supabase
      .channel('agent-events-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'agent_events',
          filter: 'severity=in.(error,critical)'
        },
        async (payload) => {
          console.log('Novo evento crítico:', payload)
          
          const event = payload.new as any

          // Buscar nome do agente
          const { data: agent } = await supabase
            .from('agents_v2')
            .select('nome')
            .eq('id', event.agent_id)
            .single()

          const alert: AgentAlert = {
            id: event.id,
            agent_id: event.agent_id,
            agent_name: agent?.nome || 'Agente Desconhecido',
            event_type: event.event_type,
            severity: event.severity,
            message: event.error_message || 'Erro detectado',
            created_at: event.created_at
          }

          setAlerts(prev => [alert, ...prev.slice(0, 9)]) // Manter apenas 10

          // Mostrar toast para eventos críticos
          if (event.severity === 'critical') {
            toast({
              title: `🚨 Alerta Crítico: ${agent?.nome}`,
              description: event.error_message || 'Erro crítico detectado',
              variant: 'destructive',
              duration: 10000
            })
          } else if (event.severity === 'error') {
            toast({
              title: `⚠️ Erro: ${agent?.nome}`,
              description: event.error_message || 'Erro detectado',
              variant: 'destructive',
              duration: 5000
            })
          }
        }
      )
      .subscribe()

    // Carregar alertas recentes ao iniciar
    loadRecentAlerts()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const loadRecentAlerts = async () => {
    const { data: events } = await supabase
      .from('agent_events')
      .select(`
        id,
        agent_id,
        event_type,
        severity,
        error_message,
        created_at,
        agents_v2!inner(nome)
      `)
      .in('severity', ['error', 'critical'])
      .order('created_at', { ascending: false })
      .limit(10)

    if (events) {
      const formattedAlerts: AgentAlert[] = events.map((e: any) => ({
        id: e.id,
        agent_id: e.agent_id,
        agent_name: e.agents_v2?.nome || 'Agente Desconhecido',
        event_type: e.event_type,
        severity: e.severity,
        message: e.error_message || 'Erro detectado',
        created_at: e.created_at
      }))
      
      setAlerts(formattedAlerts)
    }
  }

  const clearAlert = (alertId: number) => {
    setAlerts(prev => prev.filter(a => a.id !== alertId))
  }

  const clearAllAlerts = () => {
    setAlerts([])
  }

  return {
    alerts,
    hasAlerts: alerts.length > 0,
    criticalCount: alerts.filter(a => a.severity === 'critical').length,
    errorCount: alerts.filter(a => a.severity === 'error').length,
    clearAlert,
    clearAllAlerts
  }
}
