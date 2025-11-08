import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { History, RotateCcw, Save, FileText, Calendar } from 'lucide-react'

interface PromptVersionManagerProps {
  agentId: string
}

export function PromptVersionManager({ agentId }: PromptVersionManagerProps) {
  const [versions, setVersions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [agent, setAgent] = useState<any>(null)
  const [description, setDescription] = useState('')
  const { toast } = useToast()

  useEffect(() => {
    loadVersions()
    loadAgent()
  }, [agentId])

  const loadAgent = async () => {
    const { data } = await supabase
      .from('agents_v2')
      .select('*')
      .eq('id', agentId)
      .single()

    if (data) setAgent(data)
  }

  const loadVersions = async () => {
    try {
      const { data, error } = await supabase
        .from('prompt_versions')
        .select('*')
        .eq('agent_id', agentId)
        .order('version_number', { ascending: false })

      if (error) throw error
      setVersions(data || [])
    } catch (error) {
      console.error('Erro ao carregar versões:', error)
    } finally {
      setLoading(false)
    }
  }

  const createManualBackup = async () => {
    if (!agent || !description.trim()) {
      toast({
        title: 'Descrição obrigatória',
        description: 'Adicione uma descrição para o backup',
        variant: 'destructive'
      })
      return
    }

    setCreating(true)
    try {
      const { data: userData } = await supabase.auth.getUser()

      const nextVersion = versions.length > 0 
        ? Math.max(...versions.map(v => v.version_number)) + 1 
        : 1

      const { error } = await supabase
        .from('prompt_versions')
        .insert({
          agent_id: agentId,
          tenant_id: agent.tenant_id,
          version_number: nextVersion,
          prompt_sistema: agent.prompt_sistema,
          temperatura: agent.temperatura,
          max_tokens: agent.max_tokens,
          modelo_ia: agent.modelo_ia,
          backup_type: 'manual',
          change_description: description,
          created_by: userData.user?.id
        })

      if (error) throw error

      toast({
        title: 'Backup criado',
        description: 'Versão do prompt salva com sucesso'
      })

      setDescription('')
      loadVersions()
    } catch (error: any) {
      toast({
        title: 'Erro ao criar backup',
        description: error.message,
        variant: 'destructive'
      })
    } finally {
      setCreating(false)
    }
  }

  const rollbackToVersion = async (version: any) => {
    try {
      const { error } = await supabase
        .from('agents_v2')
        .update({
          prompt_sistema: version.prompt_sistema,
          temperatura: version.temperatura,
          max_tokens: version.max_tokens,
          modelo_ia: version.modelo_ia,
          updated_at: new Date().toISOString()
        })
        .eq('id', agentId)

      if (error) throw error

      // Criar versão de rollback
      const { data: userData } = await supabase.auth.getUser()
      await supabase
        .from('prompt_versions')
        .insert({
          agent_id: agentId,
          tenant_id: agent.tenant_id,
          version_number: Math.max(...versions.map(v => v.version_number)) + 1,
          prompt_sistema: version.prompt_sistema,
          temperatura: version.temperatura,
          max_tokens: version.max_tokens,
          modelo_ia: version.modelo_ia,
          backup_type: 'rollback',
          change_description: `Rollback para versão ${version.version_number}`,
          created_by: userData.user?.id
        })

      toast({
        title: 'Rollback realizado',
        description: `Agente restaurado para versão ${version.version_number}`
      })

      loadAgent()
      loadVersions()
    } catch (error: any) {
      toast({
        title: 'Erro no rollback',
        description: error.message,
        variant: 'destructive'
      })
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                Versionamento de Prompts
              </CardTitle>
              <CardDescription>
                Histórico automático de mudanças e backups manuais
              </CardDescription>
            </div>
            
            <Dialog>
              <DialogTrigger asChild>
                <Button>
                  <Save className="h-4 w-4 mr-2" />
                  Criar Backup Manual
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Criar Backup Manual</DialogTitle>
                  <DialogDescription>
                    Salve uma versão do prompt atual com uma descrição
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Descrição da mudança</Label>
                    <Textarea
                      placeholder="Ex: Ajuste para melhorar tom de voz..."
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      rows={3}
                    />
                  </div>
                  <Button 
                    onClick={createManualBackup} 
                    disabled={creating}
                    className="w-full"
                  >
                    {creating ? 'Salvando...' : 'Salvar Versão'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {versions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>Nenhuma versão salva ainda</p>
                <p className="text-sm">Backups são criados automaticamente ao editar o prompt</p>
              </div>
            ) : (
              versions.map((version) => (
                <Card key={version.id} className="border border-border">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">
                            v{version.version_number}
                          </Badge>
                          <Badge variant={
                            version.backup_type === 'manual' ? 'default' :
                            version.backup_type === 'auto' ? 'secondary' :
                            'warning'
                          }>
                            {version.backup_type === 'manual' ? 'Manual' :
                             version.backup_type === 'auto' ? 'Automático' :
                             'Rollback'}
                          </Badge>
                          {version.is_active && (
                            <Badge variant="success">Ativo</Badge>
                          )}
                        </div>
                        
                        <p className="text-sm">
                          {version.change_description || 'Sem descrição'}
                        </p>
                        
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {new Date(version.created_at).toLocaleString('pt-BR')}
                          </span>
                          <span>Modelo: {version.modelo_ia}</span>
                          <span>Temp: {version.temperatura}</span>
                          <span>Tokens: {version.max_tokens}</span>
                        </div>
                      </div>
                      
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => rollbackToVersion(version)}
                        disabled={version.is_active}
                      >
                        <RotateCcw className="h-4 w-4 mr-2" />
                        Restaurar
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}