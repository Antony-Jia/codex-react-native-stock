/**
 * Scheduler Tasks Page
 */

import React, { useEffect, useState } from 'react';
import {
  Card,
  Table,
  Button,
  Space,
  message,
  Tag,
  Popconfirm,
  Typography,
  Tooltip,
} from 'antd';
import {
  PlayCircleOutlined,
  DeleteOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { apiClient } from '../api/client';
import type { Task } from '../types/api';
import { formatLocalTime } from '../utils/dayjs';

const { Title } = Typography;

const Tasks: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [tasks, setTasks] = useState<Task[]>([]);

  useEffect(() => {
    loadTasks();
    const interval = setInterval(loadTasks, 10000); // Refresh every 10 seconds
    return () => clearInterval(interval);
  }, []);

  const loadTasks = async () => {
    setLoading(true);
    try {
      const data = await apiClient.getTasks();
      setTasks(data);
    } catch (err: unknown) {
      const error = err as Error;
      message.error(error.message || '加载任务失败');
    } finally {
      setLoading(false);
    }
  };

  const handleTrigger = async (jobId: string) => {
    try {
      await apiClient.triggerTask({ job_id: jobId });
      message.success('任务已触发');
    } catch (err: unknown) {
      const error = err as Error;
      message.error(error.message || '触发失败');
    }
  };

  const handleDelete = async (jobId: string) => {
    try {
      await apiClient.deleteTask(jobId);
      message.success('任务已删除');
      loadTasks();
    } catch (err: unknown) {
      const error = err as Error;
      message.error(error.message || '删除失败');
    }
  };

  const columns: ColumnsType<Task> = [
    {
      title: '任务 ID',
      dataIndex: 'job_id',
      key: 'job_id',
      width: 200,
    },
    {
      title: '任务名称',
      dataIndex: 'name',
      key: 'name',
      width: 200,
    },
    {
      title: 'Cron 表达式',
      dataIndex: 'cron',
      key: 'cron',
      width: 150,
      render: (cron?: string) => cron || '-',
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      width: 250,
      ellipsis: {
        showTitle: false,
      },
      render: (description?: string) => {
        if (!description) return '-';
        const maxLength = 50;
        const isLong = description.length > maxLength;
        const displayText = isLong ? `${description.substring(0, maxLength)}...` : description;
        
        return isLong ? (
          <Tooltip title={description} placement="topLeft">
            <span style={{ cursor: 'pointer' }}>{displayText}</span>
          </Tooltip>
        ) : (
          <span>{displayText}</span>
        );
      },
    },
    {
      title: '下次运行',
      dataIndex: 'next_run',
      key: 'next_run',
      width: 180,
      render: (time?: string) => (time ? formatLocalTime(time) : '-'),
    },
    {
      title: '状态',
      dataIndex: 'is_active',
      key: 'is_active',
      width: 100,
      render: (active: boolean) => (
        <Tag
          icon={active ? <CheckCircleOutlined /> : <CloseCircleOutlined />}
          color={active ? 'success' : 'default'}
        >
          {active ? '活跃' : '停止'}
        </Tag>
      ),
    },
    {
      title: '操作',
      key: 'action',
      fixed: 'right',
      width: 200,
      render: (_, record) => (
        <Space>
          <Button
            type="link"
            size="small"
            icon={<PlayCircleOutlined />}
            onClick={() => handleTrigger(record.job_id)}
          >
            触发
          </Button>
          <Popconfirm
            title="确定删除该任务？"
            onConfirm={() => handleDelete(record.job_id)}
          >
            <Button
              type="link"
              size="small"
              icon={<DeleteOutlined />}
              danger
            >
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      <Title level={3}>任务调度</Title>

      <Card>
        <Table
          columns={columns}
          dataSource={tasks}
          rowKey="job_id"
          loading={loading}
          pagination={{ pageSize: 10 }}
        />
      </Card>
    </Space>
  );
};

export default Tasks;
