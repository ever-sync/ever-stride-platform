import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { fetchWithRetry } from '../_shared/retry.ts'
import { trackExecution } from '../_shared/metrics.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    return await trackExecution('waha-sync-sessions', async () => {
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      )

      const wahaApiUrl = Deno.env.get('WAHA_API_URL')
      const wahaApiKey = Deno.env.get('WAHA_API_KEY')

      if (!wahaApiUrl || !wahaApiKey) {
        return new Response(
          JSON.stringify({ error: 'WAHA configuration missing' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Normalizar URL
      const normalizedUrl = wahaApiUrl.startsWith('http') ? wahaApiUrl : `https://${wahaApiUrl}`

      // Buscar todas as sessões do WAHA
      console.log(`Fetching sessions from ${normalizedUrl}/api/sessions`)
      const response = await fetchWithRetry(`${normalizedUrl}/api/sessions`, {
        method: 'GET',
        headers: {
          'X-Api-Key': wahaApiKey,
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error(`WAHA API error: ${response.status} ${response.statusText}`)
      }

      const wahaSessions = await response.json()
      console.log(`Found ${wahaSessions.length} sessions in WAHA`)

      let imported = 0
      let updated = 0
      let errors = 0

      for (const wahaSession of wahaSessions) {
        try {
          const sessionName = wahaSession.name

          // Verificar se já existe no banco
          const { data: existing } = await supabase
            .from('waha_sessions')
            .select('id, status')
            .eq('session_name', sessionName)
            .maybeSingle()

          if (existing) {
            // Atualizar status se mudou
            if (existing.status !== wahaSession.status) {
              await supabase
                .from('waha_sessions')
                .update({
                  status: wahaSession.status,
                  updated_at: new Date().toISOString(),
                })
                .eq('id', existing.id)
              updated++
            }
          } else {
            // Tentar encontrar o client_id pelo nome da sessão (formato: client_{clientId})
            // Se não encontrar, pular esta sessão
            console.log(`Session ${sessionName} not found in database - skipping`)
            continue
          }
        } catch (error) {
          console.error(`Error processing session ${wahaSession.name}:`, error)
          errors++
        }
      }

      return new Response(
        JSON.stringify({
          success: true,
          imported,
          updated,
          errors,
          total: wahaSessions.length,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    })
  } catch (error: any) {
    console.error('Error syncing sessions:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})