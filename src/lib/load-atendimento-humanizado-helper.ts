import { supabase } from "@/integrations/supabase/client";
import templateJson from "@/assets/n8n-templates/Atendimento_Humanizado.json";

export async function loadAtendimentoHumanizadoTemplateToDatabase() {
  try {
    console.log('Loading Atendimento Humanizado template with', templateJson.nodes?.length || 0, 'nodes');
    
    const { error } = await supabase.functions.invoke('load-atendimento-humanizado-template', {
      body: { templateJson }
    });

    if (error) throw error;

    console.log('Atendimento Humanizado template loaded successfully');
    return true;
  } catch (error) {
    console.error('Error loading Atendimento Humanizado template:', error);
    throw error;
  }
}
