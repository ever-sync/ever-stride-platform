import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppShell } from '@/components/AppShell'
import { useAgentsV2 } from '@/hooks/useAgentsV2'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { 
  Plus, 
  Search, 
  Activity, 
  AlertTriangle,
  CheckCircle,
  XCircle,
  TrendingUp
} from 'lucide-react'
import { Link } from 'react-router-dom'

export default function AgentsPage() {
  const navigate = useNavigate()
  const { agents, loading } = useAgentsV2()
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  const filteredAgents = agents?.filter(agent => {
    const matchesSearch = agent.nome.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === 'all' || agent.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const stats = {
    total: agents?.length || 0,
    active: agents?.filter(a => a.status === 'active').length || 0,
    paused: agents?.filter(a => a.status === 'paused').length || 0,
    error: agents?.filter(a => a.status === 'error').length || 0
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Agentes</h1>
          <p className="text-muted-foreground">Gerencie seus agentes de IA</p>
        </div>
        <Button onClick={() => navigate('/agents/new')}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Agente
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <Activity className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Ativos</p>
                <p className="text-2xl font-bold text-green-600">{stats.active}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pausados</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.paused}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Com Erro</p>
                <p className="text-2xl font-bold text-red-600">{stats.error}</p>
              </div>
              <XCircle className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Lista de Agentes</CardTitle>
              <CardDescription>
                {filteredAgents?.length || 0} agente(s) encontrado(s)
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar agentes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <div className="flex gap-2">
              <Button
                variant={statusFilter === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter('all')}
              >
                Todos
              </Button>
              <Button
                variant={statusFilter === 'active' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter('active')}
              >
                Ativos
              </Button>
              <Button
                variant={statusFilter === 'paused' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter('paused')}
              >
                Pausados
              </Button>
              <Button
                variant={statusFilter === 'error' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter('error')}
              >
                Erros
              </Button>
            </div>
          </div>

          {/* Lista de Agentes */}
          <div className="space-y-3">
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              </div>
            ) : filteredAgents && filteredAgents.length > 0 ? (
              filteredAgents.map((agent) => (
                <Link
                  key={agent.id}
                  to={`/agents/${agent.id}`}
                  className="block"
                >
                  <Card className="hover:shadow-md transition-shadow cursor-pointer">
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-lg font-semibold">{agent.nome}</h3>
                            <Badge variant={
                              agent.status === 'active' ? 'success' :
                              agent.status === 'paused' ? 'warning' :
                              'destructive'
                            }>
                              {agent.status}
                            </Badge>
                            {agent.n8n_workflow_id && (
                              <Badge variant="outline">
                                N8N Configurado
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground mb-3">
                            {agent.descricao || 'Sem descrição'}
                          </p>

                          <div className="grid grid-cols-4 gap-4 text-sm">
                            <div>
                              <p className="text-muted-foreground">Mensagens (mês)</p>
                              <p className="font-semibold">
                                {agent.msgs_usadas_mes || 0} / {agent.limite_msgs_mes}
                              </p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Tokens (mês)</p>
                              <p className="font-semibold">
                                {((agent.tokens_usados_mes || 0) / 1000).toFixed(1)}k
                              </p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Custo (mês)</p>
                              <p className="font-semibold">
                                R$ {(agent.custo_acumulado_mes || 0).toFixed(2)}
                              </p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Taxa Sucesso</p>
                              <p className="font-semibold text-green-600">
                                {(agent.taxa_sucesso || 100).toFixed(1)}%
                              </p>
                            </div>
                          </div>

                          {agent.ultimo_erro && (
                            <div className="mt-3 p-2 bg-destructive/10 rounded text-sm text-destructive border border-destructive/20">
                              <p className="font-medium">Último erro:</p>
                              <p className="text-xs">{agent.ultimo_erro}</p>
                            </div>
                          )}
                        </div>

                        <div className="ml-4">
                          <TrendingUp className="h-8 w-8 text-muted-foreground" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))
            ) : (
              <div className="text-center py-12">
                <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Nenhum agente encontrado</p>
                <Button className="mt-4" onClick={() => navigate('/agents/new')}>
                  <Plus className="h-4 w-4 mr-2" />
                  Criar Primeiro Agente
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}