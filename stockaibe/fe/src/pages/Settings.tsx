import { Button, Card, Col, Form, Input, Row, Select, Space, Switch, Typography } from 'antd';

const Settings = () => {
  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      <Typography.Title level={3}>平台设置</Typography.Title>
      <Row gutter={24}>
        <Col span={12}>
          <Card title="全局配置">
            <Form layout="vertical">
              <Form.Item label="平台名称" name="platformName" initialValue="StockAI 管理平台">
                <Input placeholder="输入显示名称" />
              </Form.Item>
              <Form.Item label="主后端地址" name="backendUrl" initialValue="http://localhost:8000">
                <Input placeholder="https://api.stockai.local" />
              </Form.Item>
              <Form.Item label="主题风格" name="theme" initialValue="light">
                <Select
                  options={[
                    { label: '亮色', value: 'light' },
                    { label: '暗色', value: 'dark' }
                  ]}
                />
              </Form.Item>
              <Form.Item label="启用审计日志" name="auditLog" valuePropName="checked" initialValue>
                <Switch />
              </Form.Item>
              <Form.Item>
                <Button type="primary">保存配置</Button>
              </Form.Item>
            </Form>
          </Card>
        </Col>
        <Col span={12}>
          <Card title="集成服务">
            <Form layout="vertical">
              <Form.Item label="统一认证中心" name="iam" initialValue="https://iam.stockai.local">
                <Input placeholder="https://iam.example.com" />
              </Form.Item>
              <Form.Item label="监控系统地址" name="monitor" initialValue="https://grafana.stockai.local">
                <Input placeholder="https://grafana.example.com" />
              </Form.Item>
              <Form.Item label="通知渠道">
                <Select
                  mode="multiple"
                  defaultValue={['email', 'feishu']}
                  options={[
                    { label: '邮件', value: 'email' },
                    { label: '飞书', value: 'feishu' },
                    { label: '企业微信', value: 'wechat' }
                  ]}
                />
              </Form.Item>
              <Form.Item>
                <Button>测试连接</Button>
              </Form.Item>
            </Form>
          </Card>
        </Col>
      </Row>
    </Space>
  );
};

export default Settings;
