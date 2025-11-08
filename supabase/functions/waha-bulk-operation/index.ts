import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const { operation, sessionId } = await req.json();

    if (!operation || !sessionId) {
      throw new Error('Missing required parameters');
    }

    const wahaApiUrl = Deno.env.get('WAHA_API_URL') || Deno.env.get('WAHA_URL');
    const wahaApiKey = Deno.env.get('WAHA_API_KEY') || Deno.env.get('WAHA_KEY');

    console.log('Bulk op WAHA env:', {
      hasUrl: !!wahaApiUrl,
      hasKey: !!wahaApiKey,
      urlSample: wahaApiUrl ? wahaApiUrl.slice(0, 30) : null,
    });

    if (!wahaApiUrl || !wahaApiKey) {
      throw new Error('WAHA configuration missing');
    }

    // Normalize URL to include protocol
    let normalizedUrl = wahaApiUrl;
    if (!normalizedUrl.startsWith('http://') && !normalizedUrl.startsWith('https://')) {
      normalizedUrl = `https://${normalizedUrl}`;
    }

    // Get session details
    const { data: session, error: sessionError } = await supabase
      .from('waha_sessions')
      .select('*')
      .eq('id', sessionId)
      .single();

    if (sessionError) throw sessionError;

    let result: any = { success: false };

    switch (operation) {
      case 'reconnect':
        // Start session via WAHA API
        const reconnectResponse = await fetch(`${normalizedUrl}/api/sessions/${session.session_name}/start`, {
          method: 'POST',
          headers: { 'X-Api-Key': wahaApiKey },
        });

        if (reconnectResponse.ok) {
          await supabase
            .from('waha_sessions')
            .update({ status: 'connecting', reconnect_attempts: 0 })
            .eq('id', sessionId);
          
          result = { success: true, message: 'Session reconnection initiated' };
        } else {
          throw new Error(`Reconnect failed: ${reconnectResponse.statusText}`);
        }
        break;

      case 'disconnect':
        // Stop session via WAHA API
        const disconnectResponse = await fetch(`${normalizedUrl}/api/sessions/${session.session_name}/stop`, {
          method: 'POST',
          headers: { 'X-Api-Key': wahaApiKey },
        });

        if (disconnectResponse.ok) {
          await supabase
            .from('waha_sessions')
            .update({ status: 'disconnected' })
            .eq('id', sessionId);
          
          result = { success: true, message: 'Session disconnected' };
        } else {
          throw new Error(`Disconnect failed: ${disconnectResponse.statusText}`);
        }
        break;

      case 'refresh_qr':
        // Get new QR code
        const qrResponse = await fetch(`${normalizedUrl}/api/sessions/${session.session_name}/qr`, {
          headers: { 'X-Api-Key': wahaApiKey },
        });

        if (qrResponse.ok) {
          const qrData = await qrResponse.json();
          const expiresAt = new Date(Date.now() + 60000).toISOString();
          
          await supabase
            .from('waha_sessions')
            .update({ qr_code: qrData.qr, qr_expires_at: expiresAt })
            .eq('id', sessionId);
          
          result = { success: true, message: 'QR code refreshed' };
        } else {
          throw new Error(`QR refresh failed: ${qrResponse.statusText}`);
        }
        break;

      default:
        throw new Error(`Unknown operation: ${operation}`);
    }

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error in bulk operation:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
