import { useState } from 'react'
import { useClients } from '@/hooks/useClients'
import { wahaClient } from '@/lib/waha-client'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Loader2, Check, X, AlertCircle } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

type TestStep = {
  name: string
  status: 'pending' | 'running' | 'success' | 'error'
  message?: string
}

export default function WhatsAppTest() {
  const { clients } = useClients()
  const { toast } = useToast()
  const [selectedClientId, setSelectedClientId] = useState<string>('')
  const [sessionName, setSessionName] = useState('')
  const [qrCode, setQrCode] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [testMessage, setTestMessage] = useState('Teste de conexão WhatsApp!')
  
  const [steps, setSteps] = useState<TestStep[]>([
    { name: '1. Criar Sessão', status: 'pending' },
    { name: '2. Obter QR Code', status: 'pending' },
    { name: '3. Verificar Status', status: 'pending' },
    { name: '4. Enviar Mensagem', status: 'pending' },
  ])

  const updateStep = (index: number, status: TestStep['status'], message?: string) => {
    setSteps(prev => prev.map((step, i) => 
      i === index ? { ...step, status, message } : step
    ))
  }

  const runFullTest = async () => {
    if (!selectedClientId) {
      toast({
        title: 'Erro',
        description: 'Selecione um cliente',
        variant: 'destructive'
      })
      return
    }

    // Reset
    setSteps(prev => prev.map(s => ({ ...s, status: 'pending', message: undefined })))
    setQrCode('')
    setSessionName('')

    try {
      // Step 1: Criar sessão
      updateStep(0, 'running')
      const webhookUrl = `${window.location.origin}/webhook/whatsapp`
      const sessionData = await wahaClient.createSession({
        clientId: selectedClientId,
        webhookUrl
      })
      setSessionName(sessionData.session_name)
      updateStep(0, 'success', `Sessão: ${sessionData.session_name}`)

      // Step 2: Obter QR Code
      updateStep(1, 'running')
      await new Promise(resolve => setTimeout(resolve, 2000)) // Aguarda 2s
      const qr = await wahaClient.getQRCode(sessionData.session_name)
      if (qr) {
        setQrCode(qr)
        updateStep(1, 'success', 'QR Code obtido')
      } else {
        updateStep(1, 'error', 'QR Code não disponível')
      }

      // Step 3: Verificar status
      updateStep(2, 'running')
      await new Promise(resolve => setTimeout(resolve, 1000))
      const status = await wahaClient.getSessionStatus(sessionData.session_name)
      updateStep(2, 'success', `Status: ${status}`)

      toast({
        title: 'Teste parcial concluído',
        description: 'Escaneie o QR Code para continuar',
      })

    } catch (error) {
      const currentStep = steps.findIndex(s => s.status === 'running')
      if (currentStep >= 0) {
        updateStep(currentStep, 'error', error instanceof Error ? error.message : 'Erro desconhecido')
      }
      toast({
        title: 'Erro no teste',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive'
      })
    }
  }

  const testSendMessage = async () => {
    if (!sessionName || !phoneNumber) {
      toast({
        title: 'Erro',
        description: 'Sessão e telefone são obrigatórios',
        variant: 'destructive'
      })
      return
    }

    try {
      updateStep(3, 'running')
      await wahaClient.sendMessage(sessionName, phoneNumber, testMessage)
      updateStep(3, 'success', 'Mensagem enviada com sucesso')
      toast({
        title: 'Sucesso',
        description: 'Mensagem enviada!',
      })
    } catch (error) {
      updateStep(3, 'error', error instanceof Error ? error.message : 'Erro ao enviar')
      toast({
        title: 'Erro',
        description: error instanceof Error ? error.message : 'Erro ao enviar mensagem',
        variant: 'destructive'
      })
    }
  }

  const getStepIcon = (status: TestStep['status']) => {
    switch (status) {
      case 'running':
        return <Loader2 className="h-4 w-4 animate-spin" />
      case 'success':
        return <Check className="h-4 w-4 text-green-600" />
      case 'error':
        return <X className="h-4 w-4 text-red-600" />
      default:
        return <AlertCircle className="h-4 w-4 text-muted-foreground" />
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Teste Completo WhatsApp</h1>
        <p className="text-muted-foreground">Teste todas as etapas da integração WAHA</p>
      </div>

      {/* Seletor de Cliente */}
      <Card>
        <CardHeader>
          <CardTitle>Configuração</CardTitle>
          <CardDescription>Selecione o cliente para teste</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
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

          <Button onClick={runFullTest} disabled={!selectedClientId}>
            Iniciar Teste Completo
          </Button>
        </CardContent>
      </Card>

      {/* Status dos Steps */}
      <Card>
        <CardHeader>
          <CardTitle>Progresso do Teste</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {steps.map((step, index) => (
              <div key={index} className="flex items-start gap-3 p-3 border rounded-lg">
                <div className="mt-0.5">{getStepIcon(step.status)}</div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{step.name}</span>
                    <Badge variant={
                      step.status === 'success' ? 'default' :
                      step.status === 'error' ? 'destructive' :
                      step.status === 'running' ? 'secondary' : 'outline'
                    }>
                      {step.status}
                    </Badge>
                  </div>
                  {step.message && (
                    <p className="text-sm text-muted-foreground mt-1">{step.message}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* QR Code */}
      {qrCode && (
        <Card>
          <CardHeader>
            <CardTitle>QR Code</CardTitle>
            <CardDescription>Escaneie com seu WhatsApp</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex justify-center p-4 bg-white rounded-lg">
              <img src={qrCode} alt="QR Code" className="max-w-xs" />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Enviar Mensagem */}
      {sessionName && (
        <Card>
          <CardHeader>
            <CardTitle>Enviar Mensagem de Teste</CardTitle>
            <CardDescription>Teste o envio de mensagens</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Número do WhatsApp (com DDI)</Label>
              <Input
                placeholder="5511999999999"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
              />
            </div>

            <div>
              <Label>Mensagem</Label>
              <Input
                value={testMessage}
                onChange={(e) => setTestMessage(e.target.value)}
              />
            </div>

            <Button onClick={testSendMessage}>
              Enviar Mensagem de Teste
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
