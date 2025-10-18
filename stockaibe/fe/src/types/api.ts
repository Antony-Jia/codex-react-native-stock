/**
 * API types matching backend schemas
 */

// Generic paginated response
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
}

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
  name?: string;
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
  current_tokens?: number;
}

export interface QuotaCreate {
  id: string;
  name?: string;
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
  name?: string;
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
  func_id?: string;
  func_name?: string;
  status_code: number;
  latency_ms?: number;
  message?: string;
  created_at: string;
}

export interface FuncStats {
  func_id: string;
  func_name?: string;
  quota_id: string;
  total_calls: number;
  success_calls: number;
  failed_calls: number;
  limited_calls: number;
  avg_latency_ms?: number;
  last_call_at?: string;
}

// Task types
export interface Task {
  job_id: string;
  name: string;
  cron?: string;
  next_run?: string;
  is_active: boolean;
  description?: string;
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

// Shanghai A-share types
export interface ShanghaiAStock {
  code: string;
  name: string;
  short_name?: string;
  industry?: string;
  exchange: string;
  is_active: boolean;
  listing_date?: string;
  created_at: string;
  updated_at: string;
}

export interface ShanghaiAStockCreate {
  code: string;
  name: string;
  short_name?: string;
  industry?: string;
  exchange?: string;
  is_active?: boolean;
  listing_date?: string;
}

export interface ShanghaiAStockUpdate {
  name?: string;
  short_name?: string;
  industry?: string;
  exchange?: string;
  is_active?: boolean;
  listing_date?: string;
}

export interface ShanghaiAMarketFundFlow {
  trade_date: string;
  shanghai_close?: number;
  shanghai_pct_change?: number;
  shenzhen_close?: number;
  shenzhen_pct_change?: number;
  main_net_inflow?: number;
  main_net_ratio?: number;
  super_large_net_inflow?: number;
  super_large_net_ratio?: number;
  large_net_inflow?: number;
  large_net_ratio?: number;
  medium_net_inflow?: number;
  medium_net_ratio?: number;
  small_net_inflow?: number;
  small_net_ratio?: number;
}

export interface ShanghaiAStockFundFlow {
  stock_code: string;
  stock_name?: string;
  trade_date: string;
  latest_price?: number;
  pct_change?: number;
  turnover_rate?: number;
  inflow?: number;
  outflow?: number;
  net_inflow?: number;
  amount?: number;
}

export interface ShanghaiAManualUpdateRequest {
  trade_date?: string;
  stock_codes?: string[];
}

export interface ShanghaiAManualUpdateResponse {
  message: string;
  summary: Record<string, number>;
}

export interface ShanghaiAStockInfo {
  stock_code: string;
  info_key: string;
  info_value?: string;
  created_at: string;
  updated_at: string;
}

export interface ShanghaiAStockBalanceSheet {
  stock_code: string;
  report_period: string;
  announcement_date?: string;
  currency_funds?: number;
  accounts_receivable?: number;
  inventory?: number;
  total_assets?: number;
  total_assets_yoy?: number;
  accounts_payable?: number;
  advance_receipts?: number;
  total_liabilities?: number;
  total_liabilities_yoy?: number;
  debt_to_asset_ratio?: number;
  total_equity?: number;
  created_at: string;
  updated_at: string;
}

export interface ShanghaiAStockBalanceSheetSummary extends ShanghaiAStockBalanceSheet {
  stock_name?: string;
  short_name?: string;
}

export interface ShanghaiAStockPerformance {
  stock_code: string;
  report_period: string;
  announcement_date?: string;
  eps?: number;
  revenue?: number;
  revenue_yoy?: number;
  revenue_qoq?: number;
  net_profit?: number;
  net_profit_yoy?: number;
  net_profit_qoq?: number;
  bps?: number;
  roe?: number;
  operating_cash_flow_ps?: number;
  gross_margin?: number;
  industry?: string;
  created_at: string;
  updated_at: string;
}

export interface ShanghaiAStockPerformanceSummary extends ShanghaiAStockPerformance {
  stock_name?: string;
  short_name?: string;
}

export interface ShanghaiAFinancialCollectRequest {
  start_period: string;
  end_period?: string;
  include_balance_sheet?: boolean;
  include_performance?: boolean;
}

export interface ShanghaiAFinancialCollectResponse {
  message: string;
  quarters_processed: string[];
  balance_sheet_rows: number;
  balance_sheet_stocks: number;
  performance_rows: number;
  performance_stocks: number;
}
