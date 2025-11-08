# Template: Atendimento Humanizado 🤝

## Descrição
Template completo de atendimento humanizado com IA, transferências inteligentes para vendedores/grupos, pausar IA e avaliação de atendimento. Ideal para empresas que buscam um atendimento personalizado com múltiplos fluxos.

## Características
- 🤖 **IA Conversacional**: Agente IA com personalidade configurável
- 👥 **Transferência Inteligente**: Transferir para vendedores ou grupos específicos
- ⏸️ **Pausar IA**: Permite pausar o atendimento automático quando necessário
- ⭐ **Avaliação**: Sistema de avaliação de atendimento
- 📝 **Resumo de Lead**: Mantém contexto do histórico de conversas
- 🔄 **Fluxos Múltiplos**: Switch nodes para diferentes cenários de atendimento

## Configurações Necessárias

### Códigos de Atendimento
- **Pausar IA**: `PAUSAR_ATENDIMENTO` (código que finaliza o atendimento automático)
- **Transferir Vendedor**: `TRANSFERIR_VENDEDOR` (transfere para atendimento humano individual)
- **Transferir Grupo**: `TRANSFERIR_GRUPO` (transfere para grupo de atendimento)
- **Avaliação**: `AVALIACAO` (inicia processo de avaliação do atendimento)

### Campos Personalizáveis
1. **Script de Atendimento**: Define o comportamento e instruções da IA
2. **Saudação Inicial**: Primeira mensagem enviada ao cliente
3. **Nome do Agente**: Nome pelo qual a IA se apresenta
4. **Códigos de Controle**: Palavras-chave para acionar diferentes fluxos

## Nodes Principais

### 1. AI Agent
Node principal que processa as mensagens e gera respostas personalizadas baseadas no script de atendimento.

### 2. Switch Nodes
Direcionam o fluxo baseado em palavras-chave:
- Atendimento Finalizado (Pausar IA)
- Simulação (Verificar Sistema)
- Transferir Vendedor
- Transferir Grupo

### 3. Supabase Nodes
- **Get a row (Config-IA)**: Busca configurações do agente usando `workflow_id`
- **Update chats**: Atualiza status do chat (bot pausado, transferido)
- **Insert/Update**: Salva resumo do lead e histórico

### 4. WAHA Nodes
- **Enviar mensagem**: Envia respostas ao cliente via WhatsApp
- **Adicionar membro ao grupo**: Para transferências de grupo

## Integrações Necessárias
- ✅ Supabase (banco de dados)
- ✅ WAHA (WhatsApp API)
- ✅ OpenAI / Anthropic (IA conversacional)

## Dificuldade
🔴 **Avançado** - Requer configuração de múltiplas integrações e personalização de códigos

## Como Usar

### 1. Criar Workflow a partir do Template
```typescript
// Na interface do N8N Monitoring
1. Selecione "Atendimento Humanizado"
2. Configure o agente desejado
3. Personalize os códigos de atendimento
4. Defina o script e saudação
5. Crie o workflow
```

### 2. Configurar Tabela de Agentes
Certifique-se que a tabela `agents` tem os campos:
- `workflow_id` (VARCHAR) - preenchido automaticamente após criação
- `nome_agente` (TEXT)
- `script_atendimento` (TEXT)
- `saudacao_inicial` (TEXT)

### 3. Vincular ao WhatsApp
O workflow recebe webhooks do WAHA quando:
- Cliente envia mensagem
- É necessário consultar o sistema
- Transferência é solicitada

### 4. Testar Fluxos
Envie mensagens de teste incluindo os códigos:
- "PAUSAR_ATENDIMENTO" → Deve pausar o bot
- "TRANSFERIR_VENDEDOR" → Deve marcar chat para transferência
- "TRANSFERIR_GRUPO" → Deve adicionar cliente ao grupo

## Campos Dinâmicos

O template usa referências dinâmicas que buscam dados do banco:

```javascript
// Busca configurações do agente
$('Config-IA').item.json.nome_agente
$('Config-IA').item.json.Script
$('Config-IA').item.json.Saudacao
$('Config-IA').item.json['Transferir Grupo']
$('Config-IA').item.json['Transferir Vendedor']
$('Config-IA').item.json.PausarIA
$('Config-IA').item.json['Avaliação']
```

Estes campos são preenchidos automaticamente pelo node Supabase GET que usa `workflow_id` como filtro.

## Exemplo de Script de Atendimento

```
Você é um assistente de atendimento humanizado. Seu objetivo é:

1. Receber o cliente de forma cordial
2. Entender suas necessidades
3. Oferecer soluções adequadas
4. Se necessário, transferir para atendimento humano

Regras:
- Seja educado e empático
- Use linguagem natural
- Não invente informações
- Se não souber, use: TRANSFERIR_VENDEDOR
- Para finalizar, use: PAUSAR_ATENDIMENTO
```

## Troubleshooting

### ❌ Workflow não encontra configurações do agente
**Solução**: Verifique se `agents.workflow_id` foi preenchido corretamente após a criação do workflow.

### ❌ Códigos de atendimento não funcionam
**Solução**: Verifique se os códigos no switch node correspondem aos configurados no agente.

### ❌ Transferência não funciona
**Solução**: Certifique-se que o cliente e os dados de grupo estão corretos na tabela `chats`.

## Métricas de Sucesso

Para acompanhar o desempenho do template:
- Taxa de resolução automática (sem transferência)
- Tempo médio de atendimento
- Taxa de transferência para humanos
- Avaliações recebidas

## Personalizações Avançadas

### Adicionar Novo Código de Atendimento
1. Edite o workflow no N8N
2. Adicione novo case no Switch node
3. Configure node de ação correspondente
4. Atualize o script da IA para incluir o novo código

### Integrar com CRM
1. Adicione node HTTP Request
2. Configure webhook do CRM
3. Mapeie dados do cliente
4. Envie após transferência ou finalização

### Adicionar Knowledge Base
1. Adicione node de busca vetorial
2. Conecte antes do AI Agent
3. Injete contexto no prompt da IA

## Support

Para dúvidas sobre este template:
- 📧 Suporte técnico via sistema
- 📚 Documentação N8N: https://docs.n8n.io
- 💬 Comunidade: Discord do projeto
