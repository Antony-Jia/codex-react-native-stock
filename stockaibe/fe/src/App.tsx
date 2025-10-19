import { ConfigProvider, theme as antdTheme } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import { Route, Routes, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import MainLayout from './layouts/MainLayout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Quotas from './pages/Quotas';
import Traces from './pages/Traces';
import Tasks from './pages/Tasks';
import Settings from './pages/Settings';
import ShanghaiA from './pages/ShanghaiA';
import CompanyNewsPage from './pages/shanghai_a/CompanyNews';

const PrivateRoute = ({ children }: { children: React.ReactElement }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <div>Loading...</div>;
  }

  return isAuthenticated ? children : <Navigate to="/login" replace />;
};

const App = () => {
  return (
    <ConfigProvider
      locale={zhCN}
      theme={{
        algorithm: antdTheme.defaultAlgorithm,
        token: {
          colorPrimary: '#1677ff'
        }
      }}
    >
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/"
            element={
              <PrivateRoute>
                <MainLayout />
              </PrivateRoute>
            }
          >
            <Route index element={<Dashboard />} />
            <Route path="quotas" element={<Quotas />} />
            <Route path="traces" element={<Traces />} />
            <Route path="tasks" element={<Tasks />} />
            <Route path="shanghai-a" element={<ShanghaiA />} />
            <Route path="shanghai-a/company-news" element={<CompanyNewsPage />} />
            <Route path="settings" element={<Settings />} />
          </Route>
        </Routes>
      </AuthProvider>
    </ConfigProvider>
  );
};

export default App;
