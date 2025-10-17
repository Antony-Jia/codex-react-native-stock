/**
 * Request Traces Page - 重新设计版本
 * 包含3个Tab：统计图表、请求追踪列表、函数调用统计
 */

import React, { useEffect, useState } from 'react';
import { Card, Table, Tag, Typography, Space, Button, Popconfirm, message, Tabs } from 'antd';
import { ReloadOutlined, DeleteOutlined, ClearOutlined, BarChartOutlined, UnorderedListOutlined, FunctionOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import apiClient from '../api/client';
import type { Trace, FuncStats, MetricsCurrent } from '../types/api';
import { formatLocalTime } from '../utils/dayjs';
import { Column } from '@ant-design/plots';

const { Title } = Typography;

const Traces: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [traces, setTraces] = useState<Trace[]>([]);
  const [funcStats, setFuncStats] = useState<FuncStats[]>([]);
  const [metricsData, setMetricsData] = useState<MetricsCurrent[]>([]);
  const [activeTab, setActiveTab] = useState('statistics');

  useEffect(() => {
    const fetchData = async () => {
      await Promise.all([
        loadTraces(),
        loadFuncStats(),
        loadMetrics(),
      ]);
    };
    
    fetchData();
    const interval = setInterval(fetchData, 5000); // Refresh every 5 seconds
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadAllData = async () => {
    await Promise.all([
      loadTraces(),
      loadFuncStats(),
      loadMetrics(),
    ]);
  };

  const loadTraces = async () => {
    try {
      const data = await apiClient.getTraces(200);
      setTraces(data);
    } catch (error) {
      console.error('Failed to load traces:', error);
    }
  };

  const loadFuncStats = async () => {
    try {
      const data = await apiClient.getFuncStats();
      setFuncStats(data);
    } catch (error) {
      console.error('Failed to load func stats:', error);
    }
  };

  const loadMetrics = async () => {
    try {
      const data = await apiClient.getCurrentMetrics();
      setMetricsData(data);
    } catch (error) {
      console.error('Failed to load metrics:', error);
    }
  };

  const handleDeleteAll = async () => {
    try {
      setLoading(true);
      const result = await apiClient.deleteAllTraces();
      message.success(result.message);
      await loadAllData();
    } catch (error) {
      console.error('Failed to delete all traces:', error);
      message.error('删除失败');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteOld = async () => {
    try {
      setLoading(true);
      const result = await apiClient.deleteOldTraces();
      message.success(result.message);
      await loadAllData();
    } catch (error) {
      console.error('Failed to delete old traces:', error);
      message.error('删除失败');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setLoading(true);
    try {
      await loadAllData();
      message.success('刷新成功');
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

  const traceColumns: ColumnsType<Trace> = [
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
      width: 120,
    },
    {
      title: '函数名称',
      dataIndex: 'func_name',
      key: 'func_name',
      width: 150,
      render: (name?: string) => name || '-',
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
      render: (time: string) => formatLocalTime(time),
    },
  ];

  const funcStatsColumns: ColumnsType<FuncStats> = [
    {
      title: '函数ID',
      dataIndex: 'func_id',
      key: 'func_id',
      width: 150,
    },
    {
      title: '函数名称',
      dataIndex: 'func_name',
      key: 'func_name',
      width: 150,
      render: (name?: string) => name || '-',
    },
    {
      title: '配额ID',
      dataIndex: 'quota_id',
      key: 'quota_id',
      width: 120,
    },
    {
      title: '总调用',
      dataIndex: 'total_calls',
      key: 'total_calls',
      width: 100,
      sorter: (a, b) => a.total_calls - b.total_calls,
    },
    {
      title: '成功',
      dataIndex: 'success_calls',
      key: 'success_calls',
      width: 100,
      render: (val: number) => <Tag color="success">{val}</Tag>,
    },
    {
      title: '失败',
      dataIndex: 'failed_calls',
      key: 'failed_calls',
      width: 100,
      render: (val: number) => val > 0 ? <Tag color="error">{val}</Tag> : <span>{val}</span>,
    },
    {
      title: '被限流',
      dataIndex: 'limited_calls',
      key: 'limited_calls',
      width: 100,
      render: (val: number) => val > 0 ? <Tag color="warning">{val}</Tag> : <span>{val}</span>,
    },
    {
      title: '成功率',
      key: 'success_rate',
      width: 100,
      render: (_, record) => {
        const rate = record.total_calls > 0 ? (record.success_calls / record.total_calls * 100) : 0;
        return <span>{rate.toFixed(1)}%</span>;
      },
    },
    {
      title: '平均延迟 (ms)',
      dataIndex: 'avg_latency_ms',
      key: 'avg_latency_ms',
      width: 130,
      render: (latency?: number) => latency ? latency.toFixed(2) : '-',
    },
    {
      title: '最后调用',
      dataIndex: 'last_call_at',
      key: 'last_call_at',
      width: 180,
      render: (time?: string) => time ? formatLocalTime(time) : '-',
    },
  ];

  // 准备统计图表数据 - 顺序：成功、失败、限流
  const statusChartData = metricsData.flatMap(metric => [
    { quota: metric.quota_id, type: '成功', value: metric.ok, category: 'success' },
    { quota: metric.quota_id, type: '失败', value: metric.err, category: 'error' },
    { quota: metric.quota_id, type: '限流', value: metric.r429, category: 'limited' },
  ]);

  const funcCallsChartData = funcStats.map(func => ({
    func_name: func.func_name || func.func_id,
    value: func.total_calls,
  })).sort((a, b) => b.value - a.value).slice(0, 10); // 取前10个

  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Title level={3}>请求追踪与统计</Title>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={handleRefresh} loading={loading}>
            刷新
          </Button>
          <Popconfirm
            title="确定删除今天之前的所有记录？"
            description="此操作不可恢复"
            onConfirm={handleDeleteOld}
            okText="确定"
            cancelText="取消"
          >
            <Button icon={<ClearOutlined />} loading={loading}>
              删除非当天数据
            </Button>
          </Popconfirm>
          <Popconfirm
            title="确定删除所有追踪记录？"
            description="此操作不可恢复，将删除包括今天在内的所有数据"
            onConfirm={handleDeleteAll}
            okText="确定"
            cancelText="取消"
          >
            <Button icon={<DeleteOutlined />} danger loading={loading}>
              一键删除全部
            </Button>
          </Popconfirm>
        </Space>
      </div>

      <Card>
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={[
            {
              key: 'statistics',
              label: (
                <span>
                  <BarChartOutlined />
                  统计图表
                </span>
              ),
              children: (
                <Space direction="vertical" size="large" style={{ width: '100%' }}>
                  <Card title="配额状态统计" size="small">
                    <Column
                      data={statusChartData}
                      xField="quota"
                      yField="value"
                      seriesField="type"
                      isGroup={true}
                      columnStyle={{ radius: [4, 4, 0, 0] }}
                      color={(datum) => (datum.type === '成功' ? '#52c41a' : datum.type === '失败' ? '#ff4d4f' : '#faad14')}
                      legend={{ 
                        position: 'top-right',
                      }}
                      height={300}
                      dodgePadding={4}
                      intervalPadding={20}
                      theme={{
                        colors10: ['#52c41a', '#ff4d4f', '#faad14', '#1890ff', '#722ed1', '#13c2c2', '#52c41a', '#faad14', '#f5222d', '#fa8c16'],
                      }}
                    />
                  </Card>
                  <Card title="函数调用次数 TOP 10" size="small">
                    <Column
                      data={funcCallsChartData}
                      xField="func_name"
                      yField="value"
                      columnStyle={{ radius: [4, 4, 0, 0] }}
                      color="#1890ff"
                      height={300}
                      label={{
                        position: 'top',
                        style: { fill: '#000', opacity: 0.6 },
                      }}
                    />
                  </Card>
                </Space>
              ),
            },
            {
              key: 'traces',
              label: (
                <span>
                  <UnorderedListOutlined />
                  请求追踪
                </span>
              ),
              children: (
                <Table
                  columns={traceColumns}
                  dataSource={traces}
                  rowKey="id"
                  loading={loading}
                  pagination={{ pageSize: 20 }}
                  size="small"
                  scroll={{ x: 1200 }}
                />
              ),
            },
            {
              key: 'func-stats',
              label: (
                <span>
                  <FunctionOutlined />
                  函数调用统计
                </span>
              ),
              children: (
                <Table
                  columns={funcStatsColumns}
                  dataSource={funcStats}
                  rowKey="func_id"
                  loading={loading}
                  pagination={{ pageSize: 20 }}
                  size="small"
                  scroll={{ x: 1400 }}
                />
              ),
            },
          ]}
        />
      </Card>
    </Space>
  );
};

export default Traces;
