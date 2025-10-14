import dayjs from 'dayjs';
import { ApiAnalytics, ApiSpec } from '../types';

const owners = ['数据组', '研究院', '资讯团队'];
const authTypes: ApiSpec['authType'][] = ['none', 'apiKey', 'oauth2'];
const statuses: ApiSpec['status'][] = ['draft', 'active', 'deprecated'];
const methods: ApiSpec['methods'][] = [
  ['GET', 'POST'],
  ['GET'],
  ['GET', 'POST', 'PUT']
];

const randomPick = <T,>(list: T[]): T => list[Math.floor(Math.random() * list.length)];

const createMockApis = (count = 8): ApiSpec[] =>
  Array.from({ length: count }).map((_, idx) => {
    const createdAt = dayjs().subtract(idx, 'day');
    return {
      id: `api-${idx + 1}`,
      name: `服务接口 ${idx + 1}`,
      description: `这是接口 ${idx + 1} 的描述信息，支持核心业务能力。`,
      version: `v${1 + (idx % 3)}.0`,
      baseUrl: `https://api.service${idx + 1}.stockai.local`,
      owner: randomPick(owners),
      status: randomPick(statuses),
      rateLimitPerMinute: 1000 + idx * 120,
      authType: randomPick(authTypes),
      updatedAt: createdAt.add(idx, 'hour').toISOString(),
      createdAt: createdAt.toISOString(),
      tags: ['内部', '限流'],
      methods: randomPick(methods)
    };
  });

const createMockAnalytics = (apis: ApiSpec[]): ApiAnalytics[] =>
  apis.map((api, idx) => ({
    apiId: api.id,
    callSuccess: 10000 - idx * 523,
    callFailure: 50 + idx * 7,
    avgLatency: 120 + idx * 8,
    lastCalledAt: dayjs().subtract(idx, 'hour').toISOString()
  }));

export const mockApiSpecs = createMockApis();
export const mockAnalytics = createMockAnalytics(mockApiSpecs);
