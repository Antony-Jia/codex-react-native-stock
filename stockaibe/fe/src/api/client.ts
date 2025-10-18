/**
 * API client for StockCrawler Limiter Admin
 */

import axios, { AxiosInstance, AxiosError } from 'axios';
import type {
  FuncStats,
  LoginRequest,
  MetricsCurrent,
  MetricsSeriesResponse,
  PaginatedResponse,
  Quota,
  QuotaCreate,
  QuotaUpdate,
  RegisterRequest,
  ShanghaiAFinancialCollectRequest,
  ShanghaiAFinancialCollectResponse,
  ShanghaiAManualUpdateRequest,
  ShanghaiAManualUpdateResponse,
  ShanghaiAMarketFundFlow,
  ShanghaiAStock,
  ShanghaiAStockBalanceSheet,
  ShanghaiAStockBalanceSheetSummary,
  ShanghaiAStockCreate,
  ShanghaiAStockFundFlow,
  ShanghaiAStockInfo,
  ShanghaiAStockPerformance,
  ShanghaiAStockPerformanceSummary,
  ShanghaiAStockUpdate,
  Task,
  TaskCreate,
  TaskTrigger,
  Token,
  Trace,
  User,
} from '../types/api';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

class ApiClient {
  private client: AxiosInstance;
  private token: string | null = null;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Load token from localStorage
    this.token = localStorage.getItem('access_token');
    if (this.token) {
      this.setAuthHeader(this.token);
    }

    // Response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        if (error.response?.status === 401) {
          // Token expired or invalid
          this.clearAuth();
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    );
  }

  private setAuthHeader(token: string) {
    this.client.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  }

  private clearAuth() {
    this.token = null;
    localStorage.removeItem('access_token');
    delete this.client.defaults.headers.common['Authorization'];
  }

  // Auth API
  async login(data: LoginRequest): Promise<Token> {
    const formData = new FormData();
    formData.append('username', data.username);
    formData.append('password', data.password);
    
    const response = await this.client.post<Token>('/auth/login', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    
    this.token = response.data.access_token;
    localStorage.setItem('access_token', this.token);
    this.setAuthHeader(this.token);
    
    return response.data;
  }

  async register(data: RegisterRequest): Promise<User> {
    const response = await this.client.post<User>('/auth/register', data);
    return response.data;
  }

  async getCurrentUser(): Promise<User> {
    const response = await this.client.get<User>('/auth/me');
    return response.data;
  }

  logout() {
    this.clearAuth();
  }

  isAuthenticated(): boolean {
    return this.token !== null;
  }

  // Quota API
  async getQuotas(): Promise<Quota[]> {
    const response = await this.client.get<Quota[]>('/quotas');
    return response.data;
  }

  async createQuota(data: QuotaCreate): Promise<Quota> {
    const response = await this.client.post<Quota>('/quotas', data);
    return response.data;
  }

  async updateQuota(quotaId: string, data: QuotaUpdate): Promise<Quota> {
    const response = await this.client.put<Quota>(`/quotas/${quotaId}`, data);
    return response.data;
  }

  async toggleQuota(quotaId: string): Promise<Quota> {
    const response = await this.client.post<Quota>(`/quotas/${quotaId}/toggle`);
    return response.data;
  }

  // Metrics API
  async getCurrentMetrics(): Promise<MetricsCurrent[]> {
    const response = await this.client.get<MetricsCurrent[]>('/metrics/current');
    return response.data;
  }

  async getMetricsSeries(quotaId?: string, limit: number = 100): Promise<MetricsSeriesResponse> {
    const params = new URLSearchParams();
    if (quotaId) params.append('quota_id', quotaId);
    params.append('limit', limit.toString());
    
    const response = await this.client.get<MetricsSeriesResponse>('/metrics/series', { params });
    return response.data;
  }

  // Traces API
  async getTraces(limit: number = 100): Promise<Trace[]> {
    const response = await this.client.get<Trace[]>('/traces', {
      params: { limit },
    });
    return response.data;
  }

  async deleteAllTraces(): Promise<{ message: string; deleted_count: number }> {
    const response = await this.client.delete<{ message: string; deleted_count: number }>('/traces/all');
    return response.data;
  }

  async deleteOldTraces(): Promise<{ message: string; deleted_count: number }> {
    const response = await this.client.delete<{ message: string; deleted_count: number }>('/traces/old');
    return response.data;
  }

  async getFuncStats(): Promise<FuncStats[]> {
    const response = await this.client.get<FuncStats[]>('/traces/func-stats');
    return response.data;
  }

  // Tasks API
  async getTasks(): Promise<Task[]> {
    const response = await this.client.get<Task[]>('/tasks');
    return response.data;
  }

  async createTask(data: TaskCreate): Promise<Task> {
    const response = await this.client.post<Task>('/tasks', data);
    return response.data;
  }

  async triggerTask(data: TaskTrigger): Promise<{ message: string }> {
    const response = await this.client.post<{ message: string }>('/tasks/trigger', data);
    return response.data;
  }

  async deleteTask(jobId: string): Promise<{ message: string }> {
    const response = await this.client.delete<{ message: string }>(`/tasks/${jobId}`);
    return response.data;
  }

  // Shanghai A-share API
  async getShanghaiAStocks(params?: { is_active?: boolean; keyword?: string }): Promise<ShanghaiAStock[]> {
    const response = await this.client.get<ShanghaiAStock[]>('/shanghai-a/stocks', { params });
    return response.data;
  }

  async createShanghaiAStock(data: ShanghaiAStockCreate): Promise<ShanghaiAStock> {
    const response = await this.client.post<ShanghaiAStock>('/shanghai-a/stocks', data);
    return response.data;
  }

  async updateShanghaiAStock(code: string, data: ShanghaiAStockUpdate): Promise<ShanghaiAStock> {
    const response = await this.client.put<ShanghaiAStock>(`/shanghai-a/stocks/${code}`, data);
    return response.data;
  }

  async deleteShanghaiAStock(code: string): Promise<void> {
    await this.client.delete(`/shanghai-a/stocks/${code}`);
  }

  async syncShanghaiAStock(code: string): Promise<ShanghaiAStock> {
    const response = await this.client.post<ShanghaiAStock>(`/shanghai-a/stocks/${code}/sync`);
    return response.data;
  }

  async getShanghaiAMarketFundFlow(limit: number = 30): Promise<ShanghaiAMarketFundFlow[]> {
    const response = await this.client.get<ShanghaiAMarketFundFlow[]>('/shanghai-a/market-fund-flow', {
      params: { limit },
    });
    return response.data;
  }

  async getShanghaiAStockInfo(code: string): Promise<ShanghaiAStockInfo[]> {
    const response = await this.client.get<ShanghaiAStockInfo[]>(`/shanghai-a/stocks/${code}/info`);
    return response.data;
  }

  async getShanghaiAStockBalanceSheets(
    code: string,
    params?: { limit?: number }
  ): Promise<ShanghaiAStockBalanceSheet[]> {
    const response = await this.client.get<ShanghaiAStockBalanceSheet[]>(
      `/shanghai-a/stocks/${code}/balance-sheets`,
      { params }
    );
    return response.data;
  }

  async getShanghaiABalanceSheetSummary(params?: {
    report_period?: string;
    start_period?: string;
    end_period?: string;
    announcement_date?: string;
    start_announcement_date?: string;
    end_announcement_date?: string;
    stock_code?: string;
    page?: number;
    page_size?: number;
  }): Promise<PaginatedResponse<ShanghaiAStockBalanceSheetSummary>> {
    const response = await this.client.get<PaginatedResponse<ShanghaiAStockBalanceSheetSummary>>('/shanghai-a/financials/balance-sheets', {
      params,
    });
    return response.data;
  }

  async getShanghaiAStockPerformances(
    code: string,
    params?: { limit?: number }
  ): Promise<ShanghaiAStockPerformance[]> {
    const response = await this.client.get<ShanghaiAStockPerformance[]>(
      `/shanghai-a/stocks/${code}/performances`,
      { params }
    );
    return response.data;
  }

  async getShanghaiAPerformanceSummary(params?: {
    report_period?: string;
    start_period?: string;
    end_period?: string;
    announcement_date?: string;
    start_announcement_date?: string;
    end_announcement_date?: string;
    stock_code?: string;
    page?: number;
    page_size?: number;
  }): Promise<PaginatedResponse<ShanghaiAStockPerformanceSummary>> {
    const response = await this.client.get<PaginatedResponse<ShanghaiAStockPerformanceSummary>>('/shanghai-a/financials/performances', {
      params,
    });
    return response.data;
  }

  async getShanghaiAStockFundFlow(params?: {
    trade_date?: string;
    stock_code?: string;
    limit?: number;
  }): Promise<ShanghaiAStockFundFlow[]> {
    const response = await this.client.get<ShanghaiAStockFundFlow[]>('/shanghai-a/stock-fund-flow', { params });
    return response.data;
  }

  async manualUpdateShanghaiA(
    data: ShanghaiAManualUpdateRequest
  ): Promise<ShanghaiAManualUpdateResponse> {
    const response = await this.client.post<ShanghaiAManualUpdateResponse>('/shanghai-a/manual-update', data);
    return response.data;
  }

  async collectShanghaiAFinancials(
    data: ShanghaiAFinancialCollectRequest
  ): Promise<ShanghaiAFinancialCollectResponse> {
    const response = await this.client.post<ShanghaiAFinancialCollectResponse>(
      '/shanghai-a/financials/collect',
      data
    );
    return response.data;
  }

  // SSE Events
  getEventsStreamUrl(): string {
    const token = this.token || localStorage.getItem('access_token');
    return `${API_BASE_URL}/events/stream?token=${token}`;
  }
}

export const apiClient = new ApiClient();
export default apiClient;
