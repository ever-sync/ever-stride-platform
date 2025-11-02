const WAHA_URL = import.meta.env.VITE_WAHA_URL || 'http://localhost:3000';
const WAHA_API_KEY = import.meta.env.VITE_WAHA_API_KEY || '';

export const WAHA_STATUS = {
  STOPPED: 'STOPPED',
  STARTING: 'STARTING',
  SCAN_QR_CODE: 'SCAN_QR_CODE',
  WORKING: 'WORKING',
  FAILED: 'FAILED',
} as const;

export type WahaStatus = typeof WAHA_STATUS[keyof typeof WAHA_STATUS];

async function wahaRequest(endpoint: string, options: RequestInit = {}) {
  const response = await fetch(`${WAHA_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'X-Api-Key': WAHA_API_KEY,
      ...options.headers,
    },
  });
  
  if (!response.ok) {
    throw new Error(`Waha API error: ${response.statusText}`);
  }
  
  return response.json();
}

export const wahaAPI = {
  async criarSessao(clienteId: string, webhookUrl: string) {
    return wahaRequest('/api/sessions', {
      method: 'POST',
      body: JSON.stringify({
        name: clienteId,
        config: {
          webhooks: [{
            url: webhookUrl,
            events: ['message', 'message.any']
          }]
        }
      })
    });
  },
  
  async verificarStatus(sessionId: string): Promise<WahaStatus> {
    try {
      const data = await wahaRequest(`/api/sessions/${sessionId}`);
      return data.status || 'STOPPED';
    } catch (error) {
      console.error('Error verifying Waha status:', error);
      return 'STOPPED';
    }
  },
  
  async obterQRCode(sessionId: string): Promise<string> {
    const data = await wahaRequest(`/api/sessions/${sessionId}/qr`);
    return data.qr;
  },
  
  async iniciarSessao(sessionId: string) {
    return wahaRequest(`/api/sessions/${sessionId}/start`, {
      method: 'POST'
    });
  },
  
  async pararSessao(sessionId: string) {
    return wahaRequest(`/api/sessions/${sessionId}/stop`, {
      method: 'POST'
    });
  },
  
  async deletarSessao(sessionId: string) {
    return wahaRequest(`/api/sessions/${sessionId}`, {
      method: 'DELETE'
    });
  }
};
