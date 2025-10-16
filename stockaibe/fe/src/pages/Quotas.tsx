/**
 * Quotas Management Page
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
  InputNumber,
  Switch,
  Select,
  message,
  Tag,
  Popconfirm,
  Typography,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  PoweroffOutlined,
  CheckCircleOutlined,
  StopOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import apiClient from '../api/client';
import type { Quota, QuotaCreate, QuotaUpdate } from '../types/api';
import dayjs from 'dayjs';

const { Title } = Typography;

const Quotas: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [quotas, setQuotas] = useState<Quota[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingQuota, setEditingQuota] = useState<Quota | null>(null);
  const [form] = Form.useForm();

  useEffect(() => {
    loadQuotas();
  }, []);

  const loadQuotas = async () => {
    setLoading(true);
    try {
      const data = await apiClient.getQuotas();
      setQuotas(data);
    } catch (error: any) {
      message.error(error.message || '加载配额失败');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingQuota(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handleEdit = (quota: Quota) => {
    setEditingQuota(quota);
    form.setFieldsValue(quota);
    setModalVisible(true);
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);

      if (editingQuota) {
        // Update
        await apiClient.updateQuota(editingQuota.id, values as QuotaUpdate);
        message.success('更新成功');
      } else {
        // Create
        await apiClient.createQuota(values as QuotaCreate);
        message.success('创建成功');
      }

      setModalVisible(false);
      loadQuotas();
    } catch (error: any) {
      message.error(error.message || '操作失败');
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (quotaId: string) => {
    try {
      await apiClient.toggleQuota(quotaId);
      message.success('状态已切换');
      loadQuotas();
    } catch (error: any) {
      message.error(error.message || '切换失败');
    }
  };

  const columns: ColumnsType<Quota> = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      fixed: 'left',
      width: 150,
    },
    {
      title: '名称',
      dataIndex: 'name',
      key: 'name',
      width: 150,
      render: (name: string) => name || '-',
    },
    {
      title: '域名',
      dataIndex: 'domain',
      key: 'domain',
      width: 150,
      render: (domain: string) => domain || '-',
    },
    {
      title: '端点',
      dataIndex: 'endpoint',
      key: 'endpoint',
      width: 200,
    },
    {
      title: '算法',
      dataIndex: 'algo',
      key: 'algo',
      width: 120,
      render: (algo: string) => (
        <Tag color="blue">{algo === 'token_bucket' ? '令牌桶' : '漏桶'}</Tag>
      ),
    },
    {
      title: '容量',
      dataIndex: 'capacity',
      key: 'capacity',
      width: 100,
    },
    {
      title: '补充速率',
      dataIndex: 'refill_rate',
      key: 'refill_rate',
      width: 120,
      render: (rate: number) => `${rate}/s`,
    },
    {
      title: '状态',
      dataIndex: 'enabled',
      key: 'enabled',
      width: 100,
      render: (enabled: boolean) => (
        <Tag icon={enabled ? <CheckCircleOutlined /> : <StopOutlined />} color={enabled ? 'success' : 'default'}>
          {enabled ? '启用' : '禁用'}
        </Tag>
      ),
    },
    {
      title: '备注',
      dataIndex: 'notes',
      key: 'notes',
      width: 200,
      ellipsis: true,
      render: (notes: string) => notes || '-',
    },
    {
      title: '更新时间',
      dataIndex: 'updated_at',
      key: 'updated_at',
      width: 180,
      render: (time: string) => dayjs(time).format('YYYY-MM-DD HH:mm:ss'),
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
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            编辑
          </Button>
          <Popconfirm
            title={`确定${record.enabled ? '禁用' : '启用'}该配额？`}
            onConfirm={() => handleToggle(record.id)}
          >
            <Button
              type="link"
              size="small"
              icon={<PoweroffOutlined />}
              danger={record.enabled}
            >
              {record.enabled ? '禁用' : '启用'}
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Title level={3}>配额管理</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
          新建配额
        </Button>
      </div>

      <Card>
        <Table
          columns={columns}
          dataSource={quotas}
          rowKey="id"
          loading={loading}
          scroll={{ x: 1700 }}
          pagination={{ pageSize: 10 }}
        />
      </Card>

      <Modal
        title={editingQuota ? '编辑配额' : '新建配额'}
        open={modalVisible}
        onOk={handleSubmit}
        onCancel={() => setModalVisible(false)}
        width={600}
        confirmLoading={loading}
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={{
            algo: 'token_bucket',
            capacity: 60,
            refill_rate: 1.0,
            enabled: true,
          }}
        >
          <Form.Item
            label="配额 ID"
            name="id"
            rules={[{ required: true, message: '请输入配额 ID' }]}
          >
            <Input placeholder="例如: external_api" disabled={!!editingQuota} />
          </Form.Item>

          <Form.Item
            label="配额名称"
            name="name"
            rules={[{ required: true, message: '请输入配额名称' }]}
            tooltip="用于任务装饰器中的 quota_name 参数匹配"
          >
            <Input placeholder="例如: external_api" />
          </Form.Item>

          <Form.Item label="域名" name="domain">
            <Input placeholder="例如: finance.sina.com.cn（可选）" />
          </Form.Item>

          <Form.Item label="端点" name="endpoint">
            <Input placeholder="例如: /api/openapi.php/StockQuoteService.getRealtimeQuotes" />
          </Form.Item>

          <Form.Item label="算法" name="algo">
            <Select>
              <Select.Option value="token_bucket">令牌桶</Select.Option>
              <Select.Option value="leaky_bucket">漏桶</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item
            label="容量"
            name="capacity"
            rules={[{ required: true, message: '请输入容量' }]}
          >
            <InputNumber min={1} style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item
            label="补充速率 (tokens/s)"
            name="refill_rate"
            rules={[{ required: true, message: '请输入补充速率' }]}
          >
            <InputNumber min={0} step={0.1} style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item label="泄漏速率 (tokens/s)" name="leak_rate">
            <InputNumber min={0} step={0.1} style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item label="突发容量" name="burst">
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item label="启用" name="enabled" valuePropName="checked">
            <Switch />
          </Form.Item>

          <Form.Item label="备注" name="notes">
            <Input.TextArea rows={3} placeholder="配额说明" />
          </Form.Item>
        </Form>
      </Modal>
    </Space>
  );
};

export default Quotas;
