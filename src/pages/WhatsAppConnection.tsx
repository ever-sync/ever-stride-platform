import { useState } from 'react'
import { QRCodeConnect } from '@/components/whatsapp/QRCodeConnect'
import { useClients } from '@/hooks/useClients'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function WhatsAppConnection() {
  const { clients } = useClients()
  const [selectedClientId, setSelectedClientId] = useState<string>('')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Conexão WhatsApp</h1>
        <p className="text-muted-foreground">Conecte o WhatsApp dos seus clientes</p>
      </div>

      {/* Seletor de Cliente */}
      <Card>
        <CardHeader>
          <CardTitle>Selecionar Cliente</CardTitle>
          <CardDescription>
            Escolha qual cliente deseja conectar ao WhatsApp
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

      {/* QR Code Component */}
      {selectedClientId && (
        <QRCodeConnect clientId={selectedClientId} />
      )}
    </div>
  )
}
