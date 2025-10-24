import { Button, Card, Checkbox, Input, Space, Typography } from "antd";
import { useMemo, useState } from "react";
import { useOrchestratorStore } from "../state/useOrchestratorStore";
import type { PlannerAgentConfig } from "../types";

const { TextArea } = Input;

const AGENT_LIBRARY: PlannerAgentConfig[] = [
  {
    name: "draft_writer",
    description: "Generate an initial draft of content given a brief, tone, and key points.",
    inputs: ["brief", "key_points", "tone"],
    outputs: ["draft"],
  },
  {
    name: "content_polisher",
    description: "Refine a draft to improve clarity, tone, and style for a specific audience.",
    inputs: ["draft", "tone", "audience"],
    outputs: ["revised_draft"],
  },
  {
    name: "echo",
    description: "Return the provided message unchanged. Useful for validation steps.",
    inputs: ["message"],
    outputs: ["message"],
  },
];

const PlannerConsole = () => {
  const generatePlan = useOrchestratorStore((state) => state.generatePlan);
  const planning = useOrchestratorStore((state) => state.planning);
  const planId = useOrchestratorStore((state) => state.planId);
  const tenant = useOrchestratorStore((state) => state.tenant);

  const [goal, setGoal] = useState<string>("");
  const [selectedAgents, setSelectedAgents] = useState<string[]>(AGENT_LIBRARY.map((agent) => agent.name));

  const selectedConfigs = useMemo(
    () =>
      selectedAgents
        .map((name) => AGENT_LIBRARY.find((agent) => agent.name === name))
        .filter((agent): agent is PlannerAgentConfig => Boolean(agent)),
    [selectedAgents],
  );

  const onGenerate = async () => {
    if (!goal.trim()) {
      return;
    }
    await generatePlan(goal.trim(), selectedConfigs);
  };

  return (
    <Card title="AI Planner">
      <Space direction="vertical" style={{ width: "100%" }} size="middle">
        <Typography.Text>
          Tenant: <Typography.Text strong>{tenant}</Typography.Text> | Plan ID: <Typography.Text strong>{planId}</Typography.Text>
        </Typography.Text>
        <TextArea
          value={goal}
          onChange={(event) => setGoal(event.target.value)}
          autoSize={{ minRows: 4, maxRows: 6 }}
          placeholder="Describe the high-level task you need the agents to complete."
        />
        <div>
          <Typography.Text strong>Select agents to include:</Typography.Text>
          <Checkbox.Group
            style={{ width: "100%", marginTop: 8 }}
            options={AGENT_LIBRARY.map((agent) => ({
              label: (
                <Space direction="vertical" size={0}>
                  <Typography.Text>{agent.name}</Typography.Text>
                  <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                    {agent.description}
                  </Typography.Text>
                </Space>
              ),
              value: agent.name,
            }))}
            value={selectedAgents}
            onChange={(values) => setSelectedAgents(values as string[])}
          />
        </div>
        <Space>
          <Button type="primary" onClick={onGenerate} disabled={!goal.trim()} loading={planning}>
            Generate Plan
          </Button>
        </Space>
      </Space>
    </Card>
  );
};

export default PlannerConsole;
