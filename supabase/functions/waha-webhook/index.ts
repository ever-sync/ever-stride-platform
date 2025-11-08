import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface WahaWebhookPayload {
  event: string;
  session: string;
  payload: {
    status?: string;
    from?: string;
    body?: string;
    id?: string;
    timestamp?: number;
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase credentials not configured');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const payload: WahaWebhookPayload = await req.json();

    console.log('WAHA Webhook recebido:', payload.event, 'session:', payload.session);

    // 1. Atualizar status da sessão
    if (payload.event === 'session.status') {
      const updateData: any = {
        status: payload.payload.status || 'disconnected',
        last_activity: new Date().toISOString(),
      };

      if (payload.payload.status === 'connected') {
        updateData.connected_at = new Date().toISOString();
        updateData.phone_number = payload.payload.from;
      }

      const { error } = await supabase
        .from('waha_sessions')
        .update(updateData)
        .eq('session_name', payload.session);

      if (error) {
        console.error('Erro ao atualizar status:', error);
      }
    }

    // 2. Processar mensagem recebida
    if (payload.event === 'message' && payload.payload.body) {
      // Buscar sessão e agente
      const { data: session, error: sessionError } = await supabase
        .from('waha_sessions')
        .select(`
          *,
          agents(*)
        `)
        .eq('session_name', payload.session)
        .maybeSingle();

      if (sessionError) {
        console.error('Erro ao buscar sessão:', sessionError);
        return new Response(JSON.stringify({ received: true, error: 'Session not found' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      if (!session) {
        console.log('Sessão não encontrada:', payload.session);
        return new Response(JSON.stringify({ received: true, processed: false }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Atualizar estatísticas da sessão
      await supabase
        .from('waha_sessions')
        .update({
          total_messages_received: (session.total_messages_received || 0) + 1,
          last_message_at: new Date().toISOString(),
          last_activity: new Date().toISOString()
        })
        .eq('id', session.id);

      // Buscar ou criar end_user
      const { data: endUser } = await supabase
        .from('end_users')
        .select('id')
        .eq('tenant_id', session.tenant_id)
        .eq('telefone', payload.payload.from)
        .maybeSingle();

      let endUserId = endUser?.id;

      if (!endUserId) {
        const { data: newEndUser } = await supabase
          .from('end_users')
          .insert({
            tenant_id: session.tenant_id,
            telefone: payload.payload.from,
            nome: payload.payload.from
          })
          .select('id')
          .single();
        
        endUserId = newEndUser?.id;
      }

      // Criar ou buscar chat (vinculado à sessão)
      let { data: chat } = await supabase
        .from('chats')
        .select('id')
        .eq('tenant_id', session.tenant_id)
        .eq('phone', payload.payload.from)
        .eq('session_id', session.id)
        .maybeSingle();

      if (!chat) {
        const { data: newChat } = await supabase
          .from('chats')
          .insert({
            tenant_id: session.tenant_id,
            end_user_id: endUserId,
            phone: payload.payload.from,
            session_id: session.id,
            updated_at: new Date().toISOString()
          })
          .select('id')
          .single();
        
        chat = newChat;
      }

      // Salvar mensagem
      if (chat) {
        await supabase
          .from('chat_messages')
          .insert({
            chat_id: chat.id,
            phone: payload.payload.from,
            user_message: payload.payload.body,
            message_type: 'received',
            active: true
          });
      }

      console.log('Mensagem processada de:', payload.payload.from);
      
      // TODO: Enviar para N8N workflow se configurado
      // TODO: Processar com IA e responder
    }

    return new Response(
      JSON.stringify({ received: true, processed: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Erro no webhook WAHA:', error);
    return new Response(
      JSON.stringify({ 
        received: true, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
