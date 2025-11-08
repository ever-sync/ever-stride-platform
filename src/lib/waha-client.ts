import { supabase } from "@/integrations/supabase/client";

interface CreateSessionParams {
  clientId: string;
  webhookUrl: string;
}

interface SessionResponse {
  session_name: string;
  status: string;
  qr?: string;
}

export class WAHAClient {
  async createSession(params: CreateSessionParams): Promise<SessionResponse> {
    const { data, error } = await supabase.functions.invoke('waha-session-create', {
      body: {
        clientId: params.clientId,
        webhookUrl: params.webhookUrl
      }
    });

    if (error) throw error;
    return data;
  }

  async getQRCode(sessionName: string): Promise<string | null> {
    const { data, error } = await supabase.functions.invoke('waha-session-qr', {
      body: { sessionName }
    });

    if (error) throw error;
    return data.qr;
  }

  async getSessionStatus(sessionName: string): Promise<string> {
    const { data, error } = await supabase.functions.invoke('waha-session-status', {
      body: { sessionName }
    });

    if (error) throw error;
    return data.status;
  }

  async sendMessage(sessionName: string, chatId: string, text: string): Promise<void> {
    const { error } = await supabase.functions.invoke('waha-send-message', {
      body: {
        sessionName,
        chatId,
        text
      }
    });

    if (error) throw error;
  }

  async stopSession(sessionName: string): Promise<void> {
    const { error } = await supabase.functions.invoke('waha-session-stop', {
      body: { sessionName }
    });

    if (error) throw error;
  }
}

export const wahaClient = new WAHAClient();
