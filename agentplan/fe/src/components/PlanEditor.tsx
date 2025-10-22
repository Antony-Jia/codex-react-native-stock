import { Button, Card, Input, Space, Tooltip, Typography } from "antd";
import { useEffect, useState } from "react";
import { useOrchestratorStore } from "../state/useOrchestratorStore";
import { Plan } from "../types";

const { TextArea } = Input;

const PlanEditor = () => {
  const plan = useOrchestratorStore((state) => state.plan);
  const savePlan = useOrchestratorStore((state) => state.savePlan);
  const loadPlan = useOrchestratorStore((state) => state.loadPlan);
  const planId = useOrchestratorStore((state) => state.planId);
  const tenant = useOrchestratorStore((state) => state.tenant);
  const loading = useOrchestratorStore((state) => state.loading);
  const [draft, setDraft] = useState<string>("");

  useEffect(() => {
    if (plan) {
      setDraft(JSON.stringify(plan, null, 2));
    }
  }, [plan]);

  const onSave = async () => {
    try {
      const parsed = JSON.parse(draft) as Plan;
      await savePlan(parsed);
    } catch (err) {
      console.error("Invalid plan JSON", err);
    }
  };

  return (
    <Card title="Plan" bordered style={{ height: "100%" }}>
      <Space direction="vertical" style={{ width: "100%" }} size="middle">
        <Typography.Text type="secondary">
          Tenant: <Typography.Text strong>{tenant}</Typography.Text> | Plan ID:{" "}
          <Typography.Text strong>{planId}</Typography.Text>
        </Typography.Text>
        <Tooltip title="Edit the JSON definition and press Save.">
          <TextArea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            autoSize={{ minRows: 12, maxRows: 20 }}
            spellCheck={false}
            style={{ fontFamily: "Consolas, Monaco, monospace" }}
          />
        </Tooltip>
        <Space>
          <Button type="primary" onClick={onSave} loading={loading}>
            Save Plan
          </Button>
          <Button
            onClick={() => {
              loadPlan().catch(() => null);
            }}
            loading={loading}
          >
            Reload
          </Button>
        </Space>
      </Space>
    </Card>
  );
};

export default PlanEditor;
