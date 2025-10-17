/**
 * Dashboard - Rate Limiting Monitoring
 */

import React, { useEffect, useState } from 'react';
import { Card, Col, Row, Space, Statistic, Progress, Typography, Spin, Alert } from 'antd';
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  WarningOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';
import { Line, LineConfig, Gauge, GaugeConfig } from '@ant-design/plots';
import apiClient from '../api/client';
import type { MetricsCurrent, MetricSeriesPoint, Quota } from '../types/api';
import dayjs from 'dayjs';

const { Title } = Typography;

const Dashboard: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentMetrics, setCurrentMetrics] = useState<MetricsCurrent[]>([]);
  const [seriesData, setSeriesData] = useState<MetricSeriesPoint[]>([]);
  const [quotas, setQuotas] = useState<Quota[]>([]);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5000); // Refresh every 5 seconds
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    try {
      const [metrics, series, quotasList] = await Promise.all([
        apiClient.getCurrentMetrics(),
        apiClient.getMetricsSeries(undefined, 50),
        apiClient.getQuotas(),
      ]);
      setCurrentMetrics(metrics);
      setSeriesData(series.items);
      setQuotas(quotasList);
      setError(null);
    } catch (err: unknown) {
      const error = err as Error;
      setError(error.message || '加载数据失败');
    } finally {
      setLoading(false);
    }
  };

  // Calculate totals
  const totalOk = currentMetrics.reduce((sum, m) => sum + m.ok, 0);
  const totalErr = currentMetrics.reduce((sum, m) => sum + m.err, 0);
  const total429 = currentMetrics.reduce((sum, m) => sum + m.r429, 0);
  const totalRequests = totalOk + totalErr + total429;
  const successRate = totalRequests > 0 ? (totalOk / totalRequests) * 100 : 0;
  const errorRate = totalRequests > 0 ? (totalErr / totalRequests) * 100 : 0;
  const rate429 = totalRequests > 0 ? (total429 / totalRequests) * 100 : 0;

  // Prepare chart data
  const lineData = seriesData.flatMap(item => [
    { time: dayjs(item.ts).format('HH:mm:ss'), type: '成功', value: item.ok },
    { time: dayjs(item.ts).format('HH:mm:ss'), type: '错误', value: item.err },
    { time: dayjs(item.ts).format('HH:mm:ss'), type: '429限流', value: item.r429 },
  ]);

  const lineConfig: LineConfig = {
    data: lineData,
    xField: 'time',
    yField: 'value',
    seriesField: 'type',
    smooth: true,
    animation: { appear: { animation: 'path-in', duration: 1000 } },
    color: ['#52c41a', '#ff4d4f', '#faad14'],
  };

  const gaugeConfig: GaugeConfig = {
    percent: successRate / 100,
    range: {
      color: successRate >= 95 ? '#52c41a' : successRate >= 80 ? '#faad14' : '#ff4d4f',
    },
    indicator: {
      pointer: { style: { stroke: '#D0D0D0' } },
      pin: { style: { stroke: '#D0D0D0' } },
    },
    statistic: {
      content: {
        formatter: () => `${successRate.toFixed(1)}%`,
        style: { fontSize: '24px', lineHeight: '44px' },
      },
    },
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 0' }}>
        <Spin size="large" tip="加载中..." />
      </div>
    );
  }

  if (error) {
    return (
      <Alert
        message="加载失败"
        description={error}
        type="error"
        showIcon
        action={
          <button onClick={loadData} style={{ cursor: 'pointer' }}>
            重试
          </button>
        }
      />
    );
  }

  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      <Title level={3}>限流监控仪表盘</Title>

      {/* Statistics Cards */}
      <Row gutter={16}>
        <Col span={6}>
          <Card>
            <Statistic
              title="总请求数"
              value={totalRequests}
              prefix={<ThunderboltOutlined />}
              valueStyle={{ color: '#1677ff' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="成功请求"
              value={totalOk}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#52c41a' }}
              suffix={`(${successRate.toFixed(1)}%)`}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="错误请求"
              value={totalErr}
              prefix={<CloseCircleOutlined />}
              valueStyle={{ color: '#ff4d4f' }}
              suffix={`(${errorRate.toFixed(1)}%)`}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="限流拒绝"
              value={total429}
              prefix={<WarningOutlined />}
              valueStyle={{ color: '#faad14' }}
              suffix={`(${rate429.toFixed(1)}%)`}
            />
          </Card>
        </Col>
      </Row>

      {/* Charts */}
      <Row gutter={16}>
        <Col span={16}>
          <Card title="请求趋势">
            <Line {...lineConfig} height={300} />
          </Card>
        </Col>
        <Col span={8}>
          <Card title="成功率">
            <Gauge {...gaugeConfig} height={300} />
          </Card>
        </Col>
      </Row>

      {/* Quota Status */}
      <Card title="配额状态">
        <Row gutter={[16, 16]}>
          {quotas.map((quota) => {
            const percent = quota.current_tokens !== undefined && quota.current_tokens !== null
              ? Math.round((quota.current_tokens / quota.capacity) * 100)
              : 0;
            const color = percent > 50 ? '#52c41a' : percent > 20 ? '#faad14' : '#ff4d4f';
            return (
              <Col span={8} key={quota.id}>
                <Card size="small">
                  <Typography.Text strong>{quota.name || quota.id}</Typography.Text>
                  <div style={{ marginTop: 8 }}>
                    <Typography.Text type="secondary">
                      令牌余量：{quota.current_tokens?.toFixed(2) || '-'} / {quota.capacity}
                    </Typography.Text>
                    <Progress
                      percent={percent}
                      size="small"
                      status={percent < 20 ? 'exception' : 'normal'}
                      strokeColor={color}
                    />
                  </div>
                </Card>
              </Col>
            );
          })}
        </Row>
      </Card>
    </Space>
  );
};

export default Dashboard;
