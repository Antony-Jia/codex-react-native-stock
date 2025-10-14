import { Card, Col, Row, Space, Statistic, Tag, Typography } from 'antd';
import {
  Area,
  AreaConfig,
  TinyArea,
  TinyAreaConfig
} from '@ant-design/plots';
import { mockAnalytics, mockApiSpecs } from '../api/mock';
import dayjs from 'dayjs';

const dashboardAreaConfig: AreaConfig = {
  data: mockAnalytics.map(item => ({
    time: dayjs(item.lastCalledAt).format('HH:mm'),
    value: item.callSuccess
  })),
  xField: 'time',
  yField: 'value',
  smooth: true,
  autoFit: true,
  color: '#1677ff',
  areaStyle: { fillOpacity: 0.2 }
};

const failureAreaConfig: TinyAreaConfig = {
  data: mockAnalytics.map(item => item.callFailure),
  smooth: true,
  autoFit: true,
  color: '#ff4d4f'
};

const Dashboard = () => {
  const totalApis = mockApiSpecs.length;
  const activeApis = mockApiSpecs.filter(api => api.status === 'active').length;
  const totalSuccess = mockAnalytics.reduce((acc, item) => acc + item.callSuccess, 0);
  const totalFailure = mockAnalytics.reduce((acc, item) => acc + item.callFailure, 0);

  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      <Typography.Title level={3}>运行概览</Typography.Title>
      <Row gutter={16}>
        <Col span={6}>
          <Card>
            <Statistic title="API 总数" value={totalApis} suffix={<Tag color="blue">+3 新增</Tag>} />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic title="活跃接口" value={activeApis} suffix={`/ ${totalApis}`} />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic title="调用成功" value={totalSuccess} />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic title="调用失败" value={totalFailure} valueStyle={{ color: '#ff4d4f' }} />
          </Card>
        </Col>
      </Row>
      <Row gutter={16}>
        <Col span={16}>
          <Card title="调用趋势">
            <Area {...dashboardAreaConfig} height={260} />
          </Card>
        </Col>
        <Col span={8}>
          <Card title="失败率走势">
            <TinyArea {...failureAreaConfig} height={260} />
          </Card>
        </Col>
      </Row>
    </Space>
  );
};

export default Dashboard;
