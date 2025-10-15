/**
 * Request Traces Page
 */

import React, { useEffect, useState } from 'react';
import { Card, Table, Tag, Typography, Space, Button } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import apiClient from '../api/client';
import type { Trace } from '../types/api';
import dayjs from 'dayjs';

const { Title } = Typography;

const Traces: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [traces, setTraces] = useState<Trace[]>([]);

  useEffect(() => {
    loadTraces();
    const interval = setInterval(loadTraces, 3000); // Refresh every 3 seconds
    return () => clearInterval(interval);
  }, []);

  const loadTraces = async () => {
    setLoading(true);
    try {
      const data = await apiClient.getTraces(200);
      setTraces(data);
    } catch (error) {
      console.error('Failed to load traces:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (statusCode: number) => {
    if (statusCode === 200) return 'success';
    if (statusCode === 429) return 'warning';
    return 'error';
  };

  const getStatusText = (statusCode: number) => {
    if (statusCode === 200) return '成功';
    if (statusCode === 429) return '限流';
    if (statusCode === 500) return '错误';
    return statusCode.toString();
  };

  const columns: ColumnsType<Trace> = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 80,
    },
    {
      title: '配额 ID',
      dataIndex: 'quota_id',
      key: 'quota_id',
      width: 150,
    },
    {
      title: '状态',
      dataIndex: 'status_code',
      key: 'status_code',
      width: 100,
      render: (code: number) => (
        <Tag color={getStatusColor(code)}>{getStatusText(code)}</Tag>
      ),
    },
    {
      title: '延迟 (ms)',
      dataIndex: 'latency_ms',
      key: 'latency_ms',
      width: 120,
      render: (latency?: number) => (
        <span style={{ color: latency && latency > 1000 ? '#ff4d4f' : undefined }}>
          {latency?.toFixed(2) || '-'}
        </span>
      ),
    },
    {
      title: '消息',
      dataIndex: 'message',
      key: 'message',
      ellipsis: true,
      render: (msg?: string) => msg || '-',
    },
    {
      title: '时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 180,
      render: (time: string) => dayjs(time).format('YYYY-MM-DD HH:mm:ss'),
    },
  ];

  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Title level={3}>请求追踪</Title>
        <Button icon={<ReloadOutlined />} onClick={loadTraces} loading={loading}>
          刷新
        </Button>
      </div>

      <Card>
        <Table
          columns={columns}
          dataSource={traces}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 20 }}
          size="small"
        />
      </Card>
    </Space>
  );
};

export default Traces;
