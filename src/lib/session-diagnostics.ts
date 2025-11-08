import { WahaSession } from '@/types/waha';
import { DiagnosisResult, SessionIssue } from '@/types/recovery-wizard';

export async function diagnoseSession(session: WahaSession): Promise<SessionIssue | null> {
  const issues: SessionIssue[] = [];

  // Check QR code expiration
  if (session.status === 'qr_code' && session.qr_expires_at) {
    const expiresAt = new Date(session.qr_expires_at);
    if (expiresAt < new Date()) {
      return {
        sessionId: session.id,
        sessionName: session.session_name,
        issueType: 'qr_expired',
        severity: 'medium',
        description: 'QR code has expired and needs regeneration',
        autoRecoverable: true,
      };
    }
  }

  // Check status mismatch
  if (session.status === 'disconnected' && session.reconnect_attempts > 0) {
    return {
      sessionId: session.id,
      sessionName: session.session_name,
      issueType: 'reconnect_failed',
      severity: session.reconnect_attempts > 3 ? 'high' : 'medium',
      description: `Failed to reconnect after ${session.reconnect_attempts} attempts`,
      autoRecoverable: session.reconnect_attempts < 5,
    };
  }

  // Check for network errors
  if (session.last_error && session.last_error.includes('network')) {
    return {
      sessionId: session.id,
      sessionName: session.session_name,
      issueType: 'network_error',
      severity: 'medium',
      description: 'Network connectivity issues detected',
      autoRecoverable: true,
    };
  }

  return null;
}

export async function diagnoseSessions(sessions: WahaSession[]): Promise<DiagnosisResult> {
  const issues: SessionIssue[] = [];
  
  for (const session of sessions) {
    const issue = await diagnoseSession(session);
    if (issue) {
      issues.push(issue);
    }
  }

  // Determine recovery path
  const autoRecoverable = issues.filter(i => i.autoRecoverable).length;
  const manualRequired = issues.length - autoRecoverable;

  let recoveryPath: 'automatic' | 'semi-automatic' | 'manual' = 'automatic';
  if (manualRequired > 0) {
    recoveryPath = autoRecoverable > 0 ? 'semi-automatic' : 'manual';
  }

  return {
    wahaApiOnline: true, // Will be checked by health monitor
    issues,
    recoveryPath,
  };
}
