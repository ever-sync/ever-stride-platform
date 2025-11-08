import { useState } from 'react'
import { useAgents } from '@/hooks/useAgents'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Send, Bot, User, Loader2, DollarSign, Zap } from 'lucide-react'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/hooks/use-toast'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'

interface Message {
  role: 'user' | 'assistant'
  content: string
  tokens?: number
  cost?: number
  model?: string
  timestamp: Date
}

export default function TestAgentChat() {
  const { agentes: agents } = useAgents()
  const { toast } = useToast()
  const [selectedAgentId, setSelectedAgentId] = useState<string>('')
  const [message, setMessage] = useState('')
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const handleSendMessage = async () => {
    if (!selectedAgentId || !message.trim()) {
      toast({
        title: 'Erro',
        description: 'Selecione um agente e digite uma mensagem',
        variant: 'destructive'
      })
      return
    }

    const userMessage: Message = {
      role: 'user',
      content: message,
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setMessage('')
    setIsLoading(true)

    try {
      const { data, error } = await supabase.functions.invoke('ai-chat', {
        body: {
          agent_id: selectedAgentId,
          message: message,
          test_mode: true
        }
      })

      if (error) throw error

      if (data.success) {
        const assistantMessage: Message = {
          role: 'assistant',
          content: data.response,
          tokens: data.tokens_used,
          cost: data.custo_brl,
          model: data.modelo,
          timestamp: new Date()
        }
        setMessages(prev => [...prev, assistantMessage])
        
        toast({
          title: 'Resposta recebida',
          description: `${data.tokens_used} tokens • R$ ${data.custo_brl.toFixed(4)}`
        })
      }
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error)
      toast({
        title: 'Erro',
        description: error instanceof Error ? error.message : 'Erro ao processar mensagem',
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const selectedAgent = agents.find(a => a.id === selectedAgentId)

  const totalTokens = messages.reduce((sum, msg) => sum + (msg.tokens || 0), 0)
  const totalCost = messages.reduce((sum, msg) => sum + (msg.cost || 0), 0)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Teste de Chat com Agente</h1>
        <p className="text-muted-foreground">
          Converse com seus agentes de IA e veja as respostas em tempo real
        </p>
      </div>

      {/* Seleção de Agente */}
      <Card>
        <CardHeader>
          <CardTitle>Selecionar Agente</CardTitle>
          <CardDescription>
            Escolha qual agente deseja testar
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Select value={selectedAgentId} onValueChange={setSelectedAgentId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione um agente" />
              </SelectTrigger>
              <SelectContent>
                {agents.map((agent) => (
                  <SelectItem key={agent.id} value={agent.id}>
                    {agent.nome_agente} - {agent.modelo_ia}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {selectedAgent && (
              <Card>
                <CardContent className="pt-6">
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Modelo:</span>
                      <Badge variant="outline">{selectedAgent.modelo_ia}</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Temperatura:</span>
                      <span>{selectedAgent.temperatura}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Max Tokens:</span>
                      <span>{selectedAgent.max_tokens}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Estatísticas */}
      {messages.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-primary" />
                <div>
                  <p className="text-sm text-muted-foreground">Total de Tokens</p>
                  <p className="text-2xl font-bold">{totalTokens.toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-primary" />
                <div>
                  <p className="text-sm text-muted-foreground">Custo Total</p>
                  <p className="text-2xl font-bold">R$ {totalCost.toFixed(4)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Chat */}
      <Card>
        <CardHeader>
          <CardTitle>Conversa</CardTitle>
          <CardDescription>
            Modo de teste - não será salvo no banco de dados
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <ScrollArea className="h-[400px] pr-4">
              {messages.length === 0 ? (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  <p>Nenhuma mensagem ainda. Comece a conversa!</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {messages.map((msg, idx) => (
                    <div key={idx} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`flex gap-3 max-w-[80%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                        <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                          msg.role === 'user' ? 'bg-primary' : 'bg-secondary'
                        }`}>
                          {msg.role === 'user' ? (
                            <User className="h-4 w-4" />
                          ) : (
                            <Bot className="h-4 w-4" />
                          )}
                        </div>
                        <div className="space-y-2">
                          <Card className={msg.role === 'user' ? 'bg-primary text-primary-foreground' : ''}>
                            <CardContent className="p-3">
                              <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                            </CardContent>
                          </Card>
                          {msg.role === 'assistant' && msg.tokens && (
                            <div className="flex gap-2 text-xs text-muted-foreground px-1">
                              <span>{msg.tokens} tokens</span>
                              <Separator orientation="vertical" className="h-4" />
                              <span>R$ {msg.cost?.toFixed(4)}</span>
                              <Separator orientation="vertical" className="h-4" />
                              <span>{msg.model}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>

            <div className="flex gap-2">
              <Textarea
                placeholder="Digite sua mensagem..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    handleSendMessage()
                  }
                }}
                className="min-h-[60px]"
                disabled={isLoading || !selectedAgentId}
              />
              <Button
                onClick={handleSendMessage}
                disabled={isLoading || !selectedAgentId || !message.trim()}
                size="icon"
                className="h-[60px] w-[60px]"
              >
                {isLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Send className="h-5 w-5" />
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
