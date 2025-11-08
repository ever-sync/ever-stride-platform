export interface SessionHealthCheck {
  id: string;
  tenant_id: number;
  check_timestamp: string;
  total_sessions: number;
  healthy_sessions: number;
  unhealthy_sessions: number;
  critical_issues: CriticalIssue[];
  average_response_time_ms: number | null;
  failed_sessions: FailedSession[];
  recommendations: string[];
  created_at: string;
}

export interface CriticalIssue {
  type: 'api_down' | 'multiple_failures' | 'high_failure_rate' | 'slow_response';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  affected_sessions: string[];
  suggested_action: string;
}

export interface FailedSession {
  session_id: string;
  session_name: string;
  error: string;
  response_time_ms?: number;
  status_mismatch?: boolean;
}

export interface HealthTrend {
  timestamp: string;
  healthy_percentage: number;
}

export type HealthStatus = 'healthy' | 'degraded' | 'critical';

export interface HealthSummary {
  status: HealthStatus;
  healthy_percentage: number;
  trend: 'improving' | 'stable' | 'degrading';
  last_check: Date | null;
  critical_count: number;
}
