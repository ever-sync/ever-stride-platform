import { WahaSession } from './waha';

export type RecoveryStep = 'diagnosis' | 'pre-recovery' | 'recovery' | 'manual' | 'verification';

export interface DiagnosisResult {
  wahaApiOnline: boolean;
  issues: SessionIssue[];
  recoveryPath: 'automatic' | 'semi-automatic' | 'manual';
}

export interface SessionIssue {
  sessionId: string;
  sessionName: string;
  issueType: 'api_down' | 'status_mismatch' | 'qr_expired' | 'reconnect_failed' | 'network_error';
  severity: 'low' | 'medium' | 'high';
  description: string;
  autoRecoverable: boolean;
}

export interface RecoveryAction {
  sessionId: string;
  action: 'restart' | 'refresh_qr' | 'clear_state' | 'reconnect';
  description: string;
}

export interface ExecutionResult {
  sessionId: string;
  action: string;
  status: 'success' | 'failed' | 'skipped';
  message?: string;
  needsManualIntervention?: boolean;
}

export interface WizardState {
  currentStep: RecoveryStep;
  sessions: WahaSession[];
  diagnosis: DiagnosisResult | null;
  recoveryPlan: RecoveryAction[];
  executionResults: ExecutionResult[];
  requiresManualIntervention: boolean;
  manuallyFixedSessions: string[];
}
