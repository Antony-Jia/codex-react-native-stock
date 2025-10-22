import { Button, Card, Input, Space, Tag, Typography } from "antd";
import { useState } from "react";
import { useOrchestratorStore } from "../state/useOrchestratorStore";

const RunConsole = () => {
  const triggerRun = useOrchestratorStore((state) => state.triggerRun);
  const refreshRun = useOrchestratorStore((state) => state.refreshRun);
  const runStatus = useOrchestratorStore((state) => state.runStatus);
  const loading = useOrchestratorStore((state) => state.loading);
  const [userInput, setUserInput] = useState<string>("Explain the latest run.");
  const [currentRunId, setCurrentRunId] = useState<string>("");

  const onExecute = async () => {
    const response = await triggerRun(userInput);
    if (response) {
      setCurrentRunId(response.run_id);
      await refreshRun(response.run_id);
    }
  };

  const onRefresh = async () => {
    if (currentRunId) {
      await refreshRun(currentRunId);
    }
  };

  return (
    <Card title="Run Console" bordered>
      <Space direction="vertical" style={{ width: "100%" }} size="middle">
        <Input.TextArea
          value={userInput}
          onChange={(event) => setUserInput(event.target.value)}
          autoSize={{ minRows: 4, maxRows: 8 }}
          placeholder="Enter task description for the planner."
        />
        <Space>
          <Button type="primary" onClick={onExecute} loading={loading}>
            Execute Plan
          </Button>
          <Button onClick={onRefresh} disabled={!currentRunId} loading={loading}>
            Refresh
          </Button>
        </Space>
        {runStatus && (
          <Space direction="vertical" size="small">
            <Typography.Text>
              Run ID: <Typography.Text code>{runStatus.run_id}</Typography.Text>
            </Typography.Text>
            <Typography.Text>
              Status: <Tag color={runStatus.status === "completed" ? "green" : "red"}>{runStatus.status}</Tag>
            </Typography.Text>
            <Typography.Text>
              Graph nodes: {Object.keys(runStatus.graph_json ?? {}).length || 0}
            </Typography.Text>
          </Space>
        )}
      </Space>
    </Card>
  );
};

export default RunConsole;
