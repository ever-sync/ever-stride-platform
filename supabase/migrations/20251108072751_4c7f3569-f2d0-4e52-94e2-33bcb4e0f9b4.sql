-- Update existing sessions with uppercase WAHA status to lowercase database format
UPDATE waha_sessions 
SET status = 'qr_code' 
WHERE status = 'SCAN_QR_CODE';

UPDATE waha_sessions 
SET status = 'connecting' 
WHERE status = 'STARTING';

UPDATE waha_sessions 
SET status = 'connected' 
WHERE status = 'WORKING';

UPDATE waha_sessions 
SET status = 'stopped' 
WHERE status = 'STOPPED';

UPDATE waha_sessions 
SET status = 'failed' 
WHERE status = 'FAILED';