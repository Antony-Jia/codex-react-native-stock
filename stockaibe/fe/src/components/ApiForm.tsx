import { Form, Input, Modal, Select, Space, Tag } from 'antd';
import { useEffect } from 'react';
import dayjs from 'dayjs';
import { ApiSpec } from '../types';

export interface ApiFormProps {
  open: boolean;
  loading?: boolean;
  initialValue?: ApiSpec;
  onSubmit: (value: ApiSpec) => void;
  onCancel: () => void;
}

const statusOptions = [
  { value: 'draft', label: '草稿' },
  { value: 'active', label: '已发布' },
  { value: 'deprecated', label: '下线计划' }
];

const authOptions = [
  { value: 'none', label: '无认证' },
  { value: 'apiKey', label: 'API Key' },
  { value: 'oauth2', label: 'OAuth 2.0' }
];

const methodOptions = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].map(value => ({
  value,
  label: value
}));

const ApiForm = ({ open, loading, initialValue, onSubmit, onCancel }: ApiFormProps) => {
  const [form] = Form.useForm<ApiSpec>();

  useEffect(() => {
    if (open) {
      if (initialValue) {
        form.setFieldsValue(initialValue);
      } else {
        form.resetFields();
      }
    }
  }, [open, initialValue, form]);

  const handleFinish = (value: ApiSpec) => {
    const now = dayjs().toISOString();
    onSubmit({
      ...value,
      id: value.id || `api-${now}`,
      createdAt: value.createdAt ?? now,
      updatedAt: now
    });
  };

  return (
    <Modal
      title={initialValue ? `编辑 ${initialValue.name}` : '创建新接口'}
      open={open}
      onCancel={onCancel}
      onOk={() => form.submit()}
      confirmLoading={loading}
      width={720}
      destroyOnClose
    >
      <Form form={form} layout="vertical" onFinish={handleFinish} initialValues={initialValue}>
        <Form.Item name="name" label="接口名称" rules={[{ required: true, message: '请输入接口名称' }]}> 
          <Input placeholder="例如：行情聚合接口" />
        </Form.Item>
        <Form.Item name="id" label="接口 ID" rules={[{ required: true, message: '请输入唯一 ID' }]}>
          <Input placeholder="例如：market-aggregator" />
        </Form.Item>
        <Form.Item name="description" label="接口描述">
          <Input.TextArea rows={3} placeholder="描述接口能力、接入方及注意事项" />
        </Form.Item>
        <Space size="large" style={{ width: '100%' }} align="start">
          <Form.Item
            name="version"
            label="版本号"
            style={{ flex: 1 }}
            rules={[{ required: true, message: '请输入版本号' }]}
          >
            <Input placeholder="例如：v1.0" />
          </Form.Item>
          <Form.Item
            name="status"
            label="状态"
            style={{ flex: 1 }}
            rules={[{ required: true }]}
          >
            <Select options={statusOptions} placeholder="选择状态" />
          </Form.Item>
          <Form.Item
            name="authType"
            label="认证方式"
            style={{ flex: 1 }}
            rules={[{ required: true }]}
          >
            <Select options={authOptions} placeholder="选择认证方式" />
          </Form.Item>
        </Space>
        <Form.Item name="baseUrl" label="服务地址" rules={[{ required: true, message: '请输入服务地址' }]}>
          <Input placeholder="https://api.example.com" />
        </Form.Item>
        <Space size="large" style={{ width: '100%' }} align="start">
          <Form.Item
            name="rateLimitPerMinute"
            label="每分钟限流"
            style={{ flex: 1 }}
            rules={[{ required: true, message: '请输入限流值' }]}
          >
            <Input type="number" min={0} />
          </Form.Item>
          <Form.Item name="owner" label="接口负责人" style={{ flex: 1 }} rules={[{ required: true }]}> 
            <Input placeholder="部门或负责人" />
          </Form.Item>
          <Form.Item name="methods" label="HTTP 方法" style={{ flex: 1 }} rules={[{ required: true }]}> 
            <Select mode="multiple" placeholder="选择可用方法" options={methodOptions} />
          </Form.Item>
        </Space>
        <Form.Item name="tags" label="标签">
          <Select
            mode="tags"
            placeholder="输入标签后回车"
            tokenSeparators={[',', ' ']}
            tagRender={({ label, closable, onClose }) => (
              <Tag closable={closable} onClose={onClose} style={{ marginRight: 3 }}>
                {label}
              </Tag>
            )}
          />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default ApiForm;
