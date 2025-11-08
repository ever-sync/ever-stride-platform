import { useState, useEffect } from 'react';
import { wahaAPI, WAHA_STATUS, WahaStatus } from '@/lib/waha';
import { mapWahaStatusToDb } from '@/lib/waha-status-mapper';

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
      const mappedStatus = mapWahaStatusToDb(statusAtual) as WahaStatus;
      setStatus(mappedStatus);
      
      if (mappedStatus === 'qr_code') {
        const qr = await wahaAPI.obterQRCode(sessionId);
        setQrCode(qr);
      } else {
        setQrCode(null);
      }
    } catch (error) {
      console.error('Error verifying Waha status:', error);
      setStatus('stopped');
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
      setStatus('failed');
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
