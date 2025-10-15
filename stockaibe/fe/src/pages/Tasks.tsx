/**
 * Scheduler Tasks Page
 */

import React, { useEffect, useState } from 'react';
import {
  Card,
  Table,
  Button,
  Space,
  Modal,
  Form,
  Input,
  message,
  Tag,
  Popconfirm,
  Typography,
} from 'antd';
import {
  PlusOutlined,
  PlayCircleOutlined,
  DeleteOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import apiClient from '../api/client';
import type { Task, TaskCreate } from '../types/api';
import dayjs from 'dayjs';

const { Title } = Typography;

const Tasks: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [form] = Form.useForm();

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

  const handleCreate = () => {
    form.resetFields();
    setModalVisible(true);
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);
      await apiClient.createTask(values as TaskCreate);
      message.success('任务创建成功');
      setModalVisible(false);
      loadTasks();
    } catch (err: unknown) {
      const error = err as Error;
      message.error(error.message || '创建失败');
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
      title: '下次运行',
      dataIndex: 'next_run',
      key: 'next_run',
      width: 180,
      render: (time?: string) => (time ? dayjs(time).format('YYYY-MM-DD HH:mm:ss') : '-'),
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Title level={3}>任务调度</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
          新建任务
        </Button>
      </div>

      <Card>
        <Table
          columns={columns}
          dataSource={tasks}
          rowKey="job_id"
          loading={loading}
          pagination={{ pageSize: 10 }}
        />
      </Card>

      <Modal
        title="新建定时任务"
        open={modalVisible}
        onOk={handleSubmit}
        onCancel={() => setModalVisible(false)}
        confirmLoading={loading}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            label="任务名称"
            name="name"
            rules={[{ required: true, message: '请输入任务名称' }]}
          >
            <Input placeholder="例如: 每日数据清理" />
          </Form.Item>

          <Form.Item
            label="Cron 表达式"
            name="cron"
            rules={[{ required: true, message: '请输入 Cron 表达式' }]}
            extra="例如: 0 3 * * * (每天凌晨3点)"
          >
            <Input placeholder="0 3 * * *" />
          </Form.Item>
        </Form>
      </Modal>
    </Space>
  );
};

export default Tasks;
