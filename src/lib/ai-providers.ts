import { supabase } from "@/integrations/supabase/client";

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface ChatOptions {
  model: string;
  temperature?: number;
  max_tokens?: number;
}

interface ChatResponse {
  content: string;
  tokens_input: number;
  tokens_output: number;
  tokens_total: number;
  custo_usd: number;
  custo_brl: number;
  modelo: string;
  latencia_ms: number;
  provider: 'openai' | 'anthropic';
}

export class AIProvider {
  async chat(messages: ChatMessage[], options: ChatOptions): Promise<ChatResponse> {
    const { data, error } = await supabase.functions.invoke('ai-chat', {
      body: { messages, options }
    });

    if (error) throw error;
    return data;
  }
}

export const aiProvider = new AIProvider();
