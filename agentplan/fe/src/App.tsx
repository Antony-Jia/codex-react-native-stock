import { Layout, theme, Typography } from "antd";
import { useMemo } from "react";
import Dashboard from "./pages/Dashboard";

const { Header, Content } = Layout;

const App = () => {
  const { token } = theme.useToken();

  const headerStyle = useMemo(
    () => ({
      color: token.colorTextLightSolid,
      background: token.colorPrimary,
      display: "flex",
      alignItems: "center",
      paddingLeft: 24,
      fontSize: 18,
      fontWeight: 600,
    }),
    [token],
  );

  return (
    <Layout style={{ minHeight: "100vh" }}>
      <Header style={headerStyle}>
        <Typography.Title level={4} style={{ color: token.colorTextLightSolid, margin: 0 }}>
          Plan-and-Execute Orchestrator
        </Typography.Title>
      </Header>
      <Content style={{ padding: 24 }}>
        <Dashboard />
      </Content>
    </Layout>
  );
};

export default App;

