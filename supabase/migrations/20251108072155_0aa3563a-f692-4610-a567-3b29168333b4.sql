-- Fix waha_sessions status check constraint to accept both WAHA (uppercase) and DB (lowercase) formats
-- This allows for safe transition while we implement status mapping
ALTER TABLE waha_sessions 
DROP CONSTRAINT IF EXISTS waha_sessions_status_check;

ALTER TABLE waha_sessions 
ADD CONSTRAINT waha_sessions_status_check 
CHECK (status IN (
  -- Lowercase (our database format)
  'disconnected', 'connecting', 'qr_code', 'connected', 'failed', 'stopped', 'working',
  -- Uppercase (WAHA API format - for safety during transition)
  'STARTING', 'SCAN_QR_CODE', 'WORKING', 'STOPPED', 'FAILED'
));