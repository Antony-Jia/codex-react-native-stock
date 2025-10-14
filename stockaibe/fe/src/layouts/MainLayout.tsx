import { Layout, Menu, Typography } from 'antd';
import {
  ApiOutlined,
  ClusterOutlined,
  SettingOutlined
} from '@ant-design/icons';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { useMemo } from 'react';
import PageHeader from '../components/PageHeader';

const { Header, Sider, Content } = Layout;

const MainLayout = () => {
  const location = useLocation();

  const selectedKey = useMemo(() => {
    if (location.pathname.startsWith('/apis')) {
      return 'apis';
    }
    if (location.pathname.startsWith('/settings')) {
      return 'settings';
    }
    return 'dashboard';
  }, [location.pathname]);

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider collapsible theme="light">
        <div className="logo">
          <Typography.Title level={4}>StockAI Admin</Typography.Title>
        </div>
        <Menu mode="inline" selectedKeys={[selectedKey]}>
          <Menu.Item key="dashboard" icon={<ClusterOutlined />}> 
            <Link to="/">仪表盘</Link>
          </Menu.Item>
          <Menu.Item key="apis" icon={<ApiOutlined />}>
            <Link to="/apis">API 管理</Link>
          </Menu.Item>
          <Menu.Item key="settings" icon={<SettingOutlined />}>
            <Link to="/settings">系统设置</Link>
          </Menu.Item>
        </Menu>
      </Sider>
      <Layout>
        <Header className="app-header">
          <PageHeader />
        </Header>
        <Content className="app-content">
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
};

export default MainLayout;
