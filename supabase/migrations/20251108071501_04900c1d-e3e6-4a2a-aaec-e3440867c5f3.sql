-- Fix waha_sessions status check constraint to include all valid WAHA statuses
ALTER TABLE waha_sessions 
DROP CONSTRAINT IF EXISTS waha_sessions_status_check;

ALTER TABLE waha_sessions 
ADD CONSTRAINT waha_sessions_status_check 
CHECK (status IN ('disconnected', 'connecting', 'qr_code', 'connected', 'failed', 'stopped', 'working'));