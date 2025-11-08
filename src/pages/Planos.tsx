import { useState } from 'react'
import { PlanoForm } from '@/components/planos/PlanoForm'
import { usePlanos } from '@/hooks/usePlanos'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Plus, Edit, Trash2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

export default function Planos() {
  const { planos, loading, criarPlano, atualizarPlano, deletarPlano } = usePlanos()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selectedPlano, setSelectedPlano] = useState<any>(null)
  const [planoToDelete, setPlanoToDelete] = useState<string | null>(null)

  const handleCreate = () => {
    setSelectedPlano(null)
    setDialogOpen(true)
  }

  const handleEdit = (plano: any) => {
    setSelectedPlano(plano)
    setDialogOpen(true)
  }

  const handleDelete = (id: string) => {
    setPlanoToDelete(id)
    setDeleteDialogOpen(true)
  }

  const confirmDelete = async () => {
    if (planoToDelete) {
      await deletarPlano(planoToDelete)
      setDeleteDialogOpen(false)
      setPlanoToDelete(null)
    }
  }

  const handleSubmit = async (data: any) => {
    if (selectedPlano) {
      await atualizarPlano(selectedPlano.id, data)
    } else {
      await criarPlano(data)
    }
    setDialogOpen(false)
    setSelectedPlano(null)
  }

  if (loading) {
    return <div className="text-center py-12">Carregando...</div>
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Planos</h1>
          <p className="text-muted-foreground">Gerencie os planos oferecidos aos seus clientes</p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Novo Plano
        </Button>
      </div>

      {/* Lista de Planos */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {planos.map((plano) => (
          <Card key={plano.id} className={!plano.ativo ? 'opacity-50' : ''}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle>{plano.nome}</CardTitle>
                  <CardDescription className="mt-1">
                    {plano.descricao || 'Sem descrição'}
                  </CardDescription>
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleEdit(plano)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(plano.id)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Preço */}
              <div className="text-center py-4 bg-muted rounded-lg">
                <p className="text-3xl font-bold">
                  R$ {plano.preco_mensal.toFixed(2)}
                </p>
                <p className="text-sm text-muted-foreground">por mês</p>
              </div>

              {/* Limites */}
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Conversas/mês:</span>
                  <span className="font-medium">{plano.limite_conversas_mes.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tokens/mês:</span>
                  <span className="font-medium">{(plano.limite_tokens_mes / 1000).toFixed(0)}k</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Agentes:</span>
                  <span className="font-medium">{plano.limite_agentes}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Usuários:</span>
                  <span className="font-medium">{plano.limite_usuarios}</span>
                </div>
              </div>

              {/* Badges */}
              <div className="flex flex-wrap gap-2 pt-2">
                {!plano.ativo && (
                  <Badge variant="secondary">Inativo</Badge>
                )}
                {plano.is_default && (
                  <Badge variant="default">Padrão</Badge>
                )}
                {plano.is_publico && (
                  <Badge variant="outline">Público</Badge>
                )}
              </div>

              {/* Recursos */}
              {plano.recursos && plano.recursos.length > 0 && (
                <div className="pt-2">
                  <p className="text-xs text-muted-foreground mb-2">Recursos:</p>
                  <div className="flex flex-wrap gap-1">
                    {plano.recursos.slice(0, 3).map((recurso: string) => (
                      <Badge key={recurso} variant="outline" className="text-xs">
                        {recurso}
                      </Badge>
                    ))}
                    {plano.recursos.length > 3 && (
                      <Badge variant="outline" className="text-xs">
                        +{plano.recursos.length - 3}
                      </Badge>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Mensagem vazia */}
      {planos.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <p className="text-muted-foreground mb-4">Nenhum plano criado ainda</p>
            <Button onClick={handleCreate}>
              <Plus className="mr-2 h-4 w-4" />
              Criar Primeiro Plano
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Dialog de Criação/Edição */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedPlano ? 'Editar Plano' : 'Novo Plano'}
            </DialogTitle>
            <DialogDescription>
              {selectedPlano 
                ? 'Atualize as informações do plano' 
                : 'Crie um novo plano para oferecer aos seus clientes'
              }
            </DialogDescription>
          </DialogHeader>
          <PlanoForm
            initialData={selectedPlano}
            onSubmit={handleSubmit}
            onCancel={() => {
              setDialogOpen(false)
              setSelectedPlano(null)
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Dialog de Confirmação de Delete */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja deletar este plano? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive hover:bg-destructive/90">
              Deletar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
