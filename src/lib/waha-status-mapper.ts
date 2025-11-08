// Mapping between WAHA API statuses (uppercase) and our database statuses (lowercase)
const WAHA_TO_DB_STATUS_MAP: Record<string, string> = {
  'STARTING': 'connecting',
  'SCAN_QR_CODE': 'qr_code',
  'WORKING': 'connected',
  'STOPPED': 'stopped',
  'FAILED': 'failed',
  // Already lowercase - passthrough
  'disconnected': 'disconnected',
  'connecting': 'connecting',
  'qr_code': 'qr_code',
  'connected': 'connected',
  'stopped': 'stopped',
  'failed': 'failed',
  'working': 'connected', // Map 'working' to 'connected' for consistency
};

const DB_TO_WAHA_STATUS_MAP: Record<string, string> = {
  'disconnected': 'STOPPED',
  'connecting': 'STARTING',
  'qr_code': 'SCAN_QR_CODE',
  'connected': 'WORKING',
  'stopped': 'STOPPED',
  'failed': 'FAILED',
  'working': 'WORKING',
};

/**
 * Maps WAHA API status (uppercase) to our database status format (lowercase)
 */
export function mapWahaStatusToDb(wahaStatus: string): string {
  const mapped = WAHA_TO_DB_STATUS_MAP[wahaStatus];
  if (mapped) {
    return mapped;
  }
  
  // Fallback: if unknown status, try to use it as-is or default to disconnected
  console.warn(`Unknown WAHA status: ${wahaStatus}, defaulting to 'disconnected'`);
  return 'disconnected';
}

/**
 * Maps our database status (lowercase) to WAHA API status format (uppercase)
 */
export function mapDbStatusToWaha(dbStatus: string): string {
  return DB_TO_WAHA_STATUS_MAP[dbStatus] || 'STOPPED';
}
