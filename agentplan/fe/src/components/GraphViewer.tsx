import { Card, Empty, List, Space, Tag, Typography } from "antd";
import { useOrchestratorStore } from "../state/useOrchestratorStore";

const GraphViewer = () => {
  const runStatus = useOrchestratorStore((state) => state.runStatus);
  const nodes = runStatus?.graph_json?.nodes;
  const edges = runStatus?.graph_json?.edges;

  if (!nodes || !edges) {
    return (
      <Card title="Graph">
        <Empty description="Execute a plan to view the graph snapshot." />
      </Card>
    );
  }

  return (
    <Card title="Graph Snapshot">
      <Space direction="vertical" style={{ width: "100%" }}>
        <Typography.Text>
          Nodes: <Tag>{nodes.length}</Tag> Edges: <Tag>{edges.length}</Tag>
        </Typography.Text>
        <List
          dataSource={nodes}
          renderItem={(node: any) => (
            <List.Item>
              <List.Item.Meta
                title={
                  <Space>
                    <Typography.Text strong>{node.node_id}</Typography.Text>
                    <Tag color="blue">{node.agent_name}</Tag>
                  </Space>
                }
                description={
                  <Typography.Text>
                    Inputs: {JSON.stringify(node.static_inputs ?? {}, null, 0)}
                  </Typography.Text>
                }
              />
            </List.Item>
          )}
        />
      </Space>
    </Card>
  );
};

export default GraphViewer;
