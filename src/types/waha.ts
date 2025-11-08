export interface WahaSession {
  id: string;
  tenant_id: number;
  client_id: string;
  agent_id?: string;
  session_name: string;
  phone_number?: string;
  status: string;
  qr_code?: string;
  qr_expires_at?: string;
  total_messages_sent: number;
  total_messages_received: number;
  last_message_at?: string;
  connected_at?: string;
  disconnected_at?: string;
  last_activity?: string;
  reconnect_attempts: number;
  webhook_url?: string;
  last_error?: string;
  last_error_at?: string;
  avg_response_time_ms?: number;
  success_rate?: number;
  failed_messages?: number;
  created_at: string;
  updated_at: string;
}

export type WahaStatus = 
  | 'disconnected'
  | 'connecting'
  | 'qr_code'
  | 'connected'
  | 'failed'
  | 'stopped';

export interface WahaWebhookPayload {
  event: string;
  session: string;
  payload: {
    status?: string;
    from?: string;
    to?: string;
    body?: string;
    id?: string;
    timestamp?: number;
    type?: string;
  };
}
