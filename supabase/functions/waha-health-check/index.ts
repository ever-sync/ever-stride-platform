import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
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
    return await trackExecution('waha-health-check', async () => {
      const wahaApiUrl = Deno.env.get('WAHA_API_URL')
      const wahaApiKey = Deno.env.get('WAHA_API_KEY')

      if (!wahaApiUrl || !wahaApiKey) {
        return new Response(
          JSON.stringify({ 
            online: false, 
            error: 'WAHA configuration missing' 
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Normalizar URL
      const normalizedUrl = wahaApiUrl.startsWith('http') ? wahaApiUrl : `https://${wahaApiUrl}`

      try {
        // Tentar obter informações do servidor
        const response = await fetchWithRetry(`${normalizedUrl}/api/server/about`, {
          method: 'GET',
          headers: {
            'X-Api-Key': wahaApiKey,
            'Content-Type': 'application/json',
          },
        }, 1) // Apenas 1 tentativa para health check

        if (!response.ok) {
          return new Response(
            JSON.stringify({ 
              online: false,
              error: `HTTP ${response.status}`
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        const serverInfo = await response.json()

        // Buscar número de sessões
        const sessionsResponse = await fetchWithRetry(`${normalizedUrl}/api/sessions`, {
          method: 'GET',
          headers: {
            'X-Api-Key': wahaApiKey,
            'Content-Type': 'application/json',
          },
        }, 1)

        let sessionCount = 0
        if (sessionsResponse.ok) {
          const sessions = await sessionsResponse.json()
          sessionCount = sessions.length
        }

        return new Response(
          JSON.stringify({
            online: true,
            version: serverInfo.version || 'unknown',
            sessions: sessionCount,
            url: normalizedUrl,
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      } catch (error: any) {
        return new Response(
          JSON.stringify({ 
            online: false,
            error: error.message 
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    })
  } catch (error: any) {
    console.error('Health check error:', error)
    return new Response(
      JSON.stringify({ online: false, error: error.message }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})