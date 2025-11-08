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
    const wahaApiUrl = Deno.env.get('WAHA_API_URL')
    const wahaApiKey = Deno.env.get('WAHA_API_KEY')

    console.log('Health check starting:', {
      hasUrl: !!wahaApiUrl,
      hasKey: !!wahaApiKey,
      url: wahaApiUrl
    })

    if (!wahaApiUrl || !wahaApiKey) {
      return new Response(
        JSON.stringify({ 
          online: false, 
          error: 'WAHA configuration missing',
          details: {
            hasUrl: !!wahaApiUrl,
            hasKey: !!wahaApiKey
          }
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const normalizedUrl = wahaApiUrl.startsWith('http') ? wahaApiUrl : `https://${wahaApiUrl}`
    console.log('Normalized URL:', normalizedUrl)

    try {
      const response = await trackExecution('waha-health-check', () =>
        fetchWithRetry(`${normalizedUrl}/api/sessions`, {
          method: 'GET',
          headers: {
            'X-Api-Key': wahaApiKey,
            'Content-Type': 'application/json',
          },
        }, 1)
      )

      console.log('WAHA response:', {
        status: response.status,
        ok: response.ok
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error('WAHA error response:', errorText)
        
        return new Response(
          JSON.stringify({ 
            online: false,
            error: `HTTP ${response.status}`,
            details: errorText,
            url: normalizedUrl
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const sessions = await response.json()
      console.log('WAHA sessions:', sessions.length)
      
      return new Response(
        JSON.stringify({
          online: true,
          sessions: sessions.length,
          url: normalizedUrl,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    } catch (error: any) {
      console.error('Health check error:', error)
      return new Response(
        JSON.stringify({ 
          online: false,
          error: error.message,
          url: normalizedUrl
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
  } catch (error: any) {
    console.error('Health check outer error:', error)
    return new Response(
      JSON.stringify({ online: false, error: error.message }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})