import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

interface AlertPayload {
  agent_id: string
  alert_type: 'critical_error' | 'limit_reached' | 'degraded_performance' | 'status_change'
  severity: 'low' | 'medium' | 'high' | 'critical'
  title: string
  message: string
  metadata?: any
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const payload: AlertPayload = await req.json()
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 1. Buscar dados do agente e tenant
    const { data: agent } = await supabase
      .from('agents_v2')
      .select(`
        *,
        whatsapp_clients!inner(nome_empresa, email)
      `)
      .eq('id', payload.agent_id)
      .single()

    if (!agent) {
      throw new Error('Agente não encontrado')
    }

    // 2. Buscar admins do tenant
    const { data: users } = await supabase
      .from('tenant_users')
      .select(`
        role,
        profiles!inner(
          email
        )
      `)
      .eq('tenant_id', agent.tenant_id)
      .in('role', ['OWNER', 'ADMIN'])

    if (!users || users.length === 0) {
      console.warn('Nenhum admin encontrado para notificar')
      return new Response(
        JSON.stringify({ success: true, notified: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 3. Preparar email
    const emailSubject = `🚨 [${payload.severity.toUpperCase()}] ${payload.title}`
    const emailBody = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { 
            background: ${getSeverityColor(payload.severity)}; 
            color: white; 
            padding: 20px; 
            border-radius: 8px 8px 0 0; 
          }
          .content { 
            background: #f9f9f9; 
            padding: 20px; 
            border-radius: 0 0 8px 8px; 
          }
          .details { 
            background: white; 
            padding: 15px; 
            border-radius: 4px; 
            margin: 15px 0; 
          }
          .footer { 
            text-align: center; 
            padding: 20px; 
            color: #666; 
            font-size: 12px; 
          }
          .button { 
            display: inline-block; 
            padding: 12px 24px; 
            background: #3b82f6; 
            color: white; 
            text-decoration: none; 
            border-radius: 4px; 
            margin: 10px 0;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>${getSeverityEmoji(payload.severity)} ${payload.title}</h1>
          </div>
          <div class="content">
            <p><strong>Agente:</strong> ${agent.nome}</p>
            <p><strong>Cliente:</strong> ${agent.whatsapp_clients.nome_empresa}</p>
            <p><strong>Tipo de Alerta:</strong> ${formatAlertType(payload.alert_type)}</p>
            <p><strong>Horário:</strong> ${new Date().toLocaleString('pt-BR')}</p>
            
            <div class="details">
              <h3>Detalhes:</h3>
              <p>${payload.message}</p>
              ${payload.metadata ? `<pre>${JSON.stringify(payload.metadata, null, 2)}</pre>` : ''}
            </div>
            
            <a href="${Deno.env.get('APP_URL') || 'https://dffhhforfwhgzdlrfzpc.supabase.co'}/agents/${payload.agent_id}" class="button">
              Ver Detalhes do Agente
            </a>
            
            <h3>Ações Recomendadas:</h3>
            <ul>
              ${getRecommendedActions(payload.alert_type)}
            </ul>
          </div>
          <div class="footer">
            <p>Você está recebendo este email porque é administrador do sistema</p>
          </div>
        </div>
      </body>
      </html>
    `

    // 4. Enviar emails via Resend
    const resendApiKey = Deno.env.get('RESEND_API_KEY')
    let successCount = 0

    if (resendApiKey) {
      const emailPromises = users.map(async (user: any) => {
        try {
          const response = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${resendApiKey}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              from: 'alertas@resend.dev',
              to: user.profiles.email,
              subject: emailSubject,
              html: emailBody
            })
          })

          if (!response.ok) {
            console.error('Erro ao enviar email:', await response.text())
            return false
          }
          
          return true
        } catch (error) {
          console.error('Erro ao enviar email:', error)
          return false
        }
      })

      const results = await Promise.all(emailPromises)
      successCount = results.filter(r => r).length
    } else {
      console.warn('RESEND_API_KEY não configurada, emails não enviados')
    }

    // 5. Registrar notificação
    await supabase.from('notification_logs').insert({
      notification_type: 'email',
      recipient: users.map((u: any) => u.profiles.email).join(', '),
      subject: emailSubject,
      message: payload.message,
      status: successCount > 0 ? 'sent' : 'failed',
      metadata: {
        agent_id: payload.agent_id,
        alert_type: payload.alert_type,
        severity: payload.severity,
        notified_count: successCount
      }
    })

    return new Response(
      JSON.stringify({ success: true, notified: successCount }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error: any) {
    console.error('Erro ao enviar alerta:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})

// Helpers
function getSeverityColor(severity: string): string {
  switch (severity) {
    case 'critical': return '#dc2626'
    case 'high': return '#ea580c'
    case 'medium': return '#f59e0b'
    case 'low': return '#3b82f6'
    default: return '#6b7280'
  }
}

function getSeverityEmoji(severity: string): string {
  switch (severity) {
    case 'critical': return '🚨'
    case 'high': return '⚠️'
    case 'medium': return '⚡'
    case 'low': return 'ℹ️'
    default: return '📢'
  }
}

function formatAlertType(type: string): string {
  const types: Record<string, string> = {
    'critical_error': 'Erro Crítico',
    'limit_reached': 'Limite Atingido',
    'degraded_performance': 'Performance Degradada',
    'status_change': 'Mudança de Status'
  }
  return types[type] || type
}

function getRecommendedActions(type: string): string {
  const actions: Record<string, string> = {
    'critical_error': `
      <li>Verificar logs de erro no dashboard</li>
      <li>Revisar configuração do agente</li>
      <li>Testar integração N8N e WAHA</li>
      <li>Contatar suporte se problema persistir</li>
    `,
    'limit_reached': `
      <li>Revisar plano atual do cliente</li>
      <li>Considerar upgrade de plano</li>
      <li>Otimizar prompts para usar menos tokens</li>
      <li>Implementar cache de respostas comuns</li>
    `,
    'degraded_performance': `
      <li>Verificar latência da IA</li>
      <li>Revisar taxa de sucesso das requisições</li>
      <li>Verificar saúde do N8N</li>
      <li>Monitorar próximas 24h</li>
    `,
    'status_change': `
      <li>Verificar causa da mudança</li>
      <li>Monitorar comportamento do agente</li>
      <li>Revisar eventos recentes</li>
    `
  }
  return actions[type] || '<li>Verificar dashboard para mais detalhes</li>'
}