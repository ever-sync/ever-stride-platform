import { useState } from 'react'
import { TokenUsageDashboard } from '@/components/tokens/TokenUsageDashboard'
import { useClients } from '@/hooks/useClients'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function TokenUsage() {
  const { clients } = useClients()
  const [selectedClientId, setSelectedClientId] = useState<string>('')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Uso de Tokens</h1>
        <p className="text-muted-foreground">Monitore o consumo de IA dos seus clientes</p>
      </div>

      {/* Seletor de Cliente */}
      <Card>
        <CardHeader>
          <CardTitle>Selecionar Cliente</CardTitle>
          <CardDescription>
            Veja o uso detalhado de tokens e custos
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="max-w-md">
            <Label>Cliente</Label>
            <Select value={selectedClientId} onValueChange={setSelectedClientId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione um cliente" />
              </SelectTrigger>
              <SelectContent>
                {clients.map((client) => (
                  <SelectItem key={client.id} value={client.id}>
                    {client.nome_empresa}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Dashboard */}
      {selectedClientId && (
        <TokenUsageDashboard clientId={selectedClientId} />
      )}
    </div>
  )
}
