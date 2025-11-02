import { useState, useEffect } from 'react';
import { wahaAPI, WAHA_STATUS, WahaStatus } from '@/lib/waha';

export function useWaha(sessionId: string | null) {
  const [status, setStatus] = useState<WahaStatus>('STOPPED');
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const verificarStatus = async () => {
    if (!sessionId) {
      setLoading(false);
      return;
    }

    try {
      const statusAtual = await wahaAPI.verificarStatus(sessionId);
      setStatus(statusAtual);
      
      if (statusAtual === WAHA_STATUS.SCAN_QR_CODE) {
        const qr = await wahaAPI.obterQRCode(sessionId);
        setQrCode(qr);
      } else {
        setQrCode(null);
      }
    } catch (error) {
      console.error('Error verifying Waha status:', error);
      setStatus('STOPPED');
    } finally {
      setLoading(false);
    }
  };

  const iniciarSessao = async () => {
    if (!sessionId) return;

    try {
      await wahaAPI.iniciarSessao(sessionId);
      await verificarStatus();
    } catch (error) {
      console.error('Error starting Waha session:', error);
      setStatus('FAILED');
    }
  };

  const pararSessao = async () => {
    if (!sessionId) return;

    try {
      await wahaAPI.pararSessao(sessionId);
      await verificarStatus();
    } catch (error) {
      console.error('Error stopping Waha session:', error);
    }
  };

  useEffect(() => {
    if (!sessionId) {
      setLoading(false);
      return;
    }
    
    verificarStatus();
    
    // Auto-refresh status every 5 seconds
    const interval = setInterval(verificarStatus, 5000);
    
    return () => clearInterval(interval);
  }, [sessionId]);

  return {
    status,
    qrCode,
    loading,
    verificarStatus,
    iniciarSessao,
    pararSessao,
  };
}
