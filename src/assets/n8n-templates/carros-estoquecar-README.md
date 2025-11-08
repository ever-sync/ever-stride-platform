# 🚗 Template: Vendas de Carros - EstoqueCar

## Descrição
Workflow completo para automatizar o atendimento de concessionárias de veículos, incluindo:
- Consulta automática de estoque
- Simulações de financiamento
- Qualificação de leads
- Transferência inteligente para vendedores
- Atualização automática do CRM

## Funcionalidades Principais

### 1. IA Conversacional
- Agente treinado para vendas de carros
- Entende perguntas sobre modelos, preços, disponibilidade
- Tom de voz personalizável

### 2. Consulta de Estoque
- Busca automática no banco de dados
- Retorna informações de veículos disponíveis
- Atualiza em tempo real

### 3. Simulação de Financiamento
- Calcula parcelas automaticamente
- Considera entrada, prazo e taxa de juros
- Envia proposta formatada

### 4. Transferência Inteligente
- **Para Vendedor**: Quando o lead está quente
- **Para Grupo**: Para dúvidas técnicas ou test-drive
- **Pausa IA**: Quando cliente solicita atendimento humano

### 5. Atualização de CRM
- Salva todas as interações
- Atualiza dados do lead
- Registra histórico completo

## Parâmetros Configuráveis

| Parâmetro | Descrição | Padrão |
|-----------|-----------|--------|
| `script_atendimento` | Apresentação do agente | "Olá! Sou a Amanda..." |
| `modelo_ia` | Modelo de IA | gpt-4o-mini |
| `temperatura` | Criatividade das respostas | 0.7 |
| `codigo_pausar_ia` | Código para pausar bot | PAUSAR_ATENDIMENTO |
| `codigo_transferir_vendedor` | Código de transferência | TRANSFERIR_VENDEDOR |
| `codigo_transferir_grupo` | Código para grupo | TRANSFERIR_GRUPO |
| `codigo_verificar_sistema` | Código de consulta | CONSULTAR_ESTOQUE |

## Integrações Necessárias

1. **WhatsApp (WAHA)**: Para envio e recebimento de mensagens
2. **OpenAI ou similar**: Para o agente de IA
3. **Supabase**: Para armazenamento de dados
4. **Base de Conhecimento**: Para consultas de estoque (opcional)

## Como Usar

1. Selecione o template na biblioteca
2. Escolha o agente que irá usar o workflow
3. Configure o script de atendimento
4. Defina os códigos de ação
5. Conecte suas integrações
6. Ative o workflow

## Casos de Uso

- **Concessionárias de veículos novos e seminovos**
- **Lojas de motos**
- **Vendas de frotas empresariais**
- **Marketplace de carros**

## Métricas Esperadas

- **Redução de 70-80%** no volume de atendimentos manuais
- **Aumento de 40-50%** na taxa de resposta
- **Conversão de leads** 20-30% maior
- **Disponibilidade 24/7**

## Estrutura do Workflow

O workflow é composto pelos seguintes nós principais:

1. **Webhook** - Recebe mensagens do WhatsApp
2. **AI Agent** - Processa mensagens com IA conversacional
3. **Calculator** - Realiza cálculos de financiamento
4. **Switch** - Roteia baseado em códigos de comando
5. **Supabase Nodes** - Gerencia dados de clientes e histórico
6. **WAHA Send** - Envia respostas pelo WhatsApp

## Customizações Disponíveis

### Script de Atendimento
Personalize a apresentação e tom do agente:
```
Olá! Sou a Amanda, assistente virtual da [Nome da Concessionária].
Como posso ajudar você hoje? Posso te mostrar nossos veículos disponíveis,
fazer simulações de financiamento e agendar test-drives!
```

### Códigos de Comando
Configure códigos especiais para ações:
- `PAUSAR_ATENDIMENTO` - Pausa o bot e aguarda atendimento humano
- `TRANSFERIR_VENDEDOR` - Transfere para um vendedor específico
- `TRANSFERIR_GRUPO` - Transfere para grupo de vendas
- `CONSULTAR_ESTOQUE` - Busca veículos no estoque

## Requisitos Técnicos

### Banco de Dados
O workflow requer as seguintes tabelas no Supabase:
- `chats` - Conversas
- `chat_messages` - Histórico de mensagens
- `end_users` - Dados dos clientes
- `n8n_chat_histories` - Histórico para IA

### Configurações de IA
- Modelo recomendado: `gpt-4o-mini`
- Temperatura: 0.7 (equilíbrio entre criatividade e consistência)
- Max tokens: 1500 (para respostas detalhadas)

## Suporte e Customizações

Para customizações adicionais ou suporte técnico:
- Entre em contato com a equipe de desenvolvimento
- Acesse a documentação completa do N8N
- Consulte os logs de execução no dashboard

## Versão

- **Versão atual**: 1.0
- **Última atualização**: 2025-11-08
- **Compatibilidade**: N8N v1.0+, Supabase, WAHA API

## Licença e Uso

Este template é fornecido como parte da plataforma e pode ser customizado
conforme as necessidades específicas de cada concessionária.
