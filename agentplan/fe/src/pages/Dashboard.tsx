import { Alert, Col, Row, Space } from "antd";
import { useEffect } from "react";
import PlanEditor from "../components/PlanEditor";
import RunConsole from "../components/RunConsole";
import GraphViewer from "../components/GraphViewer";
import VfsPanel from "../components/VfsPanel";
import { useOrchestratorStore } from "../state/useOrchestratorStore";

const Dashboard = () => {
  const error = useOrchestratorStore((state) => state.error);
  const clearError = useOrchestratorStore((state) => state.clearError);
  const loadPlan = useOrchestratorStore((state) => state.loadPlan);

  useEffect(() => {
    loadPlan().catch(() => null);
  }, [loadPlan]);

  return (
    <Space direction="vertical" style={{ width: "100%" }} size="large">
      {error && <Alert message={error} type="error" closable onClose={clearError} />}
      <Row gutter={[16, 16]}>
        <Col xs={24} md={12}>
          <PlanEditor />
        </Col>
        <Col xs={24} md={12}>
          <RunConsole />
        </Col>
      </Row>
      <Row gutter={[16, 16]}>
        <Col xs={24} md={12}>
          <GraphViewer />
        </Col>
        <Col xs={24} md={12}>
          <VfsPanel />
        </Col>
      </Row>
    </Space>
  );
};

export default Dashboard;
