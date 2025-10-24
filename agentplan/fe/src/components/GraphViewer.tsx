import { Card, Empty, List, Modal, Space, Tag, Typography } from "antd";
import type { GraphNode, GraphSnapshot } from "../types";
import { memo, useMemo } from "react";
import { useOrchestratorStore } from "../state/useOrchestratorStore";
import ForceGraph2D from "react-force-graph-2d";

type ForceNode = { id?: string | number; x?: number; y?: number; name?: string; objective?: string; degree?: number };

const GraphCanvas = memo(
  ({
    graphData,
    onNodeClick,
  }: {
    graphData: { nodes: Array<ForceNode>; links: Array<{ source: string; target: string }> };
    onNodeClick: (node: ForceNode) => void;
  }) => (
    <ForceGraph2D
      graphData={graphData}
      nodeColor={(node: ForceNode) => (node.degree && node.degree > 2 ? "#ff7f50" : "#1890ff")}
      nodeCanvasObject={(node: ForceNode, ctx, globalScale) => {
        const label = node.name || "";
        const fontSize = 12 / globalScale;
        ctx.font = `${fontSize}px Sans-Serif`;
        ctx.fillStyle = "#000";
        ctx.fillText(label, node.x ?? 0, (node.y ?? 0) + 12);
      }}
      linkColor={() => "rgba(0,0,0,0.3)"}
      linkWidth={1}
      linkDirectionalArrowLength={6}
      cooldownTicks={50}
      onNodeClick={onNodeClick}
    />
  )
);

const GraphViewer = () => {
  const store = useOrchestratorStore((state) => ({
    runStatus: state.runStatus,
    planGraph: state.planGraph,
    memoryRecords: state.memoryRecords,
  }));

  const graph: GraphSnapshot | undefined = store.runStatus?.graph_json ?? store.planGraph ?? undefined;
  const nodes = graph?.nodes ?? [];
  const edges = graph?.edges ?? [];

  if (!nodes.length || !edges.length) {
    return (
      <Card title="Graph">
        <Empty description="Generate or execute a plan to view the graph snapshot." />
      </Card>
    );
  }

  const graphData = useMemo(() => {
    const formattedNodes = nodes.map((node) => ({
      id: node.node_id,
      name: node.agent_name,
      objective: node.objective ?? "",
      degree: edges.filter((edge) => edge.dst_node === node.node_id || edge.src_node === node.node_id).length,
    }));

    const formattedLinks = edges.map((edge) => ({
      source: edge.src_node,
      target: edge.dst_node,
    }));

    return { nodes: formattedNodes, links: formattedLinks };
  }, [nodes, edges]);

  const handleNodeClick = (node: ForceNode) => {
    if (node.objective) {
      Modal.info({
        title: node.name ?? node.id?.toString() ?? "Step detail",
        content: (
          <Typography.Paragraph>
            <Typography.Text>{node.objective}</Typography.Text>
          </Typography.Paragraph>
        ),
      });
    }
  };

  return (
    <Card title="Graph Snapshot">
      <Space direction="vertical" style={{ width: "100%" }}>
        <Typography.Text>
          Nodes: <Tag>{nodes.length}</Tag> Edges: <Tag>{edges.length}</Tag>
        </Typography.Text>
        <div style={{ width: "100%", height: "400px" }}>
          <GraphCanvas graphData={graphData} onNodeClick={handleNodeClick} />
        </div>
        {!!store.memoryRecords.length && (
          <Card size="small" title={`Memory Records (${store.memoryRecords.length})`}>
            <List
              size="small"
              dataSource={store.memoryRecords}
              renderItem={(record) => (
                <List.Item>
                  <List.Item.Meta
                    title={<Typography.Text strong>{record.path}</Typography.Text>}
                    description={
                      <Typography.Text type="secondary">
                        {record.note ?? "No note"} | Payload keys: {Object.keys(record.payload ?? {}).join(", ") || "n/a"}
                      </Typography.Text>
                    }
                  />
                </List.Item>
              )}
            />
          </Card>
        )}
        <List
          dataSource={nodes as GraphNode[]}
          renderItem={(node) => (
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
                    Objective: {node.objective ?? "N/A"} | Inputs: {JSON.stringify(node.static_inputs ?? {}, null, 0)}
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

export default memo(GraphViewer);

