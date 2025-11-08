import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
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
    const { templateJson } = await req.json();
    
    if (!templateJson) {
      throw new Error('templateJson is required');
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('Updating template with', templateJson.nodes?.length || 0, 'nodes');

    // Update the template in the database
    const { data, error } = await supabase
      .from('n8n_workflow_templates')
      .update({ 
        template_json: templateJson, 
        updated_at: new Date().toISOString() 
      })
      .eq('name', 'Vendas de Carros - EstoqueCar')
      .select()
      .single();

    if (error) throw error;

    console.log('Template updated successfully:', data.name);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Template loaded successfully',
        nodes_count: templateJson.nodes?.length || 0,
        template_id: data.id
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in load-carros-template:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});