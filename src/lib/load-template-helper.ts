import { supabase } from "@/integrations/supabase/client";
import templateJson from "@/assets/n8n-templates/Carros_-_EstoqueCar.json";

export async function loadCarrosTemplateToDatabase() {
  try {
    console.log('Loading Carros template with', templateJson.nodes?.length || 0, 'nodes');
    
    const { error } = await supabase.functions.invoke('load-carros-template', {
      body: { templateJson }
    });

    if (error) throw error;

    console.log('Template loaded successfully');
    return true;
  } catch (error) {
    console.error('Error loading template:', error);
    throw error;
  }
}
