export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface ApiSpec {
  id: string;
  name: string;
  description?: string;
  version: string;
  baseUrl: string;
  owner: string;
  status: 'draft' | 'active' | 'deprecated';
  rateLimitPerMinute: number;
  authType: 'none' | 'apiKey' | 'oauth2';
  updatedAt: string;
  createdAt: string;
  tags: string[];
  methods: HttpMethod[];
}

export interface ApiAnalytics {
  apiId: string;
  callSuccess: number;
  callFailure: number;
  avgLatency: number;
  lastCalledAt?: string;
}
