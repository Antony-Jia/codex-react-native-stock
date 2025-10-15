/**
 * API types matching backend schemas
 */

// Auth types
export interface User {
  id: number;
  username: string;
  full_name?: string;
  is_active: boolean;
  is_superuser: boolean;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  password: string;
  full_name?: string;
}

export interface Token {
  access_token: string;
  token_type: string;
}

// Quota types
export interface Quota {
  id: string;
  domain?: string;
  endpoint?: string;
  algo: 'token_bucket' | 'leaky_bucket';
  capacity: number;
  refill_rate: number;
  leak_rate?: number;
  burst?: number;
  enabled: boolean;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface QuotaCreate {
  id: string;
  domain?: string;
  endpoint?: string;
  algo?: string;
  capacity?: number;
  refill_rate?: number;
  leak_rate?: number;
  burst?: number;
  enabled?: boolean;
  notes?: string;
}

export interface QuotaUpdate {
  domain?: string;
  endpoint?: string;
  algo?: string;
  capacity?: number;
  refill_rate?: number;
  leak_rate?: number;
  burst?: number;
  enabled?: boolean;
  notes?: string;
}

// Metrics types
export interface MetricsCurrent {
  quota_id: string;
  ok: number;
  err: number;
  r429: number;
  tokens_remain?: number;
}

export interface MetricSeriesPoint {
  ts: string;
  quota_id: string;
  ok: number;
  err: number;
  r429: number;
  latency_p95?: number;
  tokens_remain?: number;
}

export interface MetricsSeriesResponse {
  items: MetricSeriesPoint[];
}

// Trace types
export interface Trace {
  id: number;
  quota_id: string;
  status_code: number;
  latency_ms?: number;
  message?: string;
  created_at: string;
}

// Task types
export interface Task {
  job_id: string;
  name: string;
  cron?: string;
  next_run?: string;
  is_active: boolean;
}

export interface TaskCreate {
  name: string;
  cron: string;
}

export interface TaskTrigger {
  job_id: string;
}

// SSE Event types
export interface SSETraceEvent {
  type: 'trace';
  data: {
    id: number;
    quota_id: string;
    status_code: number;
    latency_ms?: number;
    message?: string;
    created_at: string;
  };
}

export interface SSETokensEvent {
  type: 'tokens';
  data: {
    quota_id: string;
    tokens_remain: number;
    capacity: number;
    timestamp: string;
  };
}

export interface SSEErrorEvent {
  type: 'error';
  data: {
    message: string;
  };
}

export type SSEEvent = SSETraceEvent | SSETokensEvent | SSEErrorEvent;
