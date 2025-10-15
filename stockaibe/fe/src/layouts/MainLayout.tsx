import { Layout, Menu, Typography, Avatar, Dropdown } from 'antd';
import {
  DashboardOutlined,
  ThunderboltOutlined,
  FileSearchOutlined,
  ClockCircleOutlined,
  SettingOutlined,
  UserOutlined,
  LogoutOutlined,
} from '@ant-design/icons';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';

const { Header, Sider, Content } = Layout;

const MainLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const selectedKey = useMemo(() => {
    if (location.pathname.startsWith('/quotas')) {
      return 'quotas';
    }
    if (location.pathname.startsWith('/traces')) {
      return 'traces';
    }
    if (location.pathname.startsWith('/tasks')) {
      return 'tasks';
    }
    if (location.pathname.startsWith('/settings')) {
      return 'settings';
    }
    return 'dashboard';
  }, [location.pathname]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const userMenuItems = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: user?.full_name || user?.username,
      disabled: true,
    },
    {
      type: 'divider' as const,
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: '退出登录',
      onClick: handleLogout,
    },
  ];

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider collapsible theme="light" width={220}>
        <div style={{ padding: '16px', textAlign: 'center' }}>
          <Typography.Title level={4} style={{ margin: 0 }}>
            限流管理系统
          </Typography.Title>
        </div>
        <Menu mode="inline" selectedKeys={[selectedKey]}>
          <Menu.Item key="dashboard" icon={<DashboardOutlined />}>
            <Link to="/">监控仪表盘</Link>
          </Menu.Item>
          <Menu.Item key="quotas" icon={<ThunderboltOutlined />}>
            <Link to="/quotas">配额管理</Link>
          </Menu.Item>
          <Menu.Item key="traces" icon={<FileSearchOutlined />}>
            <Link to="/traces">请求追踪</Link>
          </Menu.Item>
          <Menu.Item key="tasks" icon={<ClockCircleOutlined />}>
            <Link to="/tasks">任务调度</Link>
          </Menu.Item>
          <Menu.Item key="settings" icon={<SettingOutlined />}>
            <Link to="/settings">系统设置</Link>
          </Menu.Item>
        </Menu>
      </Sider>
      <Layout>
        <Header
          style={{
            background: '#fff',
            padding: '0 24px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            boxShadow: '0 1px 4px rgba(0,21,41,.08)',
          }}
        >
          <Typography.Title level={5} style={{ margin: 0 }}>
            StockCrawler Limiter Admin
          </Typography.Title>
          <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
            <Avatar
              style={{ cursor: 'pointer', backgroundColor: '#1677ff' }}
              icon={<UserOutlined />}
            />
          </Dropdown>
        </Header>
        <Content style={{ margin: '24px', padding: '24px', background: '#f0f2f5' }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
};

export default MainLayout;
