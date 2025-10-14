import { Avatar, Badge, Button, Space, Typography } from 'antd';
import { BellOutlined, PlusOutlined } from '@ant-design/icons';

const PageHeader = () => {
  return (
    <div className="page-header">
      <Typography.Title level={4} style={{ margin: 0 }}>
        StockAI 服务管理平台
      </Typography.Title>
      <Space size="middle">
        <Button type="primary" icon={<PlusOutlined />}>快速创建</Button>
        <Badge count={5} size="small">
          <Button icon={<BellOutlined />} type="text" />
        </Badge>
        <Avatar style={{ backgroundColor: '#1677ff' }}>SA</Avatar>
      </Space>
    </div>
  );
};

export default PageHeader;
