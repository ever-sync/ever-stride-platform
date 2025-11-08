import { useState } from 'react'
import { useParams, useNavigate, Navigate } from 'react-router-dom'
import { AppShell } from '@/components/AppShell'
import { isValidUUID } from '@/lib/uuid-validator'
import { AgentMonitoringDashboard } from '@/components/agents/AgentMonitoringDashboard'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'

export default function AgentMonitoring() {
  const { agentId } = useParams<{ agentId: string }>()
  const navigate = useNavigate()

  // Validar UUID
  if (!isValidUUID(agentId)) {
    return <Navigate to="/404" replace />
  }

  if (!agentId) {
    return (
      <AppShell>
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">ID do agente não fornecido</p>
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/agents')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Monitoramento de Agente</h1>
            <p className="text-muted-foreground">
              Métricas em tempo real e logs de eventos
            </p>
          </div>
        </div>

        <AgentMonitoringDashboard agentId={agentId} />
      </div>
    </AppShell>
  )
}
